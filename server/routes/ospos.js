const express = require("express");
const jwt = require("jsonwebtoken");
const { storeDB, client } = require("../database");
const { normalizeCategory } = require("../lib/categories");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "buildbot-secret";

const osposLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // same ceiling as the WooCommerce plugin sync endpoints
  message: { error: "Too many OSPOS sync requests. Please try again later." },
});

// ─── AUTHENTICATE CONNECTOR REQUEST (credential-auth push path) ───
// Same shared-secret scheme as server/routes/plugin.js (X-BuildVolt-Store-ID
// / X-BuildVolt-Secret) — a store has exactly one plugin_secret regardless
// of which catalog connector authenticates with it. Kept as a local copy
// rather than importing from plugin.js so a change to one connector's auth
// requirements can't accidentally affect the other.
async function authenticateConnector(req, res) {
  const storeId = req.headers["x-buildvolt-store-id"];
  const secret = req.headers["x-buildvolt-secret"];

  if (!storeId || !secret) {
    res
      .status(401)
      .json({ success: false, error: "Missing Store ID or Secret Key" });
    return null;
  }

  const store = await storeDB.findByPluginSecret(storeId, secret);
  if (!store) {
    res
      .status(401)
      .json({ success: false, error: "Invalid Store ID or Secret Key" });
    return null;
  }

  const active = await storeDB.isActive(store.store_id);
  if (!active) {
    res.status(403).json({
      success: false,
      error: "This store account has been disabled.",
    });
    return null;
  }

  return store;
}

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

