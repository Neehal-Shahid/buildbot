const { createClient } = require('@libsql/client');
require('dotenv').config();

// Connect to Turso cloud database
const client = createClient({
  url:       process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});
// Enable foreign key enforcement
client.execute('PRAGMA foreign_keys = ON').catch(() => {});

// ─── CREATE TABLES ────────────────────────────────────────
async function initDB() {
  await client.execute('PRAGMA foreign_keys = ON');
  await client.batch([
    `CREATE TABLE IF NOT EXISTS admins (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      name       TEXT DEFAULT 'Admin',
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS stores (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id    TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      plan        TEXT DEFAULT 'trial',
      plan_status TEXT DEFAULT 'active',
      trial_ends  TEXT DEFAULT (date('now', '+14 days')),
      logo_url    TEXT DEFAULT '',
      brand_color TEXT DEFAULT '#7c6af7',
      currency    TEXT DEFAULT 'PKR',
      created_at  TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       REAL NOT NULL,
  description TEXT DEFAULT '',
  in_stock    INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
)`,
`CREATE TABLE IF NOT EXISTS recommendations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id   TEXT NOT NULL,
  budget     REAL NOT NULL,
  purpose    TEXT NOT NULL,
  extras     TEXT DEFAULT '',
  result     TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
)`,
`CREATE TABLE IF NOT EXISTS payments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id        TEXT NOT NULL,
  amount          REAL NOT NULL,
  method          TEXT NOT NULL,
  transaction_ref TEXT DEFAULT '',
  plan            TEXT NOT NULL,
  status          TEXT DEFAULT 'pending',
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
)`,
    `CREATE TABLE IF NOT EXISTS tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL,
      token      TEXT NOT NULL,
      type       TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used       INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS trial_emails_sent (
      store_id TEXT,
      days_left INTEGER,
      PRIMARY KEY (store_id, days_left)
    )`
  ], 'write');

  const migrations = [
    `ALTER TABLE stores ADD COLUMN plugin_secret TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN woo_connected INTEGER DEFAULT 0`,
    `ALTER TABLE stores ADD COLUMN woo_url TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN woo_last_sync TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN woo_product_count INTEGER DEFAULT 0`,
    `ALTER TABLE stores ADD COLUMN email_verified INTEGER DEFAULT 0`,
    `ALTER TABLE stores ADD COLUMN widget_title TEXT DEFAULT 'BuildBot'`,
    `ALTER TABLE stores ADD COLUMN welcome_msg  TEXT DEFAULT 'Tell me your budget and what you need — I will find the best parts from this store for you.'`,
    `ALTER TABLE stores ADD COLUMN button_text  TEXT DEFAULT 'Get Started'`,
    `ALTER TABLE stores ADD COLUMN widget_bg    TEXT DEFAULT '#1a1d27'`,
    `ALTER TABLE stores ADD COLUMN widget_enabled INTEGER DEFAULT 1`,
    `ALTER TABLE stores ADD COLUMN catalog_last_updated TEXT DEFAULT ''`,
    `ALTER TABLE products ADD COLUMN woo_id INTEGER DEFAULT NULL`,
    `ALTER TABLE stores ADD COLUMN google_id TEXT DEFAULT NULL`
  ];
  for (const sql of migrations) {
    try { await client.execute(sql); } catch(e) {}
  }

  // Seed admin if none exists
  try {
    const adminRes = await client.execute('SELECT COUNT(*) as c FROM admins');
    if (adminRes.rows[0].c === 0) {
      const bcrypt = require('bcryptjs');
      const adminEmail = process.env.ADMIN_EMAIL || 'workwithneehal@gmail.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashed = await bcrypt.hash(adminPassword, 10);
      await client.execute({
        sql: 'INSERT INTO admins (email, password) VALUES (?, ?)',
        args: [adminEmail, hashed]
      });
      console.log('Admin account seeded from .env');
    }
  } catch(e) {
    console.error('Error seeding admin account:', e);
  }

  console.log('Turso database connected and tables ready!');
}

