const express = require("express");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const { storeDB, client } = require("../database");
const { normalizeCategory } = require("../lib/categories");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "buildbot-secret";

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
async function syncItemsForStore(storeId, items) {
  await client.execute({
    sql: "DELETE FROM products WHERE store_id = ?",
    args: [storeId],
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
        storeId,
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

// ─── ONE-CLICK IMPORT (dashboard-authenticated) ────────────
// Everything happens in this single request, exactly like POST /upload
// for a CSV file: connect, read, map, save, respond with a result — no
// separate "connect" step, nothing to configure beforehand, nothing
// persisted afterwards. The store owner enters their OSPOS database's
// connection details directly in the Products tab; BuildVolt never
// stores that password anywhere — the connection exists only for the
// duration of this request, then is always closed.
router.post("/ospos/import", osposLimiter, async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { host, port, database, username, password } = req.body || {};
  if (!host || !database || !username) {
    return res.status(400).json({
      success: false,
      error: "Host, database name, and username are required.",
    });
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port: port ? Number(port) : 3306,
      database,
      user: username,
      password: password || "",
      connectTimeout: 10000,
      // OSPOS itself connects over plain MySQL by default; not forcing
      // SSL here matches that, and most small shared-hosting MySQL
      // instances don't have a certificate configured for it anyway.
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      error: `Could not connect to that database: ${err.message}. If this is shared hosting, make sure "Remote MySQL" access is enabled for this database and the host allows external connections.`,
    });
  }

  try {
    const [rows] = await connection.query(ITEMS_QUERY);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(200).json({
        success: false,
        error: "Connected successfully, but found no active items in ospos_items. Is this the right database?",
      });
    }

    const result = await syncItemsForStore(decoded.storeId, rows);
    res.json({
      success: true,
      message: `${result.synced} product${result.synced === 1 ? "" : "s"} imported from OSPOS.`,
      ...result,
    });
  } catch (err) {
    console.error("OSPOS import error:", err);
    res.status(200).json({
      success: false,
      error: `Connected, but the import failed: ${err.message}`,
    });
  } finally {
    await connection.end().catch(() => {});
  }
});

module.exports = router;