// ─── SHARED SYNC LOGIC ──────────────────────────────────────
// Full-replace strategy, identical to POST /plugin/sync's WooCommerce
// path, so every catalog source behaves the same way from the
// recommendation engine's point of view. Called from two places:
//   1. POST /ospos/sync below, when a store owner runs the standalone
//      push-based connector script (ospos-connector/ospos-buildvolt-sync.php).
//   2. pullStoreFromExportUrl(), BuildVolt's own scheduled puller, when a
//      store owner instead just uploads the single self-contained
//      buildvolt-export.php file to their OSPOS server.
async function syncItemsForStore(store, items) {
  await client.execute({
    sql: "DELETE FROM products WHERE store_id = ?",
    args: [store.store_id],
  });

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

    await client.execute({
      sql: `INSERT INTO products (store_id, name, category, price, description, in_stock, ospos_item_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        store.store_id,
        p.name,
        p.category,
        p.price,
        p.description,
        p.in_stock,
        p.ospos_item_id,
      ],
    });
    synced++;
  }

  await storeDB.updateOsposStatus(store.store_id, synced);
  await client.execute({
    sql: "UPDATE stores SET widget_enabled = 1 WHERE store_id = ?",
    args: [store.store_id],
  });
  await storeDB.touchCatalog(store.store_id);

  return { synced, skipped, skippedCategory };
}

// ─── FULL CATALOG SYNC (push path — connector script, credential auth) ───
router.post("/ospos/sync", osposLimiter, async (req, res) => {
  const store = await authenticateConnector(req, res);
  if (!store) return;

  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res
      .status(400)
      .json({ success: false, error: "items array is required" });
  }

  try {
    const result = await syncItemsForStore(store, items);
    res.json({
      success: true,
      message: `${result.synced} products synced successfully!`,
      ...result,
    });
  } catch (err) {
    console.error("OSPOS sync error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PULL PATH — BuildVolt calls the store's own export URL ───
// This is what makes the "just upload one file, tell us the URL" setup
// possible: a store owner never has to run a script or set up cron
// themselves — BuildVolt's own scheduled job (server/index.js) calls this
// for every store with ospos_export_url configured. The store's existing
// plugin_secret doubles as the ?key= value the export file checks, so
// there is nothing new to generate or keep in sync.
async function pullStoreFromExportUrl(store) {
  const url = new URL(store.ospos_export_url);
  url.searchParams.set("key", store.plugin_secret);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`Export endpoint returned HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!data || !Array.isArray(data.items)) {
    throw new Error(
      data?.error || "Export endpoint did not return an items array",
    );
  }
  return syncItemsForStore(store, data.items);
}

// Runs on a schedule from server/index.js (see the OSPOS pull cron block).
// Every store with a configured export URL is pulled independently — one
// store's failure (unreachable site, wrong key, DB error on their end)
// is logged and skipped, never blocks the others.
async function pullAllStores() {
  const res = await client.execute(
    "SELECT * FROM stores WHERE ospos_export_url IS NOT NULL AND ospos_export_url != '' AND plan_status != 'disabled'",
  );
  const results = [];
  for (const store of res.rows) {
    try {
      const result = await pullStoreFromExportUrl(store);
      results.push({ storeId: store.store_id, ok: true, ...result });
    } catch (err) {
      console.error(`OSPOS pull failed for store ${store.store_id}:`, err.message);
      results.push({ storeId: store.store_id, ok: false, error: err.message });
    }
  }
  return results;
}

// ─── CONFIGURE EXPORT URL (dashboard-authenticated) ────────
// The one thing a store owner actually has to do in BuildVolt itself:
// paste the URL where they uploaded buildvolt-export.php on their OSPOS
// server. Everything else (scheduling, auth, mapping) is automatic.
//
// Deliberately pulls immediately after saving, in the same request, rather
// than only saving the URL for the next scheduled run — this is what makes
// "Save & connect" behave like the CSV upload button (one click, one
// request, the listing is on screen straight after) instead of leaving the
// store owner staring at "Not Connected" until the next cron cycle.
router.post("/ospos/configure", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  const { exportUrl } = req.body;
  if (!exportUrl || typeof exportUrl !== "string") {
    return res.status(400).json({ error: "exportUrl is required" });
  }
  try {
    // eslint-disable-next-line no-new
    new URL(exportUrl);
  } catch {
    return res.status(400).json({ error: "exportUrl is not a valid URL" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Saved before attempting the pull (and kept even if the pull below
  // fails) so a wrong key/URL on the first try doesn't force retyping the
  // URL — "Sync now" can just be retried once the file is fixed.
  await storeDB.updateOsposExportUrl(decoded.storeId, exportUrl);

  try {
    const store = await storeDB.findById(decoded.storeId);
    const result = await pullStoreFromExportUrl({ ...store, ospos_export_url: exportUrl });
    res.json({
      success: true,
      message: `Connected! ${result.synced} product${result.synced === 1 ? "" : "s"} pulled from OSPOS.`,
      ...result,
    });
  } catch (err) {
    res.status(200).json({
      success: false,
      urlSaved: true,
      error: `Saved the URL, but the first sync failed: ${err.message}. Double-check the file was uploaded and the key matches, then try "Sync now".`,
    });
  }
});

// Lets a store owner trigger an immediate pull from the dashboard instead
// of waiting for the next scheduled run (useful right after setup, to
// confirm everything is wired up correctly).
router.post("/ospos/pull-now", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const info = await storeDB.getOsposStatus(decoded.storeId);
    if (!info) return res.status(404).json({ error: "Store not found" });
    if (!info.ospos_export_url) {
      return res.status(400).json({ error: "No OSPOS export URL configured yet." });
    }
    const store = await storeDB.findById(decoded.storeId);
    const result = await pullStoreFromExportUrl(store);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── CONNECTION TEST (push-path connector script) ──────────
router.post("/ospos/ping", async (req, res) => {
  const store = await authenticateConnector(req, res);
  if (!store) return;

  res.json({
    success: true,
    message: "Connected successfully!",
    storeName: store.name,
    storeId: store.store_id,
    osposConnected: store.ospos_connected === 1,
  });
});

// ─── STATUS (dashboard-authenticated) ──────────────────────
router.get("/ospos/status", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const info = await storeDB.getOsposStatus(decoded.storeId);
    if (!info) return res.status(404).json({ error: "Store not found" });

    res.json({
      success: true,
      hasKey: !!info.plugin_secret,
      osposConnected: info.ospos_connected === 1,
      exportUrl: info.ospos_export_url || "",
      lastSync: info.ospos_last_sync || null,
      productCount: info.ospos_product_count || 0,
      widgetEnabled: info.widget_enabled !== 0,
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ─── DISCONNECT (dashboard-authenticated) ──────────────────
router.post("/ospos/disconnect", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await storeDB.disconnectOspos(decoded.storeId);
    res.json({ success: true, message: "OSPOS disconnected." });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
module.exports.pullAllStores = pullAllStores;
