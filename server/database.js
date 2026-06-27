const { createClient } = require("@libsql/client");
require("dotenv").config();

// Connect to Turso cloud database
const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});
// Enable foreign key enforcement
client.execute("PRAGMA foreign_keys = ON").catch(() => {});

// ─── CREATE TABLES ────────────────────────────────────────
async function initDB() {
  await client.execute("PRAGMA foreign_keys = ON");
  await client.batch(
    [
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
    )`,
      `CREATE TABLE IF NOT EXISTS platform_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
)`,
      `CREATE TABLE IF NOT EXISTS email_send_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id   TEXT NOT NULL DEFAULT '',
      recipient  TEXT NOT NULL,
      email_type TEXT NOT NULL,
      subject    TEXT DEFAULT '',
      status     TEXT DEFAULT 'sent',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(store_id, email_type)
    )`,
      `CREATE TABLE IF NOT EXISTS support_tickets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id    TEXT NOT NULL,
      store_name  TEXT DEFAULT '',
      store_email TEXT NOT NULL,
      subject     TEXT NOT NULL,
      message     TEXT NOT NULL,
      status      TEXT DEFAULT 'open',
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
    )`,
      `CREATE TABLE IF NOT EXISTS pending_signups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)`,
    ],
    "write",
  );

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
    `ALTER TABLE stores ADD COLUMN google_id TEXT DEFAULT NULL`,
    `ALTER TABLE stores ADD COLUMN plan_ends TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN admin_notes TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN marketing_emails_enabled INTEGER DEFAULT 1`,
    `ALTER TABLE stores ADD COLUMN drip_emails_paused INTEGER DEFAULT 0`,
    `ALTER TABLE tokens ADD COLUMN attempt_count INTEGER DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS email_send_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT NOT NULL DEFAULT '',
      recipient TEXT NOT NULL,
      email_type TEXT NOT NULL,
      subject TEXT DEFAULT '',
      status TEXT DEFAULT 'sent',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(store_id, email_type)
    )`,
    `CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT NOT NULL,
      store_name TEXT DEFAULT '',
      store_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS platform_config (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')`,
    `INSERT OR IGNORE INTO platform_config (key, value) VALUES
  ('trial_days', '14'),
  ('trial_daily_limit', '3'),
  ('starter_price', '2999'),
  ('growth_price', '4999'),
  ('pro_price', '7999'),
  ('payment_number', ''),
  ('maintenance_mode', 'false'),
  ('anthropic_model', 'claude-haiku-4-5'),
  ('anthropic_max_tokens', '8192'),
  ('api_input_price_per_million', '1'),
  ('api_output_price_per_million', '5'),
  ('usd_to_pkr', '280'),
  ('starter_monthly_limit', '500'),
  ('growth_monthly_limit', '2000')`,
    `ALTER TABLE recommendations ADD COLUMN source TEXT DEFAULT ''`,
    `ALTER TABLE recommendations ADD COLUMN model TEXT DEFAULT ''`,
    `ALTER TABLE recommendations ADD COLUMN input_tokens INTEGER DEFAULT 0`,
    `ALTER TABLE recommendations ADD COLUMN output_tokens INTEGER DEFAULT 0`,
    `ALTER TABLE recommendations ADD COLUMN est_cost_usd REAL DEFAULT 0`,
    `ALTER TABLE stores ADD COLUMN trial_started_at TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN connection_abuse_flag INTEGER DEFAULT 0`,
    `ALTER TABLE stores ADD COLUMN connection_abuse_note TEXT DEFAULT ''`,
    `CREATE TABLE IF NOT EXISTS pending_signups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)`,
  ];
  for (const sql of migrations) {
    try {
      await client.execute(sql);
    } catch (e) {}
  }

  // Seed admin if none exists
  try {
    const adminRes = await client.execute("SELECT COUNT(*) as c FROM admins");
    if (adminRes.rows[0].c === 0) {
      const bcrypt = require("bcryptjs");
      const adminEmail = process.env.ADMIN_EMAIL || "workwithneehal@gmail.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
      const hashed = await bcrypt.hash(adminPassword, 10);
      await client.execute({
        sql: "INSERT INTO admins (email, password) VALUES (?, ?)",
        args: [adminEmail, hashed],
      });
      console.log("Admin account seeded from .env");
    }
  } catch (e) {
    console.error("Error seeding admin account:", e);
  }

  console.log("Turso database connected and tables ready!");
}

