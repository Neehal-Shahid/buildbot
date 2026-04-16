const { createClient } = require('@libsql/client');
require('dotenv').config();

// Connect to Turso cloud database
const client = createClient({
  url:       process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});

// ─── CREATE TABLES ────────────────────────────────────────
async function initDB() {
  await client.batch([
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
      created_at  TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS recommendations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id   TEXT NOT NULL,
      budget     REAL NOT NULL,
      purpose    TEXT NOT NULL,
      extras     TEXT DEFAULT '',
      result     TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id        TEXT NOT NULL,
      amount          REAL NOT NULL,
      method          TEXT NOT NULL,
      transaction_ref TEXT DEFAULT '',
      plan            TEXT NOT NULL,
      status          TEXT DEFAULT 'pending',
      created_at      TEXT DEFAULT (datetime('now'))
    )`
  ], 'write');
  console.log('Turso database connected and tables ready!');
}

// ─── STORE FUNCTIONS ──────────────────────────────────────
const storeDB = {

  create: async (storeId, name, email, hashedPassword) => {
    return await client.execute({
      sql: `INSERT INTO stores (store_id, name, email, password)
            VALUES (?, ?, ?, ?)`,
      args: [storeId, name, email, hashedPassword]
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

module.exports = { client, initDB, storeDB, productDB, analyticsDB, paymentDB };