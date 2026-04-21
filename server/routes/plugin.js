const express = require('express');
const crypto  = require('crypto');
const { storeDB, productDB, client } = require('../database');

const router = express.Router();

// ─── HELPER: Authenticate plugin request ──────────────────
async function authenticatePlugin(req, res) {
  const storeId = req.headers['x-buildbot-store-id'];
  const secret  = req.headers['x-buildbot-secret'];

  if (!storeId || !secret) {
    res.status(401).json({
      success: false,
      error: 'Missing Store ID or Secret Key'
    });
    return null;
  }

  const store = await storeDB.findByPluginSecret(storeId, secret);
  if (!store) {
    res.status(401).json({
      success: false,
      error: 'Invalid Store ID or Secret Key'
    });
    return null;
  }

  return store;
}

// ─── HELPER: Map WooCommerce category to BuildBot category ─
function mapCategory(wooCategories) {
  if (!wooCategories || !wooCategories.length) return 'Accessory';

  const name = wooCategories[0].name.toLowerCase();

  if (name.includes('cpu') || name.includes('processor'))    return 'CPU';
  if (name.includes('motherboard') || name.includes('mobo')) return 'Motherboard';
  if (name.includes('ram') || name.includes('memory'))       return 'RAM';
  if (name.includes('storage') || name.includes('ssd') ||
      name.includes('hdd') || name.includes('nvme'))         return 'Storage';
  if (name.includes('gpu') || name.includes('graphics') ||
      name.includes('video card'))                           return 'GPU';
  if (name.includes('psu') || name.includes('power supply')) return 'PSU';
  if (name.includes('case') || name.includes('cabinet') ||
      name.includes('casing'))                               return 'Case';
  if (name.includes('monitor') || name.includes('display'))  return 'Monitor';
  if (name.includes('keyboard') || name.includes('mouse') ||
      name.includes('headset') || name.includes('webcam') ||
      name.includes('accessory') || name.includes('peripheral')) return 'Accessory';

  return 'Accessory';
}

// ─── HELPER: Map WooCommerce product to BuildBot format ────
function mapProduct(wooProduct) {
  const price = parseFloat(
    wooProduct.sale_price || wooProduct.regular_price || wooProduct.price || 0
  );

  const description = wooProduct.short_description
    ? wooProduct.short_description.replace(/<[^>]*>/g, '').trim()
    : (wooProduct.description || '').replace(/<[^>]*>/g, '').trim().slice(0, 200);

  return {
    name:        wooProduct.name || 'Unknown Product',
    category:    mapCategory(wooProduct.categories),
    price:       price,
    description: description,
    in_stock:    wooProduct.stock_status === 'instock' ? 1 : 0,
    woo_id:      wooProduct.id || null
  };
}

// ─── GENERATE SECRET KEY ──────────────────────────────────
router.post('/plugin/generate-key', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  const jwt     = require('jsonwebtoken');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const storeId = decoded.storeId;

  // Generate a secure random key
  const secret = 'bb_live_' + crypto.randomBytes(16).toString('hex');

  await storeDB.updatePluginKey(storeId, secret);

  res.json({ success: true, secret });
});

// ─── GET PLUGIN STATUS ────────────────────────────────────
router.get('/plugin/status', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const jwt     = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const info    = await storeDB.getPluginKey(decoded.storeId);

    if (!info) return res.status(404).json({ error: 'Store not found' });

    res.json({
      success:       true,
      hasKey:        !!info.plugin_secret,
      secret:        info.plugin_secret || null,
      wooConnected:  info.woo_connected  === 1,
      wooUrl:        info.woo_url        || '',
      lastSync:      info.woo_last_sync  || null,
      productCount:  info.woo_product_count || 0
    });
  } catch(err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ─── FULL SYNC (plugin sends all products) ────────────────
router.post('/plugin/sync', async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  const { products, storeUrl } = req.body;

  if (!products || !Array.isArray(products)) {
    return res.status(400).json({
      success: false,
      error: 'products array is required'
    });
  }

  try {
    // Delete old products and insert new ones
    await client.execute({
      sql:  'DELETE FROM products WHERE store_id = ?',
      args: [store.store_id]
    });

    let synced = 0;
    for (const wooProduct of products) {
      const p = mapProduct(wooProduct);
      if (p.price <= 0) continue; // skip products with no price

      await client.execute({
        sql:  `INSERT INTO products
               (store_id, name, category, price, description, in_stock)
               VALUES (?, ?, ?, ?, ?, ?)`,
        args: [store.store_id, p.name, p.category, p.price, p.description, p.in_stock]
      });
      synced++;
    }

    // Update woo connection status
    await storeDB.updateWooStatus(store.store_id, storeUrl || '', synced);

    res.json({
      success: true,
      message: `${synced} products synced successfully!`,
      synced
    });

  } catch(err) {
    console.error('Plugin sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── UPDATE SINGLE PRODUCT (on WooCommerce product update) ─
router.post('/plugin/product/update', async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  const { product } = req.body;
  if (!product) return res.status(400).json({ error: 'product is required' });

  try {
    const p = mapProduct(product);
    if (p.price <= 0) {
      return res.json({ success: true, message: 'Product skipped (no price)' });
    }

    // Check if product already exists by name
    const existing = await client.execute({
      sql:  'SELECT id FROM products WHERE store_id = ? AND name = ?',
      args: [store.store_id, p.name]
    });

    if (existing.rows.length > 0) {
      // Update existing
      await client.execute({
        sql:  `UPDATE products
               SET category=?, price=?, description=?, in_stock=?
               WHERE store_id=? AND name=?`,
        args: [p.category, p.price, p.description, p.in_stock,
               store.store_id, p.name]
      });
    } else {
      // Insert new
      await client.execute({
        sql:  `INSERT INTO products
               (store_id, name, category, price, description, in_stock)
               VALUES (?, ?, ?, ?, ?, ?)`,
        args: [store.store_id, p.name, p.category, p.price,
               p.description, p.in_stock]
      });
    }

    // Update last sync time
    const now = new Date().toISOString();
    await client.execute({
      sql:  'UPDATE stores SET woo_last_sync = ? WHERE store_id = ?',
      args: [now, store.store_id]
    });

    res.json({ success: true, message: 'Product updated!' });

  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE SINGLE PRODUCT (on WooCommerce product delete) ─
router.post('/plugin/product/delete', async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  const { productName } = req.body;
  if (!productName) return res.status(400).json({ error: 'productName is required' });

  try {
    await client.execute({
      sql:  'DELETE FROM products WHERE store_id = ? AND name = ?',
      args: [store.store_id, productName]
    });

    res.json({ success: true, message: 'Product removed!' });

  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PING (plugin checks connection) ──────────────────────
router.post('/plugin/ping', async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  res.json({
    success:   true,
    message:   'Connected successfully!',
    storeName: store.name,
    storeId:   store.store_id,
    plan:      store.plan
  });
});

module.exports = router;