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
      plan_status TEXT DEFAULT 'active',
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
      `CREATE TABLE IF NOT EXISTS tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL,
      token      TEXT NOT NULL,
      type       TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used       INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
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
    `ALTER TABLE stores ADD COLUMN widget_title TEXT DEFAULT 'BuildVolt'`,
    `ALTER TABLE stores ADD COLUMN welcome_msg  TEXT DEFAULT 'Tell me your budget and what you need — I will find the best parts from this store for you.'`,
    `ALTER TABLE stores ADD COLUMN button_text  TEXT DEFAULT 'Get Started'`,
    `ALTER TABLE stores ADD COLUMN widget_bg    TEXT DEFAULT '#1a1d27'`,
    `ALTER TABLE stores ADD COLUMN widget_enabled INTEGER DEFAULT 1`,
    `ALTER TABLE stores ADD COLUMN catalog_last_updated TEXT DEFAULT ''`,
    `ALTER TABLE products ADD COLUMN woo_id INTEGER DEFAULT NULL`,
    `ALTER TABLE stores ADD COLUMN google_id TEXT DEFAULT NULL`,
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
  ('maintenance_mode', 'false'),
  ('anthropic_model', 'claude-haiku-4-5'),
  ('anthropic_max_tokens', '8192'),
  ('api_input_price_per_million', '1'),
  ('api_output_price_per_million', '5'),
  ('usd_to_pkr', '280'),
  ('budget_presets', '50000,80000,120000,200000')`,
    `ALTER TABLE recommendations ADD COLUMN source TEXT DEFAULT ''`,
    `ALTER TABLE recommendations ADD COLUMN model TEXT DEFAULT ''`,
    `ALTER TABLE recommendations ADD COLUMN input_tokens INTEGER DEFAULT 0`,
    `ALTER TABLE recommendations ADD COLUMN output_tokens INTEGER DEFAULT 0`,
    `ALTER TABLE recommendations ADD COLUMN est_cost_usd REAL DEFAULT 0`,
    `ALTER TABLE stores ADD COLUMN connection_abuse_flag INTEGER DEFAULT 0`,
    `ALTER TABLE stores ADD COLUMN connection_abuse_note TEXT DEFAULT ''`,
    `ALTER TABLE admins ADD COLUMN recovery_email TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN whatsapp_number TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN whatsapp_verified INTEGER DEFAULT 0`,
    `ALTER TABLE stores ADD COLUMN whatsapp_verify_code TEXT DEFAULT ''`,
    `CREATE TABLE IF NOT EXISTS order_requests (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id     TEXT NOT NULL,
  build_name   TEXT DEFAULT '',
  tier         TEXT DEFAULT '',
  parts        TEXT NOT NULL,
  total_price  REAL NOT NULL,
  currency     TEXT DEFAULT 'PKR',
  order_method TEXT DEFAULT 'whatsapp',
  created_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
)`,
    `CREATE TABLE IF NOT EXISTS pending_signups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)`,
    `INSERT OR IGNORE INTO platform_config (key, value) VALUES ('budget_presets', '50000,80000,120000,200000')`,
    // OSPOS (Open Source Point of Sale) catalog import — a one-click,
    // Products-tab action (server/routes/ospos.js POST /ospos/import).
    `ALTER TABLE stores ADD COLUMN ospos_last_sync TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN ospos_product_count INTEGER DEFAULT 0`,
    `ALTER TABLE products ADD COLUMN ospos_item_id INTEGER DEFAULT NULL`,
    // Saved automatically after a successful manual import so BuildVolt can
    // reconnect on its own later and keep the catalog current whenever the
    // store owner changes something in OSPOS — the store owner never has
    // to re-enter these or repeat the import by hand. ospos_db_password is
    // encrypted at rest (server/lib/crypto.js), never stored in plain
    // text. ospos_auto_sync is the on/off switch: set to 1 on a successful
    // import, cleared (along with the credential columns) if the store
    // owner turns auto-sync off.
    `ALTER TABLE stores ADD COLUMN ospos_auto_sync INTEGER DEFAULT 0`,
    `ALTER TABLE stores ADD COLUMN ospos_db_host TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN ospos_db_port TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN ospos_db_name TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN ospos_db_user TEXT DEFAULT ''`,
    `ALTER TABLE stores ADD COLUMN ospos_db_password TEXT DEFAULT ''`,
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

  upgradeSetup: async (oldStoreId, newStoreId, newName) => {
    // This is safe because new accounts don't have FK constraint violations (products) yet
    await client.batch([
      {
        sql: "UPDATE stores SET store_id = ?, name = ? WHERE store_id = ?",
        args: [newStoreId, newName, oldStoreId],
      },
      {
        sql: "UPDATE email_send_log SET store_id = ? WHERE store_id = ?",
        args: [newStoreId, oldStoreId],
      },
    ], "write");
  },

  updateBranding: async (storeId, brandColor, currency) => {
    return await client.execute({
      sql: "UPDATE stores SET brand_color = ?, currency = ? WHERE store_id = ?",
      args: [brandColor, currency, storeId],
    });
  },

  // Changing the number always resets verification — a freshly-typed
  // number hasn't been proven to actually reach the store owner yet.
  updateWhatsappNumber: async (storeId, whatsappNumber) => {
    return await client.execute({
      sql: `UPDATE stores SET whatsapp_number = ?, whatsapp_verified = 0,
            whatsapp_verify_code = '' WHERE store_id = ?`,
      args: [whatsappNumber, storeId],
    });
  },

  markWhatsappVerified: async (storeId) => {
    return await client.execute({
      sql: `UPDATE stores SET whatsapp_verified = 1, whatsapp_verify_code = ''
            WHERE store_id = ?`,
      args: [storeId],
    });
  },

  isActive: async (storeId) => {
    const res = await client.execute({
      sql: "SELECT plan_status FROM stores WHERE store_id = ?",
      args: [storeId],
    });
    const store = res.rows[0];
    if (!store) return false;
    return store.plan_status !== "disabled";
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
        { sql: "DELETE FROM products WHERE store_id = ?", args: [storeId] },
        ...(storeEmail
          ? [{ sql: "DELETE FROM tokens WHERE email = ?", args: [storeEmail] }]
          : []),
        { sql: "DELETE FROM stores WHERE store_id = ?", args: [storeId] },
      ],
      "write",
    );

    return true;
  },

  disconnectWoo: async (storeId) => {
    return await client.execute({
      sql: `UPDATE stores SET
              woo_connected = 0,
              woo_url = '',
              woo_last_sync = '',
              woo_product_count = 0
            WHERE store_id = ?`,
      args: [storeId],
    });
  },

  // Records the result of every OSPOS import — manual (Products tab) or
  // scheduled (auto-sync) alike.
  updateOsposLastImport: async (storeId, productCount) => {
    const now = new Date().toISOString();
    return await client.execute({
      sql: `UPDATE stores SET ospos_last_sync = ?, ospos_product_count = ?
             WHERE store_id = ?`,
      args: [now, productCount, storeId],
    });
  },

  // Called once, right after a manual import succeeds, so BuildVolt can
  // reconnect on its own from then on. ospos_db_password is expected to
  // already be encrypted (server/lib/crypto.js) by the caller.
  saveOsposCredentials: async (storeId, { host, port, database, username, encryptedPassword }) => {
    return await client.execute({
      sql: `UPDATE stores SET
              ospos_auto_sync = 1,
              ospos_db_host = ?, ospos_db_port = ?, ospos_db_name = ?,
              ospos_db_user = ?, ospos_db_password = ?
            WHERE store_id = ?`,
      args: [host, String(port || ""), database, username, encryptedPassword, storeId],
    });
  },

  getOsposAutoSyncStatus: async (storeId) => {
    const res = await client.execute({
      sql: `SELECT ospos_auto_sync, ospos_last_sync, ospos_product_count, ospos_db_host
             FROM stores WHERE store_id = ?`,
      args: [storeId],
    });
    return res.rows[0] || null;
  },

  // Every store with auto-sync on, for the scheduled job — includes the
  // encrypted password so the job can decrypt-and-reconnect per store.
  getAllOsposAutoSyncStores: async () => {
    const res = await client.execute(
      `SELECT store_id, ospos_db_host, ospos_db_port, ospos_db_name,
              ospos_db_user, ospos_db_password
       FROM stores
       WHERE ospos_auto_sync = 1 AND plan_status != 'disabled'`,
    );
    return res.rows;
  },

  disableOsposAutoSync: async (storeId) => {
    return await client.execute({
      sql: `UPDATE stores SET
              ospos_auto_sync = 0,
              ospos_db_host = '', ospos_db_port = '', ospos_db_name = '',
              ospos_db_user = '', ospos_db_password = ''
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

  // Matches either the primary login email or the backup recovery email —
  // used for login and forgot-password so a lost primary inbox doesn't lock
  // the admin out, as long as they set up a recovery email in advance.
  findByLoginEmail: async (email) => {
    const res = await client.execute({
      sql: "SELECT * FROM admins WHERE email = ? OR (recovery_email != '' AND recovery_email = ?)",
      args: [email, email],
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
      sql: "UPDATE admins SET password = ? WHERE email = ? OR (recovery_email != '' AND recovery_email = ?)",
      args: [hashedPassword, email, email],
    });
  },

  updateProfile: async (id, name, email) => {
    return await client.execute({
      sql: "UPDATE admins SET name = ?, email = ? WHERE id = ?",
      args: [name, email, id],
    });
  },

  updateRecoveryEmail: async (id, recoveryEmail) => {
    return await client.execute({
      sql: "UPDATE admins SET recovery_email = ? WHERE id = ?",
      args: [recoveryEmail, id],
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

    if (!products || !products.length) return 0;

    // Use batch insertion in chunks for extreme performance
    const chunkSize = 500;
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      const stmts = chunk.map((p) => ({
        sql: `INSERT INTO products (store_id, name, category, price, description)
               VALUES (?, ?, ?, ?, ?)`,
        args: [
          storeId,
          p.name || p.Name || "",
          p.category || p.Category || "",
          parseFloat(p.price || p.Price || 0),
          p.description || p.Description || "",
        ],
      }));
      await client.batch(stmts, "write");
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

  getStats: async (storeId, days = 0) => {
    const dayNum = Number(days) || 0;
    const dateFilter =
      dayNum > 0
        ? `AND created_at >= datetime('now', '-${Math.min(dayNum, 365)} days')`
        : "";
    const dailyLimit = dayNum > 0 ? Math.min(dayNum, 365) : 7;

    const total = await client.execute({
      sql: `SELECT COUNT(*) as count FROM recommendations WHERE store_id = ? ${dateFilter}`,
      args: [storeId],
    });

    const byPurpose = await client.execute({
      sql: `SELECT purpose, COUNT(*) as count FROM recommendations
             WHERE store_id = ? ${dateFilter} GROUP BY purpose ORDER BY count DESC`,
      args: [storeId],
    });

    const avgBudget = await client.execute({
      sql: `SELECT AVG(budget) as avg FROM recommendations WHERE store_id = ? ${dateFilter}`,
      args: [storeId],
    });

    const recent = await client.execute({
      sql: `SELECT budget, purpose, extras, created_at FROM recommendations
             WHERE store_id = ? ${dateFilter} ORDER BY created_at DESC LIMIT 10`,
      args: [storeId],
    });

    const daily = await client.execute({
      sql: `SELECT date(created_at) as day, COUNT(*) as count
             FROM recommendations WHERE store_id = ? ${dateFilter}
             GROUP BY day ORDER BY day DESC LIMIT ${dailyLimit}`,
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
      // If column doesn't exist yet (pre-migration), deny access for safety.
      // Returning true here would be a security bypass.
      console.error('verifyDB.isVerified error:', e.message);
      return false;
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
      widgetTitle: row?.widget_title || "BuildVolt",
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

// ─── ORDER REQUESTS ───────────────────────────────────────
// A tamper-evident record of what a customer actually requested when they
// clicked "Order This Build" — written server-side from the store's own
// catalog at the moment of ordering, never from client-supplied prices.
// Lets a store owner cross-check a WhatsApp order message (which the
// customer could have edited before sending) against the real numbers.
const orderRequestDB = {
  create: async (storeId, build, orderMethod) => {
    const res = await client.execute({
      sql: `INSERT INTO order_requests
             (store_id, build_name, tier, parts, total_price, currency, order_method)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        storeId,
        build.buildName || "",
        build.tier || "",
        JSON.stringify(build.parts || []),
        Number(build.totalPrice) || 0,
        build.currency || "PKR",
        orderMethod || "whatsapp",
      ],
    });
    return Number(res.lastInsertRowid);
  },

  getByStore: async (storeId, limit = 100) => {
    const res = await client.execute({
      sql: `SELECT * FROM order_requests WHERE store_id = ?
             ORDER BY created_at DESC LIMIT ?`,
      args: [storeId, limit],
    });
    return res.rows.map((r) => ({ ...r, parts: JSON.parse(r.parts || "[]") }));
  },

  getById: async (id, storeId) => {
    const res = await client.execute({
      sql: "SELECT * FROM order_requests WHERE id = ? AND store_id = ?",
      args: [id, storeId],
    });
    const row = res.rows[0];
    if (!row) return null;
    return { ...row, parts: JSON.parse(row.parts || "[]") };
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
  tokenDB,
  verifyDB,
  widgetDB,
  adminDB,
  configDB,
  emailLogDB,
  supportTicketDB,
  orderRequestDB,
  pendingSignupDB,
};