// ─── STORE FUNCTIONS ──────────────────────────────────────
const storeDB = {
  create: async (storeId, name, email, hashedPassword, googleId = null) => {
    return await client.execute({
      sql: `INSERT INTO stores (store_id, name, email, password, google_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [storeId, name, email, hashedPassword, googleId],
    });
  },

  findByEmail: async (email) => {
    const res = await client.execute({
      sql: "SELECT * FROM stores WHERE email = ?",
      args: [email],
    });
    return res.rows[0] || null;
  },

  findById: async (storeId) => {
    const res = await client.execute({
      sql: "SELECT * FROM stores WHERE store_id = ?",
      args: [storeId],
    });
    return res.rows[0] || null;
  },

  updateBranding: async (storeId, brandColor, currency) => {
    return await client.execute({
      sql: "UPDATE stores SET brand_color = ?, currency = ? WHERE store_id = ?",
      args: [brandColor, currency, storeId],
    });
  },

  updatePlan: async (storeId, plan, status) => {
    return await client.execute({
      sql: "UPDATE stores SET plan = ?, plan_status = ? WHERE store_id = ?",
      args: [plan, status, storeId],
    });
  },

  isActive: async (storeId) => {
    const res = await client.execute({
      sql: "SELECT * FROM stores WHERE store_id = ?",
      args: [storeId],
    });
    const store = res.rows[0];
    if (!store) return false;
    if (store.plan_status === "active" && store.plan !== "trial") return true;
    if (store.plan === "trial") {
      return new Date() < new Date(store.trial_ends);
    }
    return false;
  },

  getAll: async () => {
    const res = await client.execute(
      "SELECT * FROM stores WHERE email_verified = 1 ORDER BY created_at DESC",
    );
    return res.rows;
  },

  disableStore: async (storeId) => {
    return await client.execute({
      sql: "UPDATE stores SET plan_status = 'disabled' WHERE store_id = ?",
      args: [storeId],
    });
  },

  activateStore: async (storeId) => {
    return await client.execute({
      sql: "UPDATE stores SET plan_status = 'active' WHERE store_id = ?",
      args: [storeId],
    });
  },

  updatePassword: async (email, hashedPassword) => {
    return await client.execute({
      sql: "UPDATE stores SET password = ? WHERE email = ?",
      args: [hashedPassword, email],
    });
  },

  updateUnverifiedAccount: async (storeId, name, hashedPassword) => {
    return await client.execute({
      sql: "UPDATE stores SET name = ?, password = ?, email_verified = 0 WHERE store_id = ?",
      args: [name, hashedPassword, storeId],
    });
  },

  deleteUnverifiedOlderThan: async (days = 7) => {
    const res = await client.execute({
      sql: `SELECT store_id FROM stores
            WHERE email_verified = 0
            AND datetime(created_at) < datetime('now', '-${days} days')`,
      args: [],
    });
    for (const row of res.rows) {
      await storeDB.deleteStoreAndData(row.store_id);
    }
    return res.rows.length;
  },
  updatePluginKey: async (storeId, pluginSecret) => {
    return await client.execute({
      sql: "UPDATE stores SET plugin_secret = ? WHERE store_id = ?",
      args: [pluginSecret, storeId],
    });
  },

  updateWooStatus: async (storeId, wooUrl, productCount) => {
    const now = new Date().toISOString();
    return await client.execute({
      sql: `UPDATE stores SET woo_connected = 1, woo_url = ?,
             woo_last_sync = ?, woo_product_count = ?
             WHERE store_id = ?`,
      args: [wooUrl, now, productCount, storeId],
    });
  },

  findByPluginSecret: async (storeId, secret) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
             WHERE store_id = ? AND plugin_secret = ?`,
      args: [storeId, secret],
    });
    return res.rows[0] || null;
  },

  getPluginKey: async (storeId) => {
    const res = await client.execute({
      sql: `SELECT plugin_secret, woo_connected, woo_url,
             woo_last_sync, woo_product_count, widget_enabled
             FROM stores WHERE store_id = ?`,
      args: [storeId],
    });
    return res.rows[0] || null;
  },

  touchCatalog: async (storeId) => {
    return await client.execute({
      sql: "UPDATE stores SET catalog_last_updated = datetime('now') WHERE store_id = ?",
      args: [storeId],
    });
  },

  deleteStoreAndData: async (storeId) => {
    const storeRes = await client.execute({
      sql: "SELECT email FROM stores WHERE store_id = ?",
      args: [storeId],
    });
    const storeEmail = storeRes.rows[0]?.email || null;

    await client.batch(
      [
        {
          sql: "DELETE FROM recommendations WHERE store_id = ?",
          args: [storeId],
        },
        { sql: "DELETE FROM payments WHERE store_id = ?", args: [storeId] },
        { sql: "DELETE FROM products WHERE store_id = ?", args: [storeId] },
        {
          sql: "DELETE FROM trial_emails_sent WHERE store_id = ?",
          args: [storeId],
        },
        ...(storeEmail
          ? [{ sql: "DELETE FROM tokens WHERE email = ?", args: [storeEmail] }]
          : []),
        { sql: "DELETE FROM stores WHERE store_id = ?", args: [storeId] },
      ],
      "write",
    );

    return true;
  },

  // Set plan manually with optional plan_ends date (admin override)
  setPlan: async (storeId, plan, planStatus, planEnds = null) => {
    if (planEnds) {
      return await client.execute({
        sql: "UPDATE stores SET plan = ?, plan_status = ?, plan_ends = ? WHERE store_id = ?",
        args: [plan, planStatus, planEnds, storeId],
      });
    }
    return await client.execute({
      sql: "UPDATE stores SET plan = ?, plan_status = ? WHERE store_id = ?",
      args: [plan, planStatus, storeId],
    });
  },

  // Extend trial by N days from today or current trial_ends, whichever is later
  extendTrial: async (storeId, days) => {
    return await client.execute({
      sql: `UPDATE stores SET
              trial_ends = date(MAX(COALESCE(NULLIF(trial_ends,''), date('now')), date('now')), '+${days} days'),
              plan = 'trial',
              plan_status = 'active'
            WHERE store_id = ?`,
      args: [storeId],
    });
  },

  startTrial: async (storeId) => {
    const store = await storeDB.findById(storeId);
    const trialDays = Number(await configDB.get("trial_days", "14")) || 14;
    if (store?.trial_started_at) {
      return await client.execute({
        sql: `UPDATE stores SET
                trial_ends = date(trial_started_at, '+${trialDays} days'),
                plan = 'trial',
                plan_status = 'active'
              WHERE store_id = ?`,
        args: [storeId],
      });
    }
    return await client.execute({
      sql: `UPDATE stores SET
              trial_started_at = datetime('now'),
              trial_ends = date('now', '+${trialDays} days'),
              plan = 'trial',
              plan_status = 'active'
            WHERE store_id = ?`,
      args: [storeId],
    });
  },

  ensureTrialDates: async (storeId) => {
    const store = await storeDB.findById(storeId);
    if (!store || store.plan !== "trial") return;
    if (store.trial_started_at) return;

    const trialDays = Number(await configDB.get("trial_days", "14")) || 14;
    const startAt = store.created_at || new Date().toISOString();
    await client.execute({
      sql: `UPDATE stores SET
              trial_started_at = ?,
              trial_ends = date(?, '+${trialDays} days')
            WHERE store_id = ?`,
      args: [startAt, startAt, storeId],
    });
  },

  recalculateTrialEndsForAll: async (trialDays) => {
    const days = Number(trialDays) || 14;
    await client.execute({
      sql: `UPDATE stores SET
              trial_ends = date(COALESCE(NULLIF(trial_started_at, ''), created_at), '+${days} days')
            WHERE plan = 'trial' AND plan_status != 'disabled'
              AND COALESCE(NULLIF(trial_started_at, ''), created_at) IS NOT NULL`,
    });
  },

  disconnectWoo: async (storeId) => {
    return await client.execute({
      sql: `UPDATE stores SET
              woo_connected = 0,
              woo_url = '',
              woo_last_sync = '',
              woo_product_count = 0,
              widget_enabled = 0
            WHERE store_id = ?`,
      args: [storeId],
    });
  },

  flagConnectionAbuse: async (storeId, note) => {
    return await client.execute({
      sql: `UPDATE stores SET
              connection_abuse_flag = 1,
              connection_abuse_note = ?
            WHERE store_id = ?`,
      args: [note, storeId],
    });
  },

  // Save internal admin notes for a store
  setNotes: async (storeId, notes) => {
    return await client.execute({
      sql: "UPDATE stores SET admin_notes = ? WHERE store_id = ?",
      args: [notes, storeId],
    });
  },

  // Get trial stores expiring in exactly N days — used for trial warning emails
  getTrialEndingIn: async (days) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
            WHERE plan = 'trial'
            AND plan_status = 'active'
            AND date(trial_ends) = date('now', '+${days} days')`,
      args: [],
    });
    return res.rows;
  },

  // Get paid stores whose plan_ends was exactly N days ago — used for dunning emails
  // plan_ends is set when a payment is approved. Requires plan_ends column (migration added above).
  getPlanLapsedBy: async (days) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
            WHERE plan != 'trial'
            AND plan_status = 'active'
            AND plan_ends != ''
            AND plan_ends IS NOT NULL
            AND date(plan_ends) = date('now', '-${days} days')`,
      args: [],
    });
    return res.rows;
  },

  // Get stores that created their account exactly N days ago — used for onboarding drip
  getSignedUpDaysAgo: async (days) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
            WHERE date(created_at) = date('now', '-${days} days')`,
      args: [],
    });
    return res.rows;
  },

  // Day-N signups eligible for marketing drip (verified, not paused, opted in)
  getSignedUpDaysAgoForDrip: async (days) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
            WHERE date(created_at) = date('now', '-${days} days')
            AND email_verified = 1
            AND COALESCE(marketing_emails_enabled, 1) = 1
            AND COALESCE(drip_emails_paused, 0) = 0
            AND plan_status != 'disabled'`,
      args: [],
    });
    return res.rows;
  },

  // Day 4 — widget not live: no products and WooCommerce not connected
  getSignedUpDaysAgoNotLive: async (days) => {
    const res = await client.execute({
      sql: `SELECT s.* FROM stores s
            WHERE date(s.created_at) = date('now', '-${days} days')
            AND s.email_verified = 1
            AND COALESCE(s.marketing_emails_enabled, 1) = 1
            AND COALESCE(s.drip_emails_paused, 0) = 0
            AND s.plan_status != 'disabled'
            AND COALESCE(s.woo_connected, 0) = 0
            AND NOT EXISTS (
              SELECT 1 FROM products p WHERE p.store_id = s.store_id LIMIT 1
            )`,
      args: [],
    });
    return res.rows;
  },

  setMarketingEmails: async (storeId, enabled) => {
    return await client.execute({
      sql: "UPDATE stores SET marketing_emails_enabled = ? WHERE store_id = ?",
      args: [enabled ? 1 : 0, storeId],
    });
  },

  setDripPaused: async (storeId, paused) => {
    return await client.execute({
      sql: "UPDATE stores SET drip_emails_paused = ? WHERE store_id = ?",
      args: [paused ? 1 : 0, storeId],
    });
  },
};