// ─── STORE FUNCTIONS ──────────────────────────────────────
const storeDB = {

  create: async (storeId, name, email, hashedPassword, googleId = null) => {
    return await client.execute({
      sql: `INSERT INTO stores (store_id, name, email, password, google_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [storeId, name, email, hashedPassword, googleId]
    });
  },

  findByEmail: async (email) => {
    const res = await client.execute({
      sql:  'SELECT * FROM stores WHERE email = ?',
      args: [email]
    });
    return res.rows[0] || null;
  },

  findById: async (storeId) => {
    const res = await client.execute({
      sql:  'SELECT * FROM stores WHERE store_id = ?',
      args: [storeId]
    });
    return res.rows[0] || null;
  },

  updateBranding: async (storeId, brandColor, currency) => {
    return await client.execute({
      sql:  'UPDATE stores SET brand_color = ?, currency = ? WHERE store_id = ?',
      args: [brandColor, currency, storeId]
    });
  },

  updatePlan: async (storeId, plan, status) => {
    return await client.execute({
      sql:  'UPDATE stores SET plan = ?, plan_status = ? WHERE store_id = ?',
      args: [plan, status, storeId]
    });
  },

  isActive: async (storeId) => {
    const res = await client.execute({
      sql:  'SELECT * FROM stores WHERE store_id = ?',
      args: [storeId]
    });
    const store = res.rows[0];
    if (!store) return false;
    if (store.plan_status === 'active' && store.plan !== 'trial') return true;
    if (store.plan === 'trial') {
      return new Date() < new Date(store.trial_ends);
    }
    return false;
  },

  getAll: async () => {
    const res = await client.execute('SELECT * FROM stores ORDER BY created_at DESC');
    return res.rows;
  },

  disableStore: async (storeId) => {
    return await client.execute({
      sql:  "UPDATE stores SET plan_status = 'disabled' WHERE store_id = ?",
      args: [storeId]
    });
  },

  activateStore: async (storeId) => {
    return await client.execute({
      sql:  "UPDATE stores SET plan_status = 'active' WHERE store_id = ?",
      args: [storeId]
    });
  },
  
  updatePassword: async (email, hashedPassword) => {
    return await client.execute({
      sql:  'UPDATE stores SET password = ? WHERE email = ?',
      args: [hashedPassword, email]
    });
  },
  updatePluginKey: async (storeId, pluginSecret) => {
    return await client.execute({
      sql:  'UPDATE stores SET plugin_secret = ? WHERE store_id = ?',
      args: [pluginSecret, storeId]
    });
  },
  
  updateWooStatus: async (storeId, wooUrl, productCount) => {
    const now = new Date().toISOString();
    return await client.execute({
      sql:  `UPDATE stores SET woo_connected = 1, woo_url = ?,
             woo_last_sync = ?, woo_product_count = ?
             WHERE store_id = ?`,
      args: [wooUrl, now, productCount, storeId]
    });
  },
  
  findByPluginSecret: async (storeId, secret) => {
    const res = await client.execute({
      sql:  `SELECT * FROM stores
             WHERE store_id = ? AND plugin_secret = ?`,
      args: [storeId, secret]
    });
    return res.rows[0] || null;
  },
  
  getPluginKey: async (storeId) => {
    const res = await client.execute({
      sql:  `SELECT plugin_secret, woo_connected, woo_url,
             woo_last_sync, woo_product_count, widget_enabled
             FROM stores WHERE store_id = ?`,
      args: [storeId]
    });
    return res.rows[0] || null;
  },

  touchCatalog: async (storeId) => {
    return await client.execute({
      sql: "UPDATE stores SET catalog_last_updated = datetime('now') WHERE store_id = ?",
      args: [storeId]
    });
  }
};

// ─── ADMIN FUNCTIONS ──────────────────────────────────────
const adminDB = {
  findByEmail: async (email) => {
    const res = await client.execute({
      sql: 'SELECT * FROM admins WHERE email = ?',
      args: [email]
    });
    return res.rows[0] || null;
  },

  findById: async (id) => {
    const res = await client.execute({
      sql: 'SELECT * FROM admins WHERE id = ?',
      args: [id]
    });
    return res.rows[0] || null;
  },

  updatePassword: async (email, hashedPassword) => {
    return await client.execute({
      sql: 'UPDATE admins SET password = ? WHERE email = ?',
      args: [hashedPassword, email]
    });
  },

  updateProfile: async (id, name, email) => {
    return await client.execute({
      sql: 'UPDATE admins SET name = ?, email = ? WHERE id = ?',
      args: [name, email, id]
    });
  }
};

// ─── PRODUCT FUNCTIONS ────────────────────────────────────
const productDB = {

  bulkInsert: async (storeId, products) => {
    // Delete old products first
    await client.execute({
      sql:  'DELETE FROM products WHERE store_id = ?',
      args: [storeId]
    });

    // Insert all new products
    for (const p of products) {
      await client.execute({
        sql:  `INSERT INTO products (store_id, name, category, price, description)
               VALUES (?, ?, ?, ?, ?)`,
        args: [
          storeId,
          p.name     || p.Name     || '',
          p.category || p.Category || '',
          parseFloat(p.price || p.Price || 0),
          p.description || p.Description || ''
        ]
      });
    }
    return products.length;
  },

  getByStore: async (storeId) => {
    const res = await client.execute({
      sql:  'SELECT * FROM products WHERE store_id = ? AND in_stock = 1',
      args: [storeId]
    });
    return res.rows;
  },

  getCount: async (storeId) => {
    const res = await client.execute({
      sql:  'SELECT COUNT(*) as count FROM products WHERE store_id = ?',
      args: [storeId]
    });
    return res.rows[0];
  }

};

// ─── ANALYTICS FUNCTIONS ──────────────────────────────────
const analyticsDB = {

  logRecommendation: async (storeId, budget, purpose, extras, result) => {
    return await client.execute({
      sql:  `INSERT INTO recommendations (store_id, budget, purpose, extras, result)
             VALUES (?, ?, ?, ?, ?)`,
      args: [storeId, budget, purpose, extras, JSON.stringify(result)]
    });
  },

  getCachedRecommendation: async (storeId, budget, purpose, extras) => {
    const storeRes = await client.execute({
      sql: 'SELECT catalog_last_updated FROM stores WHERE store_id = ?',
      args: [storeId]
    });
    const lastUpdated = storeRes.rows[0]?.catalog_last_updated || '';

    let timeCondition = '';
    let args = [storeId, budget, purpose, extras];

    if (lastUpdated) {
       timeCondition = 'AND created_at >= ?';
       args.push(lastUpdated);
    }

    const res = await client.execute({
      sql:  `SELECT result FROM recommendations 
             WHERE store_id = ? AND budget = ? AND purpose = ? AND extras = ? 
             ${timeCondition}
             ORDER BY created_at DESC LIMIT 1`,
      args: args
    });
    return res.rows[0] ? JSON.parse(res.rows[0].result) : null;
  },

  getStats: async (storeId) => {
    const total = await client.execute({
      sql:  'SELECT COUNT(*) as count FROM recommendations WHERE store_id = ?',
      args: [storeId]
    });

    const byPurpose = await client.execute({
      sql:  `SELECT purpose, COUNT(*) as count FROM recommendations
             WHERE store_id = ? GROUP BY purpose ORDER BY count DESC`,
      args: [storeId]
    });

    const avgBudget = await client.execute({
      sql:  'SELECT AVG(budget) as avg FROM recommendations WHERE store_id = ?',
      args: [storeId]
    });

    const recent = await client.execute({
      sql:  `SELECT budget, purpose, extras, created_at FROM recommendations
             WHERE store_id = ? ORDER BY created_at DESC LIMIT 10`,
      args: [storeId]
    });

    const daily = await client.execute({
      sql:  `SELECT date(created_at) as day, COUNT(*) as count
             FROM recommendations WHERE store_id = ?
             GROUP BY day ORDER BY day DESC LIMIT 7`,
      args: [storeId]
    });

    return {
      total:     total.rows[0],
      byPurpose: byPurpose.rows,
      avgBudget: avgBudget.rows[0],
      recent:    recent.rows,
      daily:     daily.rows
    };
  },

  getTotalRecs: async () => {
    const res = await client.execute(
      'SELECT COUNT(*) as c FROM recommendations'
    );
    return res.rows[0].c;
  },

  checkLimit: async (storeId, plan) => {
    // Trial: max 3 per day
    if (plan === 'trial') {
      const res = await client.execute({
        sql: `SELECT COUNT(*) as count FROM recommendations
              WHERE store_id = ?
              AND date(created_at) = date('now')`,
        args: [storeId]
      });
      const used = res.rows[0].count;
      return {
        allowed: used < 3,
        used,
        limit: 3,
        period: 'today',
        remaining: Math.max(0, 3 - used)
      };
    }
  
    // Starter: 500/month, Growth: 2000/month, Pro: unlimited
    const limits = { starter: 500, growth: 2000, pro: 999999 };
    const limit  = limits[plan] || 500;
  
    if (limit === 999999) {
      return { allowed: true, used: 0, limit: 999999, remaining: 999999 };
    }
  
    const res = await client.execute({
      sql: `SELECT COUNT(*) as count FROM recommendations
            WHERE store_id = ?
            AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      args: [storeId]
    });
  
    const used = res.rows[0].count;
    return {
      allowed: used < limit,
      used,
      limit,
      period: 'this month',
      remaining: Math.max(0, limit - used)
    };
  }

};

