const express = require("express");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const { storeDB, productDB, client } = require("../database");
const { normalizeCategory } = require("../lib/categories");
const { encrypt, decrypt } = require("../lib/crypto");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const { JWT_SECRET } = require("../lib/secrets");

const osposLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20, // this hits a third-party database over the network, so a lower
  // ceiling than the WooCommerce/CSV endpoints is intentional
  message: { error: "Too many OSPOS import requests. Please try again later." },
});

// ─── MAP OSPOS ITEM TO BUILDVOLT FORMAT ────────────────────
// OSPOS (ospos_items table) has no separate categories table — `category`
// is a free-text column, so it goes straight through the same
// normalizeCategory() used for WooCommerce/CSV, matching it against
// BuildVolt's fixed hardware-category whitelist.
//
// Its own `description` column is only varchar(255) and, in most real
// installs, is left blank or holds a short SKU note rather than a real
// spec description — too little text for the recommendation engine's
// compatibility inference to work with. OSPOS gives every item ten
// generic, store-defined `custom1`..`custom10` fields, which retailers
// commonly use for exactly this kind of extra spec data (brand, socket,
// wattage, capacity, etc.). This builds a richer synthetic description by
// folding every non-empty custom field and the item number into the text
// blob, so both the category detector and the compatibility engine have
// meaningfully more to work with than the bare `description` column alone.
function buildEnrichedDescription(item) {
  const parts = [];
  if (item.description) parts.push(String(item.description).trim());
  if (item.item_number) parts.push(String(item.item_number).trim());
  for (let i = 1; i <= 10; i++) {
    const val = item[`custom${i}`];
    if (val !== null && val !== undefined && String(val).trim() !== "") {
      parts.push(String(val).trim());
    }
  }
  return parts.filter(Boolean).join(" ").trim();
}

function mapOsposItem(item) {
  const price = parseFloat(item.unit_price ?? item.cost_price ?? 0);
  const enrichedDescription = buildEnrichedDescription(item);
  const category = normalizeCategory(
    item.category || "",
    `${item.name || ""} ${enrichedDescription}`,
  );
  const quantity = parseFloat(item.quantity ?? 0);

  return {
    name: item.name || "Unknown Product",
    category,
    price,
    description: enrichedDescription.slice(0, 200),
    in_stock: quantity > 0 ? 1 : 0,
    ospos_item_id: item.item_id || null,
  };
}