// ─── ADMIN FUNCTIONS ──────────────────────────────────────
const adminDB = {
  findByEmail: async (email) => {
    const res = await client.execute({
      sql: "SELECT * FROM admins WHERE email = ?",
      args: [email],
    });
    return res.rows[0] || null;
  },

  findById: async (id) => {
    const res = await client.execute({
      sql: "SELECT * FROM admins WHERE id = ?",
      args: [id],
    });
    return res.rows[0] || null;
  },

  updatePassword: async (email, hashedPassword) => {
    return await client.execute({
      sql: "UPDATE admins SET password = ? WHERE email = ?",
      args: [hashedPassword, email],
    });
  },

  updateProfile: async (id, name, email) => {
    return await client.execute({
      sql: "UPDATE admins SET name = ?, email = ? WHERE id = ?",
      args: [name, email, id],
    });
  },
};

// ─── PRODUCT FUNCTIONS ────────────────────────────────────
const productDB = {
  bulkInsert: async (storeId, products) => {
    // Delete old products first
    await client.execute({
      sql: "DELETE FROM products WHERE store_id = ?",
      args: [storeId],
    });

    // Insert all new products
    for (const p of products) {
      await client.execute({
        sql: `INSERT INTO products (store_id, name, category, price, description)
               VALUES (?, ?, ?, ?, ?)`,
        args: [
          storeId,
          p.name || p.Name || "",
          p.category || p.Category || "",
          parseFloat(p.price || p.Price || 0),
          p.description || p.Description || "",
        ],
      });
    }
    return products.length;
  },

  getByStore: async (storeId) => {
    const res = await client.execute({
      sql: "SELECT * FROM products WHERE store_id = ? AND in_stock = 1",
      args: [storeId],
    });
    return res.rows;
  },

  getCount: async (storeId) => {
    const res = await client.execute({
      sql: "SELECT COUNT(*) as count FROM products WHERE store_id = ?",
      args: [storeId],
    });
    return res.rows[0];
  },
};

