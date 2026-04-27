const express = require('express');
const multer  = require('multer');
const csv     = require('csv-parser');
const { Readable } = require('stream');
const { productDB, storeDB, client } = require('../database');
const { authMiddleware }    = require('./auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─── UPLOAD CSV ───────────────────────────────────────────
router.post('/upload', authMiddleware, upload.single('catalog'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const storeId  = req.store.storeId;
  const products = [];
  try {
    await new Promise((resolve, reject) => {
      const stream = Readable.from(req.file.buffer.toString());
      stream.pipe(csv())
        .on('data', row => products.push(row))
        .on('end', resolve)
        .on('error', reject);
    });
    if (!products.length)
      return res.status(400).json({ error: 'CSV is empty or invalid' });
    const count = await productDB.bulkInsert(storeId, products);
    await storeDB.touchCatalog(storeId);
    res.json({
      success: true,
      message: `${count} products uploaded successfully!`,
      preview: products.slice(0, 3)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET ALL PRODUCTS (public, for widget) ────────────────
router.get('/products/:storeId', async (req, res) => {
  const products = await productDB.getByStore(req.params.storeId);
  if (!products.length)
    return res.status(404).json({ error: 'No products found' });
  res.json({ products });
});

// ─── GET ALL PRODUCTS (dashboard, includes out of stock) ──
router.get('/products/manage/:storeId', authMiddleware, async (req, res) => {
  try {
    const res2 = await client.execute({
      sql:  `SELECT * FROM products WHERE store_id = ?
             ORDER BY category, name`,
      args: [req.store.storeId]
    });
    res.json({ success: true, products: res2.rows });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADD SINGLE PRODUCT ───────────────────────────────────
router.post('/product', authMiddleware, async (req, res) => {
  const { name, category, price, description } = req.body;
  if (!name || !category || !price)
    return res.status(400).json({ error: 'Name, category and price are required' });
  try {
    await client.execute({
      sql:  `INSERT INTO products (store_id, name, category, price, description)
             VALUES (?, ?, ?, ?, ?)`,
      args: [req.store.storeId, name, category, parseFloat(price), description || '']
    });
    await storeDB.touchCatalog(req.store.storeId);
    res.json({ success: true, message: 'Product added!' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EDIT PRODUCT ─────────────────────────────────────────
router.put('/product/:id', authMiddleware, async (req, res) => {
  const { name, category, price, description } = req.body;
  if (!name || !category || !price)
    return res.status(400).json({ error: 'Name, category and price are required' });
  try {
    await client.execute({
      sql:  `UPDATE products SET name=?, category=?, price=?, description=?
             WHERE id=? AND store_id=?`,
      args: [name, category, parseFloat(price), description || '',
             req.params.id, req.store.storeId]
    });
    await storeDB.touchCatalog(req.store.storeId);
    res.json({ success: true, message: 'Product updated!' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TOGGLE STOCK ─────────────────────────────────────────
router.put('/product/:id/stock', authMiddleware, async (req, res) => {
  const { inStock } = req.body;
  try {
    await client.execute({
      sql:  'UPDATE products SET in_stock=? WHERE id=? AND store_id=?',
      args: [inStock ? 1 : 0, req.params.id, req.store.storeId]
    });
    await storeDB.touchCatalog(req.store.storeId);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE PRODUCT ───────────────────────────────────────
router.delete('/product/:id', authMiddleware, async (req, res) => {
  try {
    await client.execute({
      sql:  'DELETE FROM products WHERE id=? AND store_id=?',
      args: [req.params.id, req.store.storeId]
    });
    await storeDB.touchCatalog(req.store.storeId);
    res.json({ success: true, message: 'Product deleted!' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;