const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { productDB, storeDB } = require('../database');
const { authMiddleware } = require('./auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../data')),
  filename: (req, file, cb) => cb(null, `temp_${Date.now()}.csv`)
});

const upload = multer({ storage });

// Upload CSV — requires login
router.post('/upload', authMiddleware, upload.single('catalog'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const storeId = req.store.storeId;
  const filePath = req.file.path;
  const products = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => products.push(row))
    .on('end', () => {
      fs.unlinkSync(filePath); // delete temp file
      if (products.length === 0)
        return res.status(400).json({ error: 'CSV is empty or invalid' });

      const count = productDB.bulkInsert(storeId, products);
      res.json({
        success: true,
        message: `${count} products uploaded successfully!`,
        preview: products.slice(0, 3)
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: 'Failed to parse CSV', details: err.message });
    });
});

// Get products — public (used by widget)
router.get('/products/:storeId', (req, res) => {
  const products = productDB.getByStore(req.params.storeId);
  if (!products.length)
    return res.status(404).json({ error: 'No products found for this store' });
  res.json({ products });
});

module.exports = router;