// ─── ANALYTICS FUNCTIONS ──────────────────────────────────
const analyticsDB = {
  logRecommendation: async (
    storeId,
    budget,
    purpose,
    extras,
    result,
    meta = {},
  ) => {
    const {
      source = "",
      model = "",
      inputTokens = 0,
      outputTokens = 0,
      estCostUsd = 0,
    } = meta;
    return await client.execute({
      sql: `INSERT INTO recommendations
            (store_id, budget, purpose, extras, result, source, model, input_tokens, output_tokens, est_cost_usd)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        storeId,
        budget,
        purpose,
        extras,
        JSON.stringify(result),
        source,
        model,
        inputTokens,
        outputTokens,
        estCostUsd,
      ],
    });
  },

  getCachedRecommendation: async (storeId, budget, purpose, extras) => {
    const storeRes = await client.execute({
      sql: "SELECT catalog_last_updated FROM stores WHERE store_id = ?",
      args: [storeId],
    });
    const lastUpdated = storeRes.rows[0]?.catalog_last_updated || "";

    let timeCondition = "";
    let args = [storeId, budget, purpose, extras];

    if (lastUpdated) {
      timeCondition = "AND created_at >= ?";
      args.push(lastUpdated);
    }

    const res = await client.execute({
      sql: `SELECT result FROM recommendations
             WHERE store_id = ? AND budget = ? AND purpose = ? AND extras = ?
             ${timeCondition}
             ORDER BY created_at DESC LIMIT 1`,
      args: args,
    });
    return res.rows[0] ? JSON.parse(res.rows[0].result) : null;
  },

  getStats: async (storeId) => {
    const total = await client.execute({
      sql: "SELECT COUNT(*) as count FROM recommendations WHERE store_id = ?",
      args: [storeId],
    });

    const byPurpose = await client.execute({
      sql: `SELECT purpose, COUNT(*) as count FROM recommendations
             WHERE store_id = ? GROUP BY purpose ORDER BY count DESC`,
      args: [storeId],
    });

    const avgBudget = await client.execute({
      sql: "SELECT AVG(budget) as avg FROM recommendations WHERE store_id = ?",
      args: [storeId],
    });

    const recent = await client.execute({
      sql: `SELECT budget, purpose, extras, created_at FROM recommendations
             WHERE store_id = ? ORDER BY created_at DESC LIMIT 10`,
      args: [storeId],
    });

    const daily = await client.execute({
      sql: `SELECT date(created_at) as day, COUNT(*) as count
             FROM recommendations WHERE store_id = ?
             GROUP BY day ORDER BY day DESC LIMIT 7`,
      args: [storeId],
    });

    return {
      total: total.rows[0],
      byPurpose: byPurpose.rows,
      avgBudget: avgBudget.rows[0],
      recent: recent.rows,
      daily: daily.rows,
    };
  },

  getTotalRecs: async () => {
    const res = await client.execute(
      "SELECT COUNT(*) as c FROM recommendations",
    );
    return res.rows[0].c;
  },

  checkLimit: async (storeId, plan) => {
    const trialLimit =
      Number(await configDB.get("trial_daily_limit", "3")) || 3;

    if (plan === "trial") {
      const res = await client.execute({
        sql: `SELECT COUNT(*) as count FROM recommendations
              WHERE store_id = ?
              AND date(created_at) = date('now')`,
        args: [storeId],
      });
      const used = res.rows[0].count;
      return {
        allowed: used < trialLimit,
        used,
        limit: trialLimit,
        period: "today",
        remaining: Math.max(0, trialLimit - used),
      };
    }

    const starterLimit =
      Number(await configDB.get("starter_monthly_limit", "500")) || 500;
    const growthLimit =
      Number(await configDB.get("growth_monthly_limit", "2000")) || 2000;
    const limits = { starter: starterLimit, growth: growthLimit, pro: 999999 };
    const limit = limits[plan] || starterLimit;

    if (limit === 999999) {
      return { allowed: true, used: 0, limit: 999999, remaining: 999999 };
    }

    const res = await client.execute({
      sql: `SELECT COUNT(*) as count FROM recommendations
            WHERE store_id = ?
            AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      args: [storeId],
    });

    const used = res.rows[0].count;
    return {
      allowed: used < limit,
      used,
      limit,
      period: "this month",
      remaining: Math.max(0, limit - used),
    };
  },
};

