const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { productDB } = require('../database');
const { authMiddleware } = require('./auth');

const router = express.Router();

// Use memory storage instead of disk — works on Railway
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', authMiddleware, upload.single('catalog'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const storeId  = req.store.storeId;
  const products = [];

  try {
    // Parse CSV from memory buffer instead of disk file
    await new Promise((resolve, reject) => {
      const stream = Readable.from(req.file.buffer.toString());
      stream
        .pipe(csv())
        .on('data', row => products.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

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
});

router.get('/products/:storeId', async (req, res) => {
  const products = await productDB.getByStore(req.params.storeId);
  if (!products.length)
    return res.status(404).json({ error: 'No products found' });
  res.json({ products });
});

module.exports = router;