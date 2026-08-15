const express = require("express");
const crypto = require("crypto");
const { storeDB, productDB, client } = require("../database");
const jwt = require("jsonwebtoken");
const { normalizeWooUrl } = require("../lib/woo");
const { normalizeCategory } = require("../lib/categories");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const { JWT_SECRET } = require("../lib/secrets");

const pluginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // max 100 sync/update requests per 15 mins per store
  message: { error: "Too many plugin requests. Please try again later." },
});

// ─── AUTHENTICATE PLUGIN REQUEST ──────────────────────────
async function authenticatePlugin(req, res) {
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

// A brand-new store (data source never confirmed) doing anything through
// the plugin — full sync, or a single product's real-time update — is, in
// practice, choosing WooCommerce as its source. Without this, a fresh
// install's first sync (or even its first single-product edit, if that
// happens to fire before "Sync Now" is ever clicked) silently wrote zero
// products, because nothing upstream of the data-source guard in each
// handler ever actually set it to "woo". Once a source HAS been
// confirmed, this must never auto-switch it back — a store deliberately
// using the dashboard instead must never have its catalog silently
// overwritten just because the plugin stays connected for
// widget delivery (see EmbedTab's pluginBringsOwnData on the dashboard
// side). Mutates the passed-in store object so callers can immediately
// continue using store.data_source.
async function ensureWooChosenOnFirstConnect(store) {
  if (store.data_source_confirmed) return;
  await storeDB.setDataSource(store.store_id, "woo");
  store.data_source = "woo";
  store.data_source_confirmed = 1;
}

async function validateWooSiteBinding(store, storeUrl, res) {
  const incoming = normalizeWooUrl(storeUrl);
  if (!incoming) return true;

  const bound = normalizeWooUrl(store.woo_url);
  if (store.woo_connected && bound && bound !== incoming) {
    const note = `Blocked connection from ${incoming} — credentials bound to ${bound}`;
    await storeDB.flagConnectionAbuse(store.store_id, note);
    res.status(403).json({
      success: false,
      error:
        "These credentials are already linked to a different website. Disconnect from the original site first, or contact BuildVolt support.",
      abuseFlagged: true,
    });
    return false;
  }

  return true;
}

// ─── MAP WOOCOMMERCE PRODUCT TO BUILDVOLT FORMAT ──────────
// Uses the same canonical category detection as CSV/file upload
// (server/lib/categories.js) so a WooCommerce-synced catalog and an
// uploaded catalog land in identical categories — category is null when
// nothing matches, and the sync/update routes skip those products rather
// than storing a category the recommendation engine doesn't recognize.
// Picks the first candidate that parses to a real positive number — plain
// `||` chaining breaks on an explicit "0" sale price, because the STRING
// "0" is JS-truthy (unlike PHP, where the plugin's own `?:` correctly
// treats "0" as falsy and falls through to regular_price). That mismatch
// meant a product on a $0.00 sale — a real, if unusual, WooCommerce state
// (e.g. leftover from clearing a promotion) — priced as free here and got
// silently dropped by the price<=0 check below, while the PHP side had
// already decided it had a valid price and sent it.
function firstPositivePrice(...candidates) {
  for (const c of candidates) {
    const n = parseFloat(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function mapProduct(wooProduct) {
  const price = firstPositivePrice(wooProduct.sale_price, wooProduct.regular_price, wooProduct.price);

  const description = (
    wooProduct.short_description ||
    wooProduct.description ||
    ""
  )
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 200);

  // Join every WooCommerce category, not just the first one — a product's
  // first category is often a generic/marketing tag ("Uncategorized",
  // "Featured") with the actual part-type category listed second or
  // third, and detectCategory() does substring matching so joining is
  // enough to let any of them match.
  const wooCategoryNames = (wooProduct.categories || [])
    .map((c) => c?.name || "")
    .filter(Boolean)
    .join(" ");
  const category = normalizeCategory(wooCategoryNames, wooProduct.name || "");

  return {
    name: wooProduct.name || "Unknown Product",
    category,
    price,
    description,
    in_stock: wooProduct.stock_status === "instock" ? 1 : 0,
    woo_id: wooProduct.id || null,
  };
}

// ─── GENERATE SECRET KEY ──────────────────────────────────
router.post("/plugin/generate-key", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const info = await storeDB.getPluginKey(decoded.storeId);
    if (!info) return res.status(404).json({ error: "Store not found" });

    if (info.woo_connected === 1) {
      return res.status(400).json({
        error:
          "Cannot generate a new key while WooCommerce is connected. Disconnect first to avoid breaking your live connection.",
        wooConnected: true,
      });
    }

    const secret = "bv_live_" + crypto.randomBytes(16).toString("hex");
    await storeDB.updatePluginKey(decoded.storeId, secret);
    res.json({ success: true, secret });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ─── GET PLUGIN STATUS ────────────────────────────────────
router.get("/plugin/status", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, JWT_SECRET);
    const info = await storeDB.getPluginKey(decoded.storeId);

    if (!info) return res.status(404).json({ error: "Store not found" });

    const maskedSecret = info.plugin_secret
      ? `${info.plugin_secret.slice(0, 10)}…${info.plugin_secret.slice(-4)}`
      : null;

    res.json({
      success: true,
      storeId: decoded.storeId,
      hasKey: !!info.plugin_secret,
      secret: info.plugin_secret || null,
      maskedSecret,
      wooConnected: info.woo_connected === 1,
      wooUrl: info.woo_url || "",
      lastSync: info.woo_last_sync || null,
      productCount: info.woo_product_count || 0,
      widgetEnabled: info.widget_enabled !== 0,
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ─── SYNC NOW (dashboard-authenticated) ────────────────────
// The dashboard has no way to pull from WooCommerce directly — the plugin
// pushes data OUT to BuildVolt, never the other way round, so BuildVolt
// can never reach into an arbitrary customer site's database. Instead
// this asks the SITE ITSELF to sync right now: an outbound call to a REST
// route the plugin exposes (see buildvolt_rest_trigger_sync in the
// plugin), authenticated with the same secret used for every other
// exchange. store.woo_url is only ever set by the plugin's own prior
// sync calls (never client-supplied here), so this never reaches an
// address the store owner didn't already prove they control.
router.post("/plugin/sync-now-trigger", pluginLimiter, async (req, res) => {
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
  if (!store.woo_connected || !store.woo_url || !store.plugin_secret) {
    return res.status(400).json({
      success: false,
      error: "The WordPress plugin isn't connected yet — connect it in Install Widget (Step 3) first.",
    });
  }

  try {
    const target = `${store.woo_url.replace(/\/$/, "")}/wp-json/buildvolt/v1/trigger-sync`;
    const response = await fetch(target, {
      method: "POST",
      headers: { "X-BuildVolt-Secret": store.plugin_secret },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return res.json({
        success: false,
        error: `Your WordPress site didn't confirm the sync (HTTP ${response.status}). Make sure the BuildVolt plugin is updated to the latest version.`,
      });
    }

    const data = await response.json().catch(() => ({}));
    res.json({
      success: true,
      message:
        typeof data.synced === "number"
          ? `${data.synced} product${data.synced === 1 ? "" : "s"} synced from WordPress just now.`
          : "Sync triggered on your WordPress site.",
      synced: typeof data.synced === "number" ? data.synced : undefined,
    });
  } catch (err) {
    res.json({
      success: false,
      error: `Could not reach your WordPress site: ${err.message}. Make sure it's online and the BuildVolt plugin is active and up to date.`,
    });
  }
});

// ─── DISCONNECT WOOCOMMERCE (dashboard-authenticated) ─────
router.post("/plugin/disconnect", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await storeDB.disconnectWoo(decoded.storeId);
    res.json({ success: true, message: "WooCommerce disconnected." });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ─── DISCONNECT (WordPress plugin — credential auth) ──────
router.post("/plugin/remote-disconnect", async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  try {
    await storeDB.disconnectWoo(store.store_id);
    res.json({ success: true, message: "WooCommerce disconnected on BuildVolt." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CONNECTION STATUS (WordPress plugin poll) ─────────────
router.post("/plugin/connection-status", async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  res.json({
    success: true,
    wooConnected: store.woo_connected === 1,
    widgetEnabled: store.widget_enabled !== 0,
    storeName: store.name,
    wooUrl: store.woo_url || "",
  });
});

// ─── TOGGLE WIDGET (enable/disable from plugin) ───────────
router.post("/plugin/widget-toggle", async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  const { enabled } = req.body;

  try {
    await client.execute({
      sql: "UPDATE stores SET widget_enabled = ? WHERE store_id = ?",
      args: [enabled ? 1 : 0, store.store_id],
    });

    res.json({
      success: true,
      enabled,
      message: enabled ? "Widget enabled!" : "Widget disabled!",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/plugin/sync", pluginLimiter, async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  const { products, storeUrl } = req.body;

  if (!products || !Array.isArray(products)) {
    return res
      .status(400)
      .json({ success: false, error: "products array is required" });
  }

  if (!(await validateWooSiteBinding(store, storeUrl, res))) return;

  await ensureWooChosenOnFirstConnect(store);

  // The plugin connection itself is what delivers the widget, so it stays
  // authenticated and this call still succeeds either way — but only
  // actually writes products into the catalog when WooCommerce is the
  // store's chosen data source. A store using the dashboard instead must
  // never have its catalog silently overwritten by the
  // plugin's own unattended 6-hourly cron sync just because the plugin
  // happens to still be connected for widget delivery.
  if (store.data_source !== "woo") {
    return res.json({
      success: true,
      message: "Skipped — this store's data source isn't set to WooCommerce.",
      synced: 0,
      skipped: 0,
      skippedCategory: 0,
    });
  }

  try {
    // Scoped to source='woo' rather than a blanket delete: this endpoint
    // is called both for the initial connection AND every unattended
    // 6-hourly WP-Cron sync (buildvolt_full_sync in the plugin), so it
    // must never wipe out products the store owner separately added
    // manually or via CSV — only refresh WooCommerce's own
    // previously-synced rows.
    await client.execute({
      sql: "DELETE FROM products WHERE store_id = ? AND source = 'woo'",
      args: [store.store_id],
    });

    let synced = 0;
    let skipped = 0;
    let skippedCategory = 0;

    for (const wooProduct of products) {
      const p = mapProduct(wooProduct);

      if (p.price <= 0) {
        skipped++;
        continue;
      }
      if (!p.name || p.name === "Unknown Product") {
        skipped++;
        continue;
      }
      if (!p.category) {
        // Doesn't match any PC-build category BuildVolt understands
        // (e.g. monitors, peripherals, cables) — skip rather than store
        // a category the recommendation engine can never use.
        skippedCategory++;
        continue;
      }

      await client.execute({
        sql: `INSERT INTO products (store_id, name, category, price, description, in_stock, woo_id, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'woo')`,
        args: [
          store.store_id,
          p.name,
          p.category,
          p.price,
          p.description,
          p.in_stock,
          p.woo_id,
        ],
      });
      synced++;
    }

    await storeDB.updateWooStatus(store.store_id, storeUrl || "", synced);
    await client.execute({
      sql: "UPDATE stores SET widget_enabled = 1 WHERE store_id = ?",
      args: [store.store_id],
    });
    await storeDB.touchCatalog(store.store_id);

    res.json({
      success: true,
      message: `${synced} products synced successfully!`,
      synced,
      skipped,
      skippedCategory,
    });
  } catch (err) {
    console.error("Plugin sync error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/plugin/product/update", pluginLimiter, async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  await ensureWooChosenOnFirstConnect(store);

  // See the matching check in /plugin/sync above — this fires on every
  // WooCommerce product save while the plugin is connected, regardless of
  // data source, so it must stay a no-op unless WooCommerce is actually
  // the store's chosen source.
  if (store.data_source !== "woo") {
    return res.json({ success: true, message: "Skipped — this store's data source isn't set to WooCommerce." });
  }

  const { product } = req.body;
  if (!product) return res.status(400).json({ error: "product is required" });

  try {
    const p = mapProduct(product);
    if (p.price <= 0)
      return res.json({ success: true, message: "Skipped (no price)" });
    if (!p.category)
      return res.json({
        success: true,
        message: "Skipped (not a PC-build category BuildVolt recognizes)",
      });

    let existing;
    if (p.woo_id) {
      existing = await client.execute({
        sql: "SELECT id FROM products WHERE store_id = ? AND woo_id = ?",
        args: [store.store_id, p.woo_id],
      });
    }

    // Fallback to matching by name if woo_id not found (for backwards
    // compatibility) — scoped to source='woo' so this can never match (and
    // silently overwrite) a manually-added or CSV-uploaded product that
    // happens to share the same name. Only trusted when it matches exactly
    // one row: two distinct WooCommerce products can share an identical
    // name (duplicated-then-renamed products, common with "Duplicate"
    // plugins), and picking rows[0] in that case would silently reassign
    // an unrelated product's row to whichever one synced first — safer to
    // fall through and insert a new row than guess wrong.
    if (!existing || existing.rows.length === 0) {
      const byName = await client.execute({
        sql: "SELECT id FROM products WHERE store_id = ? AND name = ? AND source = 'woo'",
        args: [store.store_id, p.name],
      });
      if (byName.rows.length === 1) existing = byName;
    }

    if (existing && existing.rows.length > 0) {
      await client.execute({
        sql: `UPDATE products SET name=?, category=?, price=?, description=?, in_stock=?, woo_id=?, source='woo'
               WHERE id=?`,
        args: [
          p.name,
          p.category,
          p.price,
          p.description,
          p.in_stock,
          p.woo_id,
          existing.rows[0].id,
        ],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO products (store_id, name, category, price, description, in_stock, woo_id, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'woo')`,
        args: [
          store.store_id,
          p.name,
          p.category,
          p.price,
          p.description,
          p.in_stock,
          p.woo_id,
        ],
      });
    }

    await client.execute({
      sql: "UPDATE stores SET woo_last_sync = ? WHERE store_id = ?",
      args: [new Date().toISOString(), store.store_id],
    });
    await storeDB.touchCatalog(store.store_id);

    res.json({ success: true, message: "Product updated!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE SINGLE PRODUCT ────────────────────────────────
router.post("/plugin/product/delete", pluginLimiter, async (req, res) => {
  const store = await authenticatePlugin(req, res);
  if (!store) return;

  await ensureWooChosenOnFirstConnect(store);

  // See the matching check in /plugin/sync above.
  if (store.data_source !== "woo") {
    return res.json({ success: true, message: "Skipped — this store's data source isn't set to WooCommerce." });
  }

  const { productName, wooId } = req.body;
  if (!productName && !wooId)
    return res.status(400).json({ error: "productName or wooId is required" });

  try {
    if (wooId) {
      await client.execute({
        sql: "DELETE FROM products WHERE store_id = ? AND woo_id = ?",
        args: [store.store_id, wooId],
      });
    } else {
      // Scoped to source='woo' — a name-only match must never delete a
      // manually-added or CSV-uploaded product that happens to share the
      // trashed WooCommerce product's name.
      await client.execute({
        sql: "DELETE FROM products WHERE store_id = ? AND name = ? AND source = 'woo'",
        args: [store.store_id, productName],
      });
    }
    await storeDB.touchCatalog(store.store_id);
    res.json({ success: true, message: "Product removed!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PING ─────────────────────────────────────────────────
router.post("/plugin/ping", async (req, res) => {
  try {
    const store = await authenticatePlugin(req, res);
    if (!store) return;

    const storeUrl = req.body?.storeUrl || req.headers["x-buildvolt-woo-url"] || "";
    if (storeUrl && !(await validateWooSiteBinding(store, storeUrl, res))) return;

    res.json({
      success: true,
      message: "Connected successfully!",
      storeName: store.name,
      storeId: store.store_id,
      wooConnected: store.woo_connected === 1,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET WIDGET CONFIG (called by plugin to check if enabled)
router.get("/plugin/widget-config/:storeId", async (req, res) => {
  try {
    const store = await storeDB.findById(req.params.storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });

    res.json({
      success: true,
      widgetEnabled: store.widget_enabled !== 0,
      brandColor: store.brand_color || "#7c6af7",
      currency: store.currency || "PKR",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
