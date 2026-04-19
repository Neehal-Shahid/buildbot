const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { productDB } = require('../database');
const { authMiddleware } = require('./auth');
const { productDB, client } = require('../database');

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

router.get('/products/all/:storeId', authMiddleware, async (req, res) => {
  const products = await productDB.getAllByStore(req.params.storeId);
  res.json({ products: products || [] });
});

// Update a single product
router.put('/product/:id', authMiddleware, async (req, res) => {
  const { name, category, price, description } = req.body;
  const { id } = req.params;

  if (!name || !category || !price)
    return res.status(400).json({ error: 'Name, category and price required' });

  try {
    await client.execute({
      sql:  `UPDATE products SET name = ?, category = ?, price = ?, description = ?
             WHERE id = ? AND store_id = ?`,
      args: [name, category, parseFloat(price), description || '', id, req.store.storeId]
    });
    res.json({ success: true, message: 'Product updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single product
router.delete('/product/:id', authMiddleware, async (req, res) => {
  try {
    await client.execute({
      sql:  'DELETE FROM products WHERE id = ? AND store_id = ?',
      args: [req.params.id, req.store.storeId]
    });
    res.json({ success: true, message: 'Product deleted!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle stock status
router.put('/product/:id/stock', authMiddleware, async (req, res) => {
  const { inStock } = req.body;
  try {
    await client.execute({
      sql:  'UPDATE products SET in_stock = ? WHERE id = ? AND store_id = ?',
      args: [inStock ? 1 : 0, req.params.id, req.store.storeId]
    });
    res.json({ success: true, message: inStock ? 'Product marked in stock!' : 'Product marked out of stock!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;