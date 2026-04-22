const express = require('express');
const crypto  = require('crypto');
const { storeDB, productDB, client } = require('../database');

const router = express.Router();

// ─── AUTHENTICATE PLUGIN REQUEST ──────────────────────────
async function authenticatePlugin(req, res) {
  const storeId = req.headers['x-buildbot-store-id'];
  const secret  = req.headers['x-buildbot-secret'];

  if (!storeId || !secret) {
    res.status(401).json({ success: false, error: 'Missing Store ID or Secret Key' });
    return null;
  }

  const store = await storeDB.findByPluginSecret(storeId, secret);
  if (!store) {
    res.status(401).json({ success: false, error: 'Invalid Store ID or Secret Key' });
    return null;
  }

  return store;
}

// ─── MAP CATEGORY FROM WOOCOMMERCE CATEGORY NAME ──────────
function mapCategory(wooCategories) {
  if (!wooCategories || !wooCategories.length) return null;

  const name = wooCategories[0].name.toLowerCase();

  const categoryMap = {
    'CPU':         ['cpu', 'processor', 'intel core', 'ryzen', 'amd ryzen',
                    'core i3', 'core i5', 'core i7', 'core i9',
                    'threadripper', 'xeon', 'celeron', 'pentium'],
    'Motherboard': ['motherboard', 'mobo', 'mainboard', 'lga', 'am4', 'am5',
                    'b450', 'b550', 'b660', 'b760', 'x570', 'z690', 'z790'],
    'RAM':         ['ram', 'memory', 'ddr4', 'ddr5', 'dimm',
                    'vengeance', 'ripjaws', 'fury'],
    'Storage':     ['ssd', 'hdd', 'hard drive', 'hard disk', 'nvme',
                    'solid state', 'm.2', 'sata', 'storage'],
    'GPU':         ['gpu', 'graphics', 'video card', 'rtx', 'gtx',
                    'radeon', 'geforce', 'nvidia', 'rx 6', 'rx 7'],
    'PSU':         ['psu', 'power supply', 'power unit', 'smps',
                    '550w', '650w', '750w', '850w', '1000w'],
    'Case':        ['case', 'cabinet', 'casing', 'chassis', 'tower',
                    'mid tower', 'full tower', 'mini itx'],
    'Monitor':     ['monitor', 'display', 'screen', 'led monitor',
                    '144hz', '165hz', '1080p', '1440p', '4k'],
    'Cooling':     ['cooler', 'cooling', 'heatsink', 'aio',
                    'cpu fan', 'case fan', 'thermal paste'],
    'Networking':  ['wifi', 'wireless', 'network card', 'lan card',
                    'ethernet', 'router', 'bluetooth'],
    'UPS':         ['ups', 'uninterruptible', 'power backup', 'inverter'],
    'Peripherals': ['keyboard', 'mouse', 'headset', 'headphone',
                    'webcam', 'gamepad', 'speaker', 'microphone'],
    'Cable':       ['cable', 'hdmi', 'displayport', 'usb cable',
                    'sata cable', 'adapter'],
    'Software':    ['windows', 'office', 'antivirus', 'operating system']
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) return category;
    }
  }

  return null;
}

// ─── MAP CATEGORY FROM PRODUCT NAME ───────────────────────
function mapCategoryFromName(productName) {
  const name = productName.toLowerCase();

  const nameMap = {
    'CPU':         ['intel core', 'ryzen', 'core i3', 'core i5', 'core i7',
                    'core i9', 'athlon', 'celeron', 'pentium', 'xeon'],
    'Motherboard': ['motherboard', 'b450', 'b550', 'b660', 'b760', 'x570',
                    'z690', 'z790', 'h610', 'h410', 'lga1700', 'lga1200'],
    'RAM':         ['ddr4', 'ddr5', '8gb ram', '16gb ram', '32gb ram',
                    'vengeance', 'ripjaws', 'fury beast', 'corsair ddr'],
    'Storage':     ['ssd', 'hdd', 'nvme', 'm.2', '970 evo', 'wd blue',
                    'barracuda', '1tb', '2tb', '500gb', '240gb', '480gb'],
    'GPU':         ['rtx 3', 'rtx 4', 'gtx 16', 'rx 6', 'rx 7',
                    'geforce', 'radeon', '3060', '3070', '3080',
                    '4060', '4070', '4080', '6600', '6700', '7600'],
    'PSU':         ['550w', '650w', '750w', '850w', '1000w', 'power supply',
                    'corsair cv', 'seasonic', 'cooler master mwe'],
    'Case':        ['matrexx', 'nzxt', 'lian li', 'phanteks', 'fractal',
                    'corsair 4000', 'ant esports ice', 'mid tower'],
    'Monitor':     ['monitor', '144hz', '165hz', '240hz', 'ips panel',
                    '24 inch', '27 inch', '32 inch', 'full hd'],
    'Cooling':     ['hyper 212', 'arctic freezer', 'noctua', 'be quiet',
                    'liquid cooler', 'aio cooler', 'thermal paste'],
    'Peripherals': ['mechanical keyboard', 'gaming mouse', 'redragon',
                    'logitech g', 'corsair k', 'razer', 'steelseries']
  };

  for (const [category, keywords] of Object.entries(nameMap)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) return category;
    }
  }

  return 'Accessory';
}