// Full-replace strategy, identical to POST /plugin/sync's WooCommerce path
// and POST /upload's CSV path, so every catalog source behaves the same
// way from the recommendation engine's point of view.
// mode:
//   "replace" — the store owner explicitly chose, in the dashboard, to
//               replace their WHOLE catalog — deletes every row
//               regardless of source, then inserts fresh. Only ever
//               triggered by a deliberate, in-person action on the
//               Products tab (the Add-vs-Replace confirm dialog) — never
//               by anything automatic.
//   "append" / "auto" — everything else: a manual "add to existing" import,
//               and every unattended scheduled auto-sync run alike. Both
//               MERGE rather than replace: an OSPOS item already present
//               (matched by ospos_item_id) is updated in place, a new one
//               is inserted, and nothing already in the catalog — from
//               OSPOS or any other source — is ever deleted. This is what
//               makes auto-sync safe to run unattended every few hours: it
//               can only add or refresh, never wipe.
async function syncItemsForStore(storeId, items, mode = "replace") {
  // Only "replace"/"append" — a manual, dashboard-initiated import — set
  // the undo point. "auto" is the unattended scheduled auto-sync job (see
  // pullAllAutoSyncStores below); it must never touch the undo slot, or a
  // background sync could silently overwrite an undo point the store owner
  // was still relying on for something they actually did on purpose.
  if (mode !== "auto") {
    await productDB.saveBackup(
      storeId,
      mode === "replace" ? "Before OSPOS import replaced your catalog" : "Before OSPOS import added products",
    );
  }
  if (mode === "replace") {
    await client.execute({
      sql: "DELETE FROM products WHERE store_id = ?",
      args: [storeId],
    });
  }

  let synced = 0;
  let skipped = 0;
  let skippedCategory = 0;

  for (const rawItem of items) {
    const p = mapOsposItem(rawItem);

    if (p.price <= 0) {
      skipped++;
      continue;
    }
    if (!p.name || p.name === "Unknown Product") {
      skipped++;
      continue;
    }
    if (!p.category) {
      // Doesn't match any PC-build category BuildVolt understands — skip
      // rather than store a category the recommendation engine can never use.
      skippedCategory++;
      continue;
    }

    let existingId = null;
    if (mode !== "replace" && p.ospos_item_id) {
      const existing = await client.execute({
        sql: "SELECT id FROM products WHERE store_id = ? AND ospos_item_id = ? AND source = 'ospos'",
        args: [storeId, p.ospos_item_id],
      });
      existingId = existing.rows[0]?.id ?? null;
    }

    if (existingId) {
      await client.execute({
        sql: `UPDATE products SET name=?, category=?, price=?, description=?, in_stock=?
               WHERE id=?`,
        args: [p.name, p.category, p.price, p.description, p.in_stock, existingId],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO products (store_id, name, category, price, description, in_stock, ospos_item_id, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'ospos')`,
        args: [
          storeId,
          p.name,
          p.category,
          p.price,
          p.description,
          p.in_stock,
          p.ospos_item_id,
        ],
      });
    }
    synced++;
  }

  await storeDB.updateOsposLastImport(storeId, synced);
  await client.execute({
    sql: "UPDATE stores SET widget_enabled = 1 WHERE store_id = ?",
    args: [storeId],
  });
  await storeDB.touchCatalog(storeId);

  return { synced, skipped, skippedCategory };
}

// ospos_item_quantities holds one row per (item, stock location); stock is
// summed across every location. deleted = 0 excludes soft-deleted items.
// This is OSPOS's own official install schema (ospos_items / ospos_item_
// quantities), verified directly against opensourcepos/opensourcepos on
// GitHub — OSPOS has no REST API to call instead (there is no Api
// controller in its codebase, and a request for one, issue #2463, has
// been open, unresolved, since 2019), so a direct, read-only database
// query is the only integration point available.
const ITEMS_QUERY = `
  SELECT
      i.item_id, i.name, i.category, i.description, i.item_number,
      i.unit_price, i.cost_price,
      i.custom1, i.custom2, i.custom3, i.custom4, i.custom5,
      i.custom6, i.custom7, i.custom8, i.custom9, i.custom10,
      COALESCE(SUM(q.quantity), 0) AS quantity
  FROM ospos_items i
  LEFT JOIN ospos_item_quantities q ON q.item_id = i.item_id
  WHERE i.deleted = 0
  GROUP BY i.item_id
`;

// Shared by the interactive import and the scheduled auto-sync job: open a
// connection, read every item, close the connection — always, even on
// failure, so a bad password never leaks a lingering open connection to a
// third party's database.
async function connectReadAndClose({ host, port, database, username, password }) {
  const connection = await mysql.createConnection({
    host,
    port: port ? Number(port) : 3306,
    database,
    user: username,
    password: password || "",
    connectTimeout: 10000,
    // OSPOS itself connects over plain MySQL by default; not forcing SSL
    // here matches that, and most small shared-hosting MySQL instances
    // don't have a certificate configured for it anyway.
  });
  try {
    const [rows] = await connection.query(ITEMS_QUERY);
    return rows;
  } finally {
    await connection.end().catch(() => {});
  }
}

// ─── ONE-CLICK IMPORT (dashboard-authenticated) ────────────
// Connect, read, map, save, respond — all in this one request, exactly
// like POST /upload for a CSV file. On success this ALSO saves the
// (encrypted) credentials so BuildVolt can reconnect on its own later —
// see pullAllAutoSyncStores() below — so the store owner only ever does
// this once; every later OSPOS change reaches the dashboard automatically
// without them repeating the import.
router.post("/ospos/import", osposLimiter, async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const store = await storeDB.findById(decoded.storeId);
  if (!store) return res.status(404).json({ error: "Store not found" });
  if (store.data_source !== "ospos") {
    return res.status(403).json({
      success: false,
      error: "Switch your data source to OSPOS in Products first, then import.",
    });
  }

  const { host, port, database, username, password } = req.body || {};
  const mode = req.body?.mode === "append" ? "append" : "replace";
  if (!host || !database || !username) {
    return res.status(400).json({
      success: false,
      error: "Host, database name, and username are required.",
    });
  }

  let rows;
  try {
    rows = await connectReadAndClose({ host, port, database, username, password });
  } catch (err) {
    return res.status(200).json({
      success: false,
      error: `Could not connect to that database: ${err.message}. If this is shared hosting, make sure "Remote MySQL" access is enabled for this database and the host allows external connections.`,
    });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(200).json({
      success: false,
      error: "Connected successfully, but found no active items in ospos_items. Is this the right database?",
    });
  }

  try {
    const result = await syncItemsForStore(decoded.storeId, rows, mode);
    await storeDB.saveOsposCredentials(decoded.storeId, {
      host,
      port,
      database,
      username,
      encryptedPassword: encrypt(password || ""),
    });
    res.json({
      success: true,
      message: `${result.synced} product${result.synced === 1 ? "" : "s"} imported from OSPOS. BuildVolt will keep this in sync automatically from now on.`,
      autoSyncEnabled: true,
      ...result,
    });
  } catch (err) {
    console.error("OSPOS import error:", err);
    res.status(200).json({
      success: false,
      error: `Connected, but the import failed: ${err.message}`,
    });
  }
});

// ─── AUTO-SYNC STATUS (dashboard-authenticated) ────────────
// Never returns the stored password — only enough to show a status line
// ("Auto-sync ON, last synced 2 hours ago, host db.example.com").
router.get("/ospos/auto-sync-status", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const info = await storeDB.getOsposAutoSyncStatus(decoded.storeId);
    if (!info) return res.status(404).json({ error: "Store not found" });

    res.json({
      success: true,
      enabled: info.ospos_auto_sync === 1,
      lastSync: info.ospos_last_sync || null,
      productCount: info.ospos_product_count || 0,
      host: info.ospos_db_host || "",
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ─── STOP AUTO-SYNC (dashboard-authenticated) ──────────────
// Forgets the stored credentials entirely (not just a flag flip) — the
// store owner has to re-import to turn it back on, which is deliberate:
// there's no reason for BuildVolt to keep holding a database password it
// isn't allowed to use anymore.
router.post("/ospos/auto-sync-disable", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await storeDB.disableOsposAutoSync(decoded.storeId);
    res.json({ success: true, message: "OSPOS auto-sync turned off." });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ─── SCHEDULED AUTO-SYNC (called from server/index.js) ─────
// Runs for every store that has ever completed a manual import (and not
// since turned auto-sync off). One store's failure — wrong password since
// changed, host unreachable, OSPOS database moved — is logged and
// skipped, never blocks the others.
async function pullAllAutoSyncStores() {
  const stores = await storeDB.getAllOsposAutoSyncStores();
  const results = [];
  for (const store of stores) {
    try {
      const rows = await connectReadAndClose({
        host: store.ospos_db_host,
        port: store.ospos_db_port,
        database: store.ospos_db_name,
        username: store.ospos_db_user,
        password: decrypt(store.ospos_db_password),
      });
      const result = await syncItemsForStore(store.store_id, rows, "auto");
      results.push({ storeId: store.store_id, ok: true, ...result });
    } catch (err) {
      console.error(`OSPOS auto-sync failed for store ${store.store_id}:`, err.message);
      results.push({ storeId: store.store_id, ok: false, error: err.message });
    }
  }
  return results;
}

module.exports = router;
module.exports.pullAllAutoSyncStores = pullAllAutoSyncStores;
