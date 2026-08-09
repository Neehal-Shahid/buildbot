const express = require('express');
const multer  = require('multer');
const csv     = require('csv-parser');
const { Readable } = require('stream');
const { productDB, storeDB, client } = require('../database');
const { authMiddleware }    = require('./auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB max
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20, // max 20 uploads per 15 mins per store
  message: { error: 'Too many uploads. Please try again later.' }
});

// ─── UPLOAD CSV ───────────────────────────────────────────
router.post('/upload', authMiddleware, uploadLimiter, (req, res, next) => {
  upload.single('catalog')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
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
  // Only expose catalog for active, widget-enabled stores
  const store = await storeDB.findById(req.params.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  const active = await storeDB.isActive(req.params.storeId);
  if (!active || store.widget_enabled === 0 || store.plan_status === 'disabled') {
    return res.status(403).json({ error: 'Store catalog not available' });
  }

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
    const result = await client.execute({
      sql:  `UPDATE products SET name=?, category=?, price=?, description=?
             WHERE id=? AND store_id=?`,
      args: [name, category, parseFloat(price), description || '',
             req.params.id, req.store.storeId]
    });
    if ((result.rowsAffected ?? 0) === 0)
      return res.status(404).json({ error: 'Product not found or access denied' });
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
    const result = await client.execute({
      sql:  'DELETE FROM products WHERE id=? AND store_id=?',
      args: [req.params.id, req.store.storeId]
    });
    if ((result.rowsAffected ?? 0) === 0)
      return res.status(404).json({ error: 'Product not found or access denied' });
    await storeDB.touchCatalog(req.store.storeId);
    res.json({ success: true, message: 'Product deleted!' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;