// ─── MAP WOOCOMMERCE PRODUCT TO BUILDBOT FORMAT ───────────
function mapProduct(wooProduct) {
  const price = parseFloat(
    wooProduct.sale_price ||
    wooProduct.regular_price ||
    wooProduct.price || 0
  );

  const description = (wooProduct.short_description || wooProduct.description || '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 200);

  // Try category name first, then fall back to product name detection
  const categoryFromWoo  = mapCategory(wooProduct.categories);
  const categoryFromName = mapCategoryFromName(wooProduct.name || '');
  const category         = categoryFromWoo || categoryFromName;

  return {
    name:     wooProduct.name     || 'Unknown Product',
    category,
    price,
    description,
    in_stock: wooProduct.stock_status === 'instock' ? 1 : 0,
    woo_id:   wooProduct.id       || null
  };
}

// ─── GENERATE SECRET KEY ──────────────────────────────────
router.post('/plugin/generate-key', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const jwt     = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const secret  = 'bb_live_' + crypto.randomBytes(16).toString('hex');
    await storeDB.updatePluginKey(decoded.storeId, secret);
    res.json({ success: true, secret });
  } catch(err) {
    res.status(401).json({ error: 'Invalid token' });
  }
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
      success:      true,
      hasKey:       !!info.plugin_secret,
      secret:       info.plugin_secret   || null,
      wooConnected: info.woo_connected   === 1,
      wooUrl:       info.woo_url         || '',
      lastSync:     info.woo_last_sync   || null,
      productCount: info.woo_product_count || 0,
      widgetEnabled: info.widget_enabled  !== 0
    });
  } catch(err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ─── TOGGLE WIDGET (enable/disable from plugin) ───────────
router.post('/plugin/widget-toggle', async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  const { enabled } = req.body;

  try {
    await client.execute({
      sql:  'UPDATE stores SET widget_enabled = ? WHERE store_id = ?',
      args: [enabled ? 1 : 0, store.store_id]
    });

    res.json({
      success: true,
      enabled,
      message: enabled ? 'Widget enabled!' : 'Widget disabled!'
    });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── FULL SYNC ────────────────────────────────────────────
router.post('/plugin/sync', async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  const { products, storeUrl } = req.body;

  if (!products || !Array.isArray(products)) {
    return res.status(400).json({ success: false, error: 'products array is required' });
  }

  try {
    await client.execute({
      sql:  'DELETE FROM products WHERE store_id = ?',
      args: [store.store_id]
    });

    let synced   = 0;
    let skipped  = 0;

    for (const wooProduct of products) {
      const p = mapProduct(wooProduct);

      if (p.price <= 0) { skipped++; continue; }
      if (!p.name || p.name === 'Unknown Product') { skipped++; continue; }

      await client.execute({
        sql:  `INSERT INTO products (store_id, name, category, price, description, in_stock)
               VALUES (?, ?, ?, ?, ?, ?)`,
        args: [store.store_id, p.name, p.category, p.price, p.description, p.in_stock]
      });
      synced++;
    }

    await storeDB.updateWooStatus(store.store_id, storeUrl || '', synced);

    res.json({
      success: true,
      message: `${synced} products synced successfully!`,
      synced,
      skipped
    });

  } catch(err) {
    console.error('Plugin sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── UPDATE SINGLE PRODUCT ────────────────────────────────
router.post('/plugin/product/update', async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  const { product } = req.body;
  if (!product) return res.status(400).json({ error: 'product is required' });

  try {
    const p = mapProduct(product);
    if (p.price <= 0) return res.json({ success: true, message: 'Skipped (no price)' });

    const existing = await client.execute({
      sql:  'SELECT id FROM products WHERE store_id = ? AND name = ?',
      args: [store.store_id, p.name]
    });

    if (existing.rows.length > 0) {
      await client.execute({
        sql:  `UPDATE products SET category=?, price=?, description=?, in_stock=?
               WHERE store_id=? AND name=?`,
        args: [p.category, p.price, p.description, p.in_stock, store.store_id, p.name]
      });
    } else {
      await client.execute({
        sql:  `INSERT INTO products (store_id, name, category, price, description, in_stock)
               VALUES (?, ?, ?, ?, ?, ?)`,
        args: [store.store_id, p.name, p.category, p.price, p.description, p.in_stock]
      });
    }

    await client.execute({
      sql:  'UPDATE stores SET woo_last_sync = ? WHERE store_id = ?',
      args: [new Date().toISOString(), store.store_id]
    });

    res.json({ success: true, message: 'Product updated!' });

  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE SINGLE PRODUCT ────────────────────────────────
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

// ─── PING ─────────────────────────────────────────────────
router.post('/plugin/ping', async (req, res) => {
  try {
    const store = await authenticatePlugin(req, res);
    if (!store) return;

    res.json({
      success:   true,
      message:   'Connected successfully!',
      storeName: store.name,
      storeId:   store.store_id,
      plan:      store.plan
    });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET WIDGET CONFIG (called by plugin to check if enabled)
router.get('/plugin/widget-config/:storeId', async (req, res) => {
  try {
    const store = await storeDB.findById(req.params.storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });

    res.json({
      success:       true,
      widgetEnabled: store.widget_enabled !== 0,
      brandColor:    store.brand_color    || '#7c6af7',
      currency:      store.currency       || 'PKR'
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