// ─── PAYMENT FUNCTIONS ────────────────────────────────────
const paymentDB = {
  create: async (storeId, amount, method, transactionRef, plan) => {
    return await client.execute({
      sql: `INSERT INTO payments (store_id, amount, method, transaction_ref, plan)
             VALUES (?, ?, ?, ?, ?)`,
      args: [storeId, amount, method, transactionRef, plan],
    });
  },

  approve: async (paymentId, storeId, plan) => {
    await client.execute({
      sql: "UPDATE payments SET status = 'approved' WHERE id = ?",
      args: [paymentId],
    });
    // Set plan and record plan_ends as 30 days from today for dunning tracking
    await client.execute({
      sql: `UPDATE stores
            SET plan = ?, plan_status = 'active', plan_ends = date('now', '+30 days')
            WHERE store_id = ?`,
      args: [plan, storeId],
    });
  },

  reject: async (paymentId) => {
    return await client.execute({
      sql: "UPDATE payments SET status = 'rejected' WHERE id = ?",
      args: [paymentId],
    });
  },

  getByStore: async (storeId) => {
    const res = await client.execute({
      sql: "SELECT * FROM payments WHERE store_id = ? ORDER BY created_at DESC",
      args: [storeId],
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
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'approved'",
    );
    return res.rows[0].total;
  },

  // Get pending payments older than N hours — used for admin stale payment alert
  getStalePending: async (hours) => {
    const res = await client.execute({
      sql: `SELECT p.*, s.name, s.email FROM payments p
            JOIN stores s ON p.store_id = s.store_id
            WHERE p.status = 'pending'
            AND p.created_at <= datetime('now', '-${hours} hours')`,
      args: [],
    });
    return res.rows;
  },
};
// ─── EMAIL VERIFICATION & PASSWORD RESET TOKENS ──────────
const tokenDB = {
  save: async (email, token, type) => {
    // Delete old tokens of same type for this email
    await client.execute({
      sql: "DELETE FROM tokens WHERE email = ? AND type = ?",
      args: [email, type],
    });
    // Save new token (expires in 1 hour for reset flows, 24 hours for verify)
    const hours = type === "reset" || type === "admin_reset" ? 1 : 24;
    await client.execute({
      sql: `INSERT INTO tokens (email, token, type, expires_at)
             VALUES (?, ?, ?, datetime('now', '+${hours} hours'))`,
      args: [email, token, type],
    });
  },

  verify: async (token, type) => {
    const res = await client.execute({
      sql: `SELECT * FROM tokens
             WHERE token = ? AND type = ? AND used = 0
             AND expires_at > datetime('now')`,
      args: [token, type],
    });
    return res.rows[0] || null;
  },

  markUsed: async (token) => {
    await client.execute({
      sql: "UPDATE tokens SET used = 1 WHERE token = ?",
      args: [token],
    });
  },

  saveOtp: async (email, hashedOtp) => {
    await client.execute({
      sql: "DELETE FROM tokens WHERE email = ? AND type = 'verify_otp'",
      args: [email],
    });
    await client.execute({
      sql: `INSERT INTO tokens (email, token, type, expires_at, attempt_count)
             VALUES (?, ?, 'verify_otp', datetime('now', '+15 minutes'), 0)`,
      args: [email, hashedOtp],
    });
  },

  getActiveOtp: async (email) => {
    const res = await client.execute({
      sql: `SELECT * FROM tokens
             WHERE email = ? AND type = 'verify_otp' AND used = 0
             AND expires_at > datetime('now')
             ORDER BY id DESC LIMIT 1`,
      args: [email],
    });
    return res.rows[0] || null;
  },

  incrementOtpAttempts: async (email) => {
    await client.execute({
      sql: `UPDATE tokens SET attempt_count = attempt_count + 1
             WHERE email = ? AND type = 'verify_otp' AND used = 0
             AND expires_at > datetime('now')`,
      args: [email],
    });
  },

  invalidateOtp: async (email) => {
    await client.execute({
      sql: "UPDATE tokens SET used = 1 WHERE email = ? AND type = 'verify_otp'",
      args: [email],
    });
  },

  recentlyCreated: async (email, type, withinSeconds) => {
    const res = await client.execute({
      sql: `SELECT id FROM tokens
             WHERE email = ? AND type = ?
             AND datetime(created_at) > datetime('now', '-${withinSeconds} seconds')
             LIMIT 1`,
      args: [email, type],
    });
    return !!res.rows[0];
  },
};

// ─── VERIFICATION STATUS ──────────────────────────────────
const verifyDB = {
  setVerified: async (email) => {
    await client.execute({
      sql: "UPDATE stores SET email_verified = 1 WHERE email = ?",
      args: [email],
    });
  },

  isVerified: async (email) => {
    try {
      const res = await client.execute({
        sql: "SELECT email_verified FROM stores WHERE email = ?",
        args: [email],
      });
      return res.rows[0]?.email_verified === 1;
    } catch (e) {
      return true; // if column doesn't exist yet, allow login
    }
  },
};

// ─── WIDGET CUSTOMIZATION ─────────────────────────────────
const widgetDB = {
  updateSettings: async (
    storeId,
    widgetTitle,
    welcomeMsg,
    buttonText,
    bgColor,
  ) => {
    return await client.execute({
      sql: `UPDATE stores SET widget_title = ?, welcome_msg = ?, button_text = ?, widget_bg = ?
             WHERE store_id = ?`,
      args: [
        widgetTitle,
        welcomeMsg,
        buttonText,
        bgColor || "#1a1d27",
        storeId,
      ],
    });
  },

  getSettings: async (storeId) => {
    const res = await client.execute({
      sql: "SELECT widget_title, welcome_msg, button_text, widget_bg FROM stores WHERE store_id = ?",
      args: [storeId],
    });
    const row = res.rows[0];
    return {
      widgetTitle: row?.widget_title || "BuildBot",
      welcomeMsg:
        row?.welcome_msg ||
        "Tell me your budget and what you need — I will find the best parts from this store for you.",
      buttonText: row?.button_text || "Get Started",
      widgetBg: row?.widget_bg || "#1a1d27",
    };
  },
};

// ─── PLATFORM CONFIG ──────────────────────────────────────
const configDB = {
  // Get all config keys as a flat key→value object
  getAll: async () => {
    const res = await client.execute("SELECT key, value FROM platform_config");
    const config = {};
    for (const row of res.rows) {
      config[row.key] = row.value;
    }
    return config;
  },

  // Set a single config key
  set: async (key, value) => {
    return await client.execute({
      sql: "INSERT OR REPLACE INTO platform_config (key, value) VALUES (?, ?)",
      args: [key, String(value)],
    });
  },

  // Set multiple keys at once from a plain object
  setMany: async (configObj) => {
    for (const [key, value] of Object.entries(configObj)) {
      await client.execute({
        sql: "INSERT OR REPLACE INTO platform_config (key, value) VALUES (?, ?)",
        args: [key, String(value)],
      });
    }
  },

  // Get a single key with optional default
  get: async (key, defaultValue = "") => {
    const res = await client.execute({
      sql: "SELECT value FROM platform_config WHERE key = ?",
      args: [key],
    });
    return res.rows[0]?.value ?? defaultValue;
  },

  getAiSettings: async () => {
    const cfg = await configDB.getAll();
    return {
      model: (
        cfg.anthropic_model ||
        process.env.ANTHROPIC_MODEL ||
        "claude-haiku-4-5"
      ).trim(),
      maxTokens:
        Number(cfg.anthropic_max_tokens || process.env.ANTHROPIC_MAX_TOKENS) ||
        8192,
      inputPricePerM: Number(cfg.api_input_price_per_million || 1) || 1,
      outputPricePerM: Number(cfg.api_output_price_per_million || 5) || 5,
      usdToPkr: Number(cfg.usd_to_pkr || 280) || 280,
    };
  },
};

// ─── API USAGE ANALYTICS ──────────────────────────────────
const apiUsageDB = {
  estimateCostUsd(inputTokens, outputTokens, inputPricePerM, outputPricePerM) {
    return (
      (inputTokens / 1e6) * inputPricePerM +
      (outputTokens / 1e6) * outputPricePerM
    );
  },

  async getSummary(period = "month") {
    const dateFilter =
      period === "today"
        ? "AND date(created_at) = date('now')"
        : "AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";

    const res = await client.execute({
      sql: `SELECT
              COUNT(*) AS total_recs,
              SUM(CASE WHEN source = 'ai' THEN 1 ELSE 0 END) AS ai_calls,
              SUM(CASE WHEN source = 'cached' THEN 1 ELSE 0 END) AS cached_calls,
              SUM(CASE WHEN source = 'test' THEN 1 ELSE 0 END) AS test_calls,
              COALESCE(SUM(input_tokens), 0) AS input_tokens,
              COALESCE(SUM(output_tokens), 0) AS output_tokens,
              COALESCE(SUM(est_cost_usd), 0) AS est_cost_usd
            FROM recommendations
            WHERE 1=1 ${dateFilter}`,
    });
    const row = res.rows[0] || {};
    const totalRecs = Number(row.total_recs) || 0;
    const aiCalls = Number(row.ai_calls) || 0;
    const cachedCalls = Number(row.cached_calls) || 0;
    return {
      totalRecs,
      aiCalls,
      cachedCalls,
      testCalls: Number(row.test_calls) || 0,
      inputTokens: Number(row.input_tokens) || 0,
      outputTokens: Number(row.output_tokens) || 0,
      estCostUsd: Number(row.est_cost_usd) || 0,
      cacheHitRate:
        totalRecs > 0 ? Math.round((cachedCalls / totalRecs) * 100) : 0,
    };
  },

  async getStoreBreakdown(period = "month") {
    const dateFilter =
      period === "today"
        ? "AND date(r.created_at) = date('now')"
        : "AND strftime('%Y-%m', r.created_at) = strftime('%Y-%m', 'now')";

    const res = await client.execute({
      sql: `SELECT
              r.store_id,
              s.name,
              s.plan,
              s.plan_status,
              COUNT(*) AS total_recs,
              SUM(CASE WHEN r.source = 'ai' THEN 1 ELSE 0 END) AS ai_calls,
              SUM(CASE WHEN r.source = 'cached' THEN 1 ELSE 0 END) AS cached_calls,
              COALESCE(SUM(r.input_tokens), 0) AS input_tokens,
              COALESCE(SUM(r.output_tokens), 0) AS output_tokens,
              COALESCE(SUM(r.est_cost_usd), 0) AS est_cost_usd
            FROM recommendations r
            LEFT JOIN stores s ON s.store_id = r.store_id
            WHERE 1=1 ${dateFilter}
            GROUP BY r.store_id
            ORDER BY est_cost_usd DESC, ai_calls DESC`,
    });
    return res.rows.map((row) => ({
      storeId: row.store_id,
      name: row.name || row.store_id,
      plan: row.plan || "trial",
      planStatus: row.plan_status || "",
      totalRecs: Number(row.total_recs) || 0,
      aiCalls: Number(row.ai_calls) || 0,
      cachedCalls: Number(row.cached_calls) || 0,
      inputTokens: Number(row.input_tokens) || 0,
      outputTokens: Number(row.output_tokens) || 0,
      estCostUsd: Number(row.est_cost_usd) || 0,
    }));
  },

  async getProfitAnalysis(config) {
    const starterPrice = Number(config.starter_price || 2999);
    const growthPrice = Number(config.growth_price || 4999);
    const proPrice = Number(config.pro_price || 7999);
    const trialLimit = Number(config.trial_daily_limit || 3);
    const starterLimit = Number(config.starter_monthly_limit || 500);
    const growthLimit = Number(config.growth_monthly_limit || 2000);
    const inputPrice = Number(config.api_input_price_per_million || 1);
    const outputPrice = Number(config.api_output_price_per_million || 5);

    const monthSummary = await apiUsageDB.getSummary("month");
    const avgCostPerAi =
      monthSummary.aiCalls > 0
        ? monthSummary.estCostUsd / monthSummary.aiCalls
        : apiUsageDB.estimateCostUsd(4000, 5000, inputPrice, outputPrice);

    const activeRes = await client.execute({
      sql: `SELECT plan, COUNT(*) AS c FROM stores
            WHERE plan_status = 'active' AND plan != 'trial'
            GROUP BY plan`,
    });
    let mrrPkr = 0;
    const paidCounts = { starter: 0, growth: 0, pro: 0 };
    for (const row of activeRes.rows) {
      const plan = row.plan;
      const count = Number(row.c) || 0;
      paidCounts[plan] = count;
      const prices = {
        starter: starterPrice,
        growth: growthPrice,
        pro: proPrice,
      };
      mrrPkr += count * (prices[plan] || 0);
    }

    const usdToPkr = Number(config.usd_to_pkr || 280);
    const apiCostPkr = monthSummary.estCostUsd * usdToPkr;

    const plans = [
      {
        plan: "trial",
        pricePkr: 0,
        limit: trialLimit,
        period: "day",
        revenuePerRec: 0,
        estApiCostPerRec: avgCostPerAi * usdToPkr,
      },
      {
        plan: "starter",
        pricePkr: starterPrice,
        limit: starterLimit,
        period: "month",
        revenuePerRec: starterLimit ? starterPrice / starterLimit : 0,
        estApiCostPerRec: avgCostPerAi * usdToPkr,
      },
      {
        plan: "growth",
        pricePkr: growthPrice,
        limit: growthLimit,
        period: "month",
        revenuePerRec: growthLimit ? growthPrice / growthLimit : 0,
        estApiCostPerRec: avgCostPerAi * usdToPkr,
      },
      {
        plan: "pro",
        pricePkr: proPrice,
        limit: null,
        period: "month",
        revenuePerRec: null,
        estApiCostPerRec: avgCostPerAi * usdToPkr,
      },
    ].map((p) => ({
      ...p,
      marginPerRec:
        p.revenuePerRec != null ? p.revenuePerRec - p.estApiCostPerRec : null,
      profitable:
        p.revenuePerRec != null ? p.revenuePerRec > p.estApiCostPerRec : true,
    }));

    return {
      mrrPkr,
      apiCostPkr,
      profitPkr: mrrPkr - apiCostPkr,
      paidCounts,
      avgCostPerAiUsd: avgCostPerAi,
      plans,
    };
  },
};

// ─── EMAIL SEND LOG (dedup + audit) ───────────────────────
const emailLogDB = {
  // Returns true if this send is allowed (first time for store_id + email_type)
  tryClaim: async (storeId, emailType, recipient, subject = "") => {
    try {
      const res = await client.execute({
        sql: `INSERT INTO email_send_log (store_id, recipient, email_type, subject)
               VALUES (?, ?, ?, ?)`,
        args: [storeId || "", emailType, recipient, subject],
      });
      return (res.rowsAffected ?? 1) > 0;
    } catch (e) {
      if (String(e.message).includes("UNIQUE")) return false;
      throw e;
    }
  },

  logSend: async (storeId, emailType, recipient, subject, status = "sent") => {
    try {
      await client.execute({
        sql: `INSERT INTO email_send_log (store_id, recipient, email_type, subject, status)
               VALUES (?, ?, ?, ?, ?)`,
        args: [storeId || "", emailType, recipient, subject, status],
      });
    } catch (e) {
      if (!String(e.message).includes("UNIQUE")) throw e;
    }
  },

  getRecent: async (limit = 100) => {
    const res = await client.execute({
      sql: `SELECT * FROM email_send_log ORDER BY created_at DESC LIMIT ?`,
      args: [limit],
    });
    return res.rows;
  },

  getByStore: async (storeId, limit = 50) => {
    const res = await client.execute({
      sql: `SELECT * FROM email_send_log WHERE store_id = ?
             ORDER BY created_at DESC LIMIT ?`,
      args: [storeId, limit],
    });
    return res.rows;
  },
};

// ─── SUPPORT TICKETS ──────────────────────────────────────
const supportTicketDB = {
  create: async (storeId, storeName, storeEmail, subject, message) => {
    const res = await client.execute({
      sql: `INSERT INTO support_tickets (store_id, store_name, store_email, subject, message)
             VALUES (?, ?, ?, ?, ?)`,
      args: [storeId, storeName, storeEmail, subject, message],
    });
    return Number(res.lastInsertRowid);
  },

  getAll: async (status = null) => {
    if (status) {
      const res = await client.execute({
        sql: "SELECT * FROM support_tickets WHERE status = ? ORDER BY created_at DESC",
        args: [status],
      });
      return res.rows;
    }
    const res = await client.execute(
      "SELECT * FROM support_tickets ORDER BY created_at DESC",
    );
    return res.rows;
  },

  getByStore: async (storeId) => {
    const res = await client.execute({
      sql: "SELECT * FROM support_tickets WHERE store_id = ? ORDER BY created_at DESC",
      args: [storeId],
    });
    return res.rows;
  },

  updateStatus: async (id, status) => {
    return await client.execute({
      sql: "UPDATE support_tickets SET status = ? WHERE id = ?",
      args: [status, id],
    });
  },
};

// ─── PENDING SIGNUPS ──────────────────────────────────────
// Holds signup intent before email is verified.
// The real store record in `stores` is only created after verification.
const pendingSignupDB = {
  create: async (name, email, hashedPassword) => {
    return await client.execute({
      sql: `INSERT INTO pending_signups (name, email, password)
            VALUES (?, ?, ?)`,
      args: [name, email, hashedPassword],
    });
  },

  // Insert-or-update: used when user re-registers before verifying
  upsert: async (name, email, hashedPassword) => {
    return await client.execute({
      sql: `INSERT INTO pending_signups (name, email, password)
            VALUES (?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
              name     = excluded.name,
              password = excluded.password,
              created_at = datetime('now')`,
      args: [name, email, hashedPassword],
    });
  },

  findByEmail: async (email) => {
    const res = await client.execute({
      sql: "SELECT * FROM pending_signups WHERE email = ?",
      args: [email],
    });
    return res.rows[0] || null;
  },

  deleteByEmail: async (email) => {
    return await client.execute({
      sql: "DELETE FROM pending_signups WHERE email = ?",
      args: [email],
    });
  },

  // Purge abandoned pending signups older than N days
  deleteOlderThan: async (days = 7) => {
    const res = await client.execute({
      sql: `DELETE FROM pending_signups
            WHERE datetime(created_at) < datetime('now', '-${days} days')`,
      args: [],
    });
    return res.rowsAffected ?? 0;
  },
};

module.exports = {
  client,
  initDB,
  storeDB,
  productDB,
  analyticsDB,
  paymentDB,
  tokenDB,
  verifyDB,
  widgetDB,
  adminDB,
  configDB,
  apiUsageDB,
  emailLogDB,
  supportTicketDB,
  pendingSignupDB,
};
