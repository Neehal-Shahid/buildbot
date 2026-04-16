const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { productDB } = require('../database');
const { authMiddleware } = require('./auth');

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../data')),
  filename:    (req, file, cb) => cb(null, `temp_${Date.now()}.csv`)
});
const upload = multer({ storage });

router.post('/upload', authMiddleware, upload.single('catalog'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const storeId  = req.store.storeId;
  const filePath = req.file.path;
  const products = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', row => products.push(row))
    .on('end', async () => {
      try {
        fs.unlinkSync(filePath);
        if (!products.length)
          return res.status(400).json({ error: 'CSV is empty or invalid' });
        const count = await productDB.bulkInsert(storeId, products);
        res.json({
          success: true,
          message: `${count} products uploaded successfully!`,
          preview: products.slice(0, 3)
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    })
    .on('error', err => res.status(500).json({ error: err.message }));
});

router.get('/products/:storeId', async (req, res) => {
  const products = await productDB.getByStore(req.params.storeId);
  if (!products.length)
    return res.status(404).json({ error: 'No products found' });
  res.json({ products });
});

module.exports = router;