const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Make sure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'buildbot.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ─── CREATE TABLES ────────────────────────────────────────

db.exec(`
  -- Store owners (your customers)
  CREATE TABLE IF NOT EXISTS stores (
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
  );

  -- Products for each store
  CREATE TABLE IF NOT EXISTS products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL,
    price      REAL NOT NULL,
    description TEXT DEFAULT '',
    in_stock   INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
  );

  -- Every recommendation made by the widget
  CREATE TABLE IF NOT EXISTS recommendations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id   TEXT NOT NULL,
    budget     REAL NOT NULL,
    purpose    TEXT NOT NULL,
    extras     TEXT DEFAULT '',
    result     TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
  );

  -- Payment records
  CREATE TABLE IF NOT EXISTS payments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id        TEXT NOT NULL,
    amount          REAL NOT NULL,
    method          TEXT NOT NULL,
    transaction_ref TEXT DEFAULT '',
    plan            TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
  );
`);

// ─── STORE FUNCTIONS ──────────────────────────────────────

const storeDB = {

  create: (storeId, name, email, hashedPassword) => {
    return db.prepare(`
      INSERT INTO stores (store_id, name, email, password)
      VALUES (?, ?, ?, ?)
    `).run(storeId, name, email, hashedPassword);
  },

  findByEmail: (email) => {
    return db.prepare('SELECT * FROM stores WHERE email = ?').get(email);
  },

  findById: (storeId) => {
    return db.prepare('SELECT * FROM stores WHERE store_id = ?').get(storeId);
  },

  updateBranding: (storeId, brandColor, currency) => {
    return db.prepare(`
      UPDATE stores SET brand_color = ?, currency = ? WHERE store_id = ?
    `).run(brandColor, currency, storeId);
  },

  updatePlan: (storeId, plan, status) => {
    return db.prepare(`
      UPDATE stores SET plan = ?, plan_status = ? WHERE store_id = ?
    `).run(plan, status, storeId);
  },

  isActive: (storeId) => {
    const store = db.prepare('SELECT * FROM stores WHERE store_id = ?').get(storeId);
    if (!store) return false;
    if (store.plan_status === 'active' && store.plan !== 'trial') return true;
    if (store.plan === 'trial') {
      const trialEnd = new Date(store.trial_ends);
      return new Date() < trialEnd;
    }
    return false;
  }

};

// ─── PRODUCT FUNCTIONS ────────────────────────────────────

const productDB = {

  bulkInsert: (storeId, products) => {
    // Delete old products for this store first
    db.prepare('DELETE FROM products WHERE store_id = ?').run(storeId);

    const insert = db.prepare(`
      INSERT INTO products (store_id, name, category, price, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((prods) => {
      for (const p of prods) {
        insert.run(
          storeId,
          p.name || p.Name || '',
          p.category || p.Category || '',
          parseFloat(p.price || p.Price || 0),
          p.description || p.Description || ''
        );
      }
    });

    insertMany(products);
    return products.length;
  },

  getByStore: (storeId) => {
    return db.prepare('SELECT * FROM products WHERE store_id = ? AND in_stock = 1').all(storeId);
  },

  getCount: (storeId) => {
    return db.prepare('SELECT COUNT(*) as count FROM products WHERE store_id = ?').get(storeId);
  }

};

// ─── ANALYTICS FUNCTIONS ──────────────────────────────────

const analyticsDB = {

  logRecommendation: (storeId, budget, purpose, extras, result) => {
    return db.prepare(`
      INSERT INTO recommendations (store_id, budget, purpose, extras, result)
      VALUES (?, ?, ?, ?, ?)
    `).run(storeId, budget, purpose, extras, JSON.stringify(result));
  },

  getStats: (storeId) => {
    const total = db.prepare(
      'SELECT COUNT(*) as count FROM recommendations WHERE store_id = ?'
    ).get(storeId);

    const byPurpose = db.prepare(`
      SELECT purpose, COUNT(*) as count
      FROM recommendations WHERE store_id = ?
      GROUP BY purpose ORDER BY count DESC
    `).all(storeId);

    const avgBudget = db.prepare(
      'SELECT AVG(budget) as avg FROM recommendations WHERE store_id = ?'
    ).get(storeId);

    const recent = db.prepare(`
      SELECT budget, purpose, extras, created_at
      FROM recommendations WHERE store_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).all(storeId);

    const daily = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM recommendations WHERE store_id = ?
      GROUP BY day ORDER BY day DESC LIMIT 7
    `).all(storeId);

    return { total, byPurpose, avgBudget, recent, daily };
  }

};

// ─── PAYMENT FUNCTIONS ────────────────────────────────────

const paymentDB = {

  create: (storeId, amount, method, transactionRef, plan) => {
    return db.prepare(`
      INSERT INTO payments (store_id, amount, method, transaction_ref, plan)
      VALUES (?, ?, ?, ?, ?)
    `).run(storeId, amount, method, transactionRef, plan);
  },

  approve: (paymentId, storeId, plan) => {
    db.prepare(
      'UPDATE payments SET status = ? WHERE id = ?'
    ).run('approved', paymentId);
    db.prepare(
      'UPDATE stores SET plan = ?, plan_status = ? WHERE store_id = ?'
    ).run(plan, 'active', storeId);
  },

  getByStore: (storeId) => {
    return db.prepare(
      'SELECT * FROM payments WHERE store_id = ? ORDER BY created_at DESC'
    ).all(storeId);
  },

  getPending: () => {
    return db.prepare(
      'SELECT p.*, s.name, s.email FROM payments p JOIN stores s ON p.store_id = s.store_id WHERE p.status = ? ORDER BY p.created_at DESC'
    ).all('pending');
  }

};

module.exports = { db, storeDB, productDB, analyticsDB, paymentDB };