// ─── PAYMENT FUNCTIONS ────────────────────────────────────
const paymentDB = {

  create: async (storeId, amount, method, transactionRef, plan) => {
    return await client.execute({
      sql:  `INSERT INTO payments (store_id, amount, method, transaction_ref, plan)
             VALUES (?, ?, ?, ?, ?)`,
      args: [storeId, amount, method, transactionRef, plan]
    });
  },

  approve: async (paymentId, storeId, plan) => {
    await client.execute({
      sql:  "UPDATE payments SET status = 'approved' WHERE id = ?",
      args: [paymentId]
    });
    await client.execute({
      sql:  "UPDATE stores SET plan = ?, plan_status = 'active' WHERE store_id = ?",
      args: [plan, storeId]
    });
  },

  reject: async (paymentId) => {
    return await client.execute({
      sql:  "UPDATE payments SET status = 'rejected' WHERE id = ?",
      args: [paymentId]
    });
  },

  getByStore: async (storeId) => {
    const res = await client.execute({
      sql:  'SELECT * FROM payments WHERE store_id = ? ORDER BY created_at DESC',
      args: [storeId]
    });
    return res.rows;
  },

  getPending: async () => {
    const res = await client.execute(`
      SELECT p.*, s.name, s.email FROM payments p
      JOIN stores s ON p.store_id = s.store_id
      WHERE p.status = 'pending' ORDER BY p.created_at DESC
    `);
    return res.rows;
  },

  getAll: async () => {
    const res = await client.execute(`
      SELECT p.*, s.name, s.email FROM payments p
      JOIN stores s ON p.store_id = s.store_id
      ORDER BY p.created_at DESC
    `);
    return res.rows;
  },

  getRevenue: async () => {
    const res = await client.execute(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'approved'"
    );
    return res.rows[0].total;
  }

};
// ─── EMAIL VERIFICATION & PASSWORD RESET TOKENS ──────────
const tokenDB = {

  save: async (email, token, type) => {
    // Delete old tokens of same type for this email
    await client.execute({
      sql:  'DELETE FROM tokens WHERE email = ? AND type = ?',
      args: [email, type]
    });
    // Save new token (expires in 1 hour for reset flows, 24 hours for verify)
    const hours = (type === 'reset' || type === 'admin_reset') ? 1 : 24;
    await client.execute({
      sql:  `INSERT INTO tokens (email, token, type, expires_at)
             VALUES (?, ?, ?, datetime('now', '+${hours} hours'))`,
      args: [email, token, type]
    });
  },

  verify: async (token, type) => {
    const res = await client.execute({
      sql:  `SELECT * FROM tokens
             WHERE token = ? AND type = ? AND used = 0
             AND expires_at > datetime('now')`,
      args: [token, type]
    });
    return res.rows[0] || null;
  },

  markUsed: async (token) => {
    await client.execute({
      sql:  'UPDATE tokens SET used = 1 WHERE token = ?',
      args: [token]
    });
  }

};

// ─── VERIFICATION STATUS ──────────────────────────────────
const verifyDB = {

  setVerified: async (email) => {
    await client.execute({
      sql:  'UPDATE stores SET email_verified = 1 WHERE email = ?',
      args: [email]
    });
  },

  isVerified: async (email) => {
    try {
      const res = await client.execute({
        sql:  'SELECT email_verified FROM stores WHERE email = ?',
        args: [email]
      });
      return res.rows[0]?.email_verified === 1;
    } catch(e) {
      return true; // if column doesn't exist yet, allow login
    }
  }

};

// ─── WIDGET CUSTOMIZATION ─────────────────────────────────
const widgetDB = {

  updateSettings: async (storeId, widgetTitle, welcomeMsg, buttonText, bgColor) => {
    return await client.execute({
      sql:  `UPDATE stores SET widget_title = ?, welcome_msg = ?, button_text = ?, widget_bg = ?
             WHERE store_id = ?`,
      args: [widgetTitle, welcomeMsg, buttonText, bgColor || '#1a1d27', storeId]
    });
  },
  
  getSettings: async (storeId) => {
    const res = await client.execute({
      sql:  'SELECT widget_title, welcome_msg, button_text, widget_bg FROM stores WHERE store_id = ?',
      args: [storeId]
    });
    const row = res.rows[0];
    return {
      widgetTitle: row?.widget_title || 'BuildBot',
      welcomeMsg:  row?.welcome_msg  || 'Tell me your budget and what you need — I will find the best parts from this store for you.',
      buttonText:  row?.button_text  || 'Get Started',
      widgetBg:    row?.widget_bg    || '#1a1d27'
    };
  }

};

module.exports = { client, initDB, storeDB, productDB, analyticsDB, paymentDB, tokenDB, verifyDB, widgetDB, adminDB };