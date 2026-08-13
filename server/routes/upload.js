const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const path = require("path");
const { Readable } = require("stream");
const { productDB, storeDB, client } = require("../database");
const { authMiddleware } = require("./auth");
const rateLimit = require("express-rate-limit");
const {
  CANONICAL_CATEGORIES,
  normalizeCategory,
  detectCategory,
} = require("../lib/categories");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many uploads. Please try again later." },
});

// ─── Content-sniffing fallback ─────────────────────────────────────
// Some store files have unhelpful headers (col1/col2/col3/...) or don't
// even keep the same column order from row to row (price first on one
// line, name first on the next). When header-name matching comes up
// short, this recovers name/category/price/description by looking at
// what each cell's VALUE actually looks like instead of its position.

const PRICE_PATTERNS = [
  /^(rs\.?|pkr)\s?[\d,]+(\.\d+)?\s?\/?-?$/i, // "Rs 8,500", "PKR22000"
  /^\d[\d,]*(\.\d+)?\s?\/-$/, // "20000/-"
  /^\d+(\.\d+)?k$/i, // "18k", "3k"
  /^approx\.?\s?\d[\d,]*(\.\d+)?$/i, // "approx 5000"
  /^[^\w\s]{1,3}\d[\d,]*(\.\d+)?$/, // mangled currency symbol + digits
  /^\d[\d,]*(\.\d+)?$/, // bare number — safe since model numbers always mix letters in
];

// Common openers for marketing-style blurbs, used to tell a description
// cell apart from a name cell when length alone is ambiguous.
const DESCRIPTION_OPENERS =
  /^(known for being|this one offers|a solid pick|good option|users say|trustworthy|high value|basic|affordable|economical|dependable|solid|popular|cheap|low-cost|low cost|starter grade|beginner friendly|compact|colorful|reliable|premium)\b/i;

function looksLikePrice(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return PRICE_PATTERNS.some((re) => re.test(t));
}

function parsePriceValue(text) {
  const t = String(text || "").trim();
  // Match the first genuine digit run instead of stripping non-digit
  // characters — a blanket strip would keep the period in "Rs." (it's a
  // dot, same as a decimal separator) and misread "Rs. 9000" as 0.9.
  const match = t.match(/\d[\d,]*(\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return /k$/i.test(t) ? n * 1000 : n;
}

// Best-effort reconstruction of {name, category, price, description} from
// a row's raw cell values, ignoring whatever column position/header they
// came from. Returns null when there isn't enough to work with.
function sniffRowFromValues(values) {
  const cells = (values || [])
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  if (cells.length < 2) return null;

  const priceIdx = cells.findIndex((c) => looksLikePrice(c));
  const withoutPrice = cells
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => i !== priceIdx);

  // The category cell is almost always short (1-3 words, e.g. "CPU",
  // "Mobo", "Video Card") and never contains a digit — prefer the
  // SHORTEST matching candidate, since a product name like "Intel Core
  // i3-10100F" can also contain a category keyword ("intel core") but is
  // both longer and has a model number, unlike a real category label.
  let categoryIdx = -1;
  let category = null;
  let bestWordCount = Infinity;
  withoutPrice.forEach(({ c, i }) => {
    const wordCount = c.split(/\s+/).length;
    if (wordCount > 3 || /\d/.test(c)) return;
    const guess = detectCategory(c);
    if (guess && wordCount < bestWordCount) {
      categoryIdx = i;
      category = guess;
      bestWordCount = wordCount;
    }
  });

  const leftover = withoutPrice
    .filter(({ i }) => i !== categoryIdx)
    .map(({ c }) => c);
  if (!leftover.length) return null;

  // Descriptions almost always open with a marketing filler phrase
  // ("Known for being...", "Basic...", "Affordable...") — check for that
  // first, since a terse description ("Basic 450W power supply") can
  // actually be SHORTER than the product name it describes ("Cooler
  // Master Elite 450W PSU"), which would fool a pure length comparison.
  let name, description;
  if (leftover.length === 1) {
    name = leftover[0];
    description = "";
  } else {
    const descLike = leftover.filter((c) => DESCRIPTION_OPENERS.test(c));
    if (descLike.length === 1) {
      description = descLike[0];
      const nameCandidates = leftover.filter((c) => c !== description);
      // A real product name almost always carries a model number; stray
      // leftover text (e.g. junk category text that didn't get matched)
      // usually doesn't — prefer whichever candidate has a digit.
      name = nameCandidates.find((c) => /\d/.test(c)) || nameCandidates[0];
    } else {
      const sorted = [...leftover].sort((a, b) => a.length - b.length);
      name = sorted[0];
      description = leftover.filter((c) => c !== name).join(" ");
    }
  }

  return {
    name,
    category: category || "",
    price: priceIdx !== -1 ? parsePriceValue(cells[priceIdx]) ?? 0 : 0,
    description,
  };
}

function normalizeRow(row) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    const cleanKey = String(key || "")
      .trim()
      .toLowerCase();
    if (cleanKey) normalized[cleanKey] = value;
  });

  let name = normalized.name || normalized.product || normalized.title || "";
  let category =
    normalized.category || normalized.type || normalized.component || "";
  let price = normalized.price || normalized.cost || normalized.amount || 0;
  let description = normalized.description || normalized.details || "";

  // Header names didn't give us a complete row — fall back to sniffing
  // the raw values by content instead of by column position.
  if (!name || !category || !(Number(price) > 0)) {
    const sniffed = sniffRowFromValues(Object.values(row || {}));
    if (sniffed) {
      if (!name) name = sniffed.name;
      if (!category) category = sniffed.category;
      if (!(Number(price) > 0)) price = sniffed.price;
      if (!description) description = sniffed.description;
    }
  }

  return {
    name,
    category,
    price,
    description,
    in_stock: normalized.in_stock ?? normalized.instock ?? 1,
  };
}

// ─── Fallback parsing for freeform formats (PDF / Word) ───────────
// These files don't have real spreadsheet cells, so we do a best-effort
// reconstruction of tabular rows from either an HTML <table> (Word) or
// plain extracted text (PDF / Word without a table), then reuse the same
// column-mapping logic as CSV/Excel uploads.

function looksLikeHeaderRow(cells) {
  if (!cells || cells.length < 2) return false;
  const lower = cells.map((c) => String(c || "").trim().toLowerCase());
  const hasName = lower.some((c) => ["name", "product", "title"].includes(c));
  const hasPriceOrCategory = lower.some((c) =>
    ["price", "cost", "amount", "category", "type", "component"].includes(c),
  );
  return hasName && hasPriceOrCategory;
}

function rowObjectFromCells(headerCells, dataCells) {
  const obj = {};
  headerCells.forEach((h, i) => {
    const key = String(h || "")
      .trim()
      .toLowerCase();
    if (key) obj[key] = dataCells[i];
  });
  return obj;
}

// No recognizable header — assume the template's column order:
// name, category, price, description
function rowObjectFromPositional(cells) {
  return {
    name: cells[0],
    category: cells[1],
    price: cells[2],
    description: cells[3],
  };
}

function rowsOfCellsToProducts(rowsOfCells) {
  const filtered = (rowsOfCells || []).filter(
    (cells) => cells && cells.filter((c) => String(c || "").trim()).length >= 2,
  );
  if (!filtered.length) return [];

  let headerCells = null;
  let dataStart = 0;
  if (looksLikeHeaderRow(filtered[0])) {
    headerCells = filtered[0];
    dataStart = 1;
  }

  const rows = [];
  for (let i = dataStart; i < filtered.length; i++) {
    const cells = filtered[i];
    const rowObj = headerCells
      ? rowObjectFromCells(headerCells, cells)
      : rowObjectFromPositional(cells);
    rows.push(normalizeRow(rowObj));
  }
  return rows;
}

function splitLineToCells(line) {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes("|")) return line.split("|");
  // 2+ spaces = column gap in PDF-extracted text
  if (/\s{2,}/.test(line)) return line.split(/\s{2,}/);
  return line.split(",");
}

function parseDelimitedText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rowsOfCells = lines.map((line) =>
    splitLineToCells(line).map((c) => c.trim()),
  );
  return rowsOfCellsToProducts(rowsOfCells);
}

function parseHtmlTables(html) {
  if (!html) return [];
  const decode = (str) =>
    String(str || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();

  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  const allRows = [];
  tableMatches.forEach((tableHtml) => {
    const trMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    trMatches.forEach((trHtml) => {
      const cellMatches = trHtml.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
      const cells = cellMatches.map(decode);
      if (cells.length) allRows.push(cells);
    });
  });
  return allRows;
}

async function parseCatalog(buffer, filename) {
  const ext = path.extname(filename || "").toLowerCase();

  if (ext === ".csv") {
    return new Promise((resolve, reject) => {
      const rows = [];
      const stream = Readable.from(buffer.toString("utf8"));
      stream
        .pipe(csv())
        .on("data", (row) => rows.push(normalizeRow(row)))
        .on("end", () => resolve(rows))
        .on("error", reject);
    });
  }

  if (ext === ".xlsx" || ext === ".xls") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return rows.map(normalizeRow);
  }

  if (ext === ".docx") {
    const { value: html } = await mammoth.convertToHtml({ buffer });
    const tableRows = parseHtmlTables(html);
    let products = rowsOfCellsToProducts(tableRows);
    if (!products.length) {
      const { value: text } = await mammoth.extractRawText({ buffer });
      products = parseDelimitedText(text);
    }
    return products;
  }

  if (ext === ".doc") {
    throw new Error(
      "Legacy .doc files aren't supported. Please save the file as .docx (Word), .csv, or .xlsx and upload again.",
    );
  }

  if (ext === ".pdf") {
    const data = await pdfParse(buffer);
    return parseDelimitedText(data.text);
  }

  throw new Error(
    "Unsupported file format. Please upload a CSV, Excel (.xlsx), Word (.docx), or PDF file.",
  );
}

router.post(
  "/upload",
  authMiddleware,
  uploadLimiter,
  (req, res, next) => {
    upload.single("catalog")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "File too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const storeId = req.store.storeId;
    const ext = path.extname(req.file.originalname || "").toLowerCase();
    try {
      const products = await parseCatalog(
        req.file.buffer,
        req.file.originalname || "catalog.csv",
      );

      // Rows with no name/price aren't usable at all — separate from rows
      // that ARE usable but whose category text doesn't match any of the
      // 9 supported categories, so the store owner gets told exactly which
      // rows were skipped and why, instead of the file silently importing
      // as unrecognized junk (or worse, silently vanishing from builds).
      const basicallyUsable = products.filter(
        // A real product name always has at least one letter (brand/model) —
        // this filters out numeric noise from severely malformed rows that
        // would otherwise slip through as a fake product with no real name.
        (p) => p.name && /[a-zA-Z]/.test(p.name) && Number(p.price) >= 0,
      );
      const skippedCategory = [];
      const validProducts = [];
      basicallyUsable.forEach((p) => {
        const category = normalizeCategory(p.category, p.name);
        if (!category) {
          skippedCategory.push({ name: p.name, rawCategory: p.category || "" });
          return;
        }
        validProducts.push({ ...p, category });
      });

      if (!validProducts.length) {
        const freeform = ext === ".pdf" || ext === ".docx";
        if (skippedCategory.length) {
          const sample = skippedCategory
            .slice(0, 5)
            .map((s) => `"${s.name}" (category: "${s.rawCategory || "blank"}")`)
            .join(", ");
          return res.status(400).json({
            error: `Found ${skippedCategory.length} product row(s), but none matched a supported category. Supported categories: ${CANONICAL_CATEGORIES.join(", ")}. Example unmatched: ${sample}.`,
          });
        }
        return res.status(400).json({
          error: freeform
            ? "Couldn't find usable product rows in this file. For PDF/Word uploads, list each product on its own line or table row as: Name, Category, Price, Description (matching the CSV template columns)."
            : "The uploaded file does not contain usable inventory rows.",
        });
      }

      // "replace" (default) wipes the store's whole catalog first, exactly
      // like before this option existed. "append" is opt-in — the store
      // owner is asked in the dashboard whenever they already have
      // products from a different method (manual entry, OSPOS import),
      // so uploading a second file never silently destroys the first.
      const mode = req.body.mode === "append" ? "append" : "replace";
      const count = await productDB.bulkInsert(storeId, validProducts, {
        source: "csv",
        mode,
        backupLabel: mode === "replace" ? "Before file upload replaced your catalog" : "Before file upload added products",
      });
      await storeDB.touchCatalog(storeId);

      let message = `${count} products ${mode === "append" ? "added" : "uploaded"} successfully!`;
      if (skippedCategory.length) {
        const sample = skippedCategory
          .slice(0, 10)
          .map((s) => `"${s.name}" (category: "${s.rawCategory || "blank"}")`)
          .join(", ");
        message += ` ${skippedCategory.length} row(s) were skipped because their category didn't match a supported type: ${sample}${skippedCategory.length > 10 ? ", ..." : ""}. Supported categories: ${CANONICAL_CATEGORIES.join(", ")}.`;
      }

      res.json({
        success: true,
        message,
        skippedCount: skippedCategory.length,
        skippedItems: skippedCategory.slice(0, 20),
        preview: validProducts.slice(0, 3),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

// ─── PRODUCT BACKUP (persistent, single-slot undo) ─────────
// Not time-limited like a toast-style undo — the snapshot taken right
// before the store's most recent destructive change (a delete, or a
// "replace" mode CSV/OSPOS import) stays restorable until either it's
// used or another destructive change replaces it. See
// productDB.saveBackup/getBackup/restoreBackup. There is deliberately no
// "discard" action — the only way this option goes away is by being used,
// or by another destructive change overwriting it with a newer snapshot.
//
// Registered ahead of GET /products/:storeId below on purpose: Express
// matches routes in registration order, and "/products/backup" is a
// literal path that also matches that route's :storeId param pattern
// (storeId="backup") — if that route came first, every request here
// would be swallowed by it and answered with its own "Store not found"
// 404 instead of ever reaching these handlers.
router.get("/products/backup", authMiddleware, async (req, res) => {
  try {
    const backup = await productDB.getBackup(req.store.storeId);
    res.json({
      success: true,
      backup: backup
        ? {
            id: backup.id,
            label: backup.label,
            productCount: backup.product_count,
            createdAt: backup.created_at,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/products/backup/restore", authMiddleware, async (req, res) => {
  try {
    const count = await productDB.restoreBackup(req.store.storeId);
    if (count === null) {
      return res.status(404).json({ error: "No previous catalog state to restore." });
    }
    await storeDB.touchCatalog(req.store.storeId);
    res.json({
      success: true,
      message: `Catalog restored — ${count} product${count === 1 ? "" : "s"}.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET ALL PRODUCTS (public, for widget) ────────────────
router.get("/products/:storeId", async (req, res) => {
  const store = await storeDB.findById(req.params.storeId);
  if (!store) return res.status(404).json({ error: "Store not found" });

  const active = await storeDB.isActive(req.params.storeId);
  if (
    !active ||
    store.widget_enabled === 0 ||
    store.plan_status === "disabled"
  ) {
    return res.status(403).json({ error: "Store catalog not available" });
  }

  const products = await productDB.getByStore(req.params.storeId);
  if (!products.length) {
    return res.status(404).json({ error: "No products found" });
  }
  res.json({ products });
});

// ─── GET ALL PRODUCTS (dashboard, includes out of stock) ──
router.get("/products/manage/:storeId", authMiddleware, async (req, res) => {
  try {
    const res2 = await client.execute({
      sql: `SELECT * FROM products WHERE store_id = ? ORDER BY category, name`,
      args: [req.store.storeId],
    });
    res.json({ success: true, products: res2.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADD SINGLE PRODUCT ───────────────────────────────────
router.post("/product", authMiddleware, async (req, res) => {
  const { name, category, price, description } = req.body;
  if (!name || !category || !price) {
    return res
      .status(400)
      .json({ error: "Name, category and price are required" });
  }
  const normalizedCategory = normalizeCategory(category, name);
  if (!normalizedCategory) {
    return res.status(400).json({
      error: `"${category}" is not a supported category. Supported categories: ${CANONICAL_CATEGORIES.join(", ")}.`,
    });
  }
  try {
    await productDB.saveBackup(req.store.storeId, `Before adding "${name}"`);
    await client.execute({
      sql: `INSERT INTO products (store_id, name, category, price, description, source)
             VALUES (?, ?, ?, ?, ?, 'manual')`,
      args: [
        req.store.storeId,
        name,
        normalizedCategory,
        parseFloat(price),
        description || "",
      ],
    });
    await storeDB.touchCatalog(req.store.storeId);
    res.json({ success: true, message: "Product added!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EDIT PRODUCT ─────────────────────────────────────────
router.put("/product/:id", authMiddleware, async (req, res) => {
  const { name, category, price, description } = req.body;
  if (!name || !category || !price) {
    return res
      .status(400)
      .json({ error: "Name, category and price are required" });
  }
  const normalizedCategory = normalizeCategory(category, name);
  if (!normalizedCategory) {
    return res.status(400).json({
      error: `"${category}" is not a supported category. Supported categories: ${CANONICAL_CATEGORIES.join(", ")}.`,
    });
  }
  try {
    await productDB.saveBackup(req.store.storeId, `Before editing "${name}"`);
    const result = await client.execute({
      sql: `UPDATE products SET name=?, category=?, price=?, description=?
             WHERE id=? AND store_id=?`,
      args: [
        name,
        normalizedCategory,
        parseFloat(price),
        description || "",
        req.params.id,
        req.store.storeId,
      ],
    });
    if ((result.rowsAffected ?? 0) === 0) {
      return res
        .status(404)
        .json({ error: "Product not found or access denied" });
    }
    await storeDB.touchCatalog(req.store.storeId);
    res.json({ success: true, message: "Product updated!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TOGGLE STOCK ─────────────────────────────────────────
router.put("/product/:id/stock", authMiddleware, async (req, res) => {
  const { inStock } = req.body;
  try {
    await productDB.saveBackup(req.store.storeId, "Before changing a stock status");
    await client.execute({
      sql: "UPDATE products SET in_stock=? WHERE id=? AND store_id=?",
      args: [inStock ? 1 : 0, req.params.id, req.store.storeId],
    });
    await storeDB.touchCatalog(req.store.storeId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE PRODUCT ───────────────────────────────────────
router.delete("/product/:id", authMiddleware, async (req, res) => {
  try {
    const result = await client.execute({
      sql: "DELETE FROM products WHERE id=? AND store_id=?",
      args: [req.params.id, req.store.storeId],
    });
    if ((result.rowsAffected ?? 0) === 0) {
      return res
        .status(404)
        .json({ error: "Product not found or access denied" });
    }
    await storeDB.touchCatalog(req.store.storeId);
    res.json({ success: true, message: "Product deleted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BULK DELETE (multi-select, or "delete entire list") ──
// Same operation either way — the client just sends every currently
// visible product's id for a "delete all". Snapshots the whole catalog
// first (see productDB.saveBackup) so this is undoable via
// GET/POST /products/backup below whenever the store owner comes back to
// it — not just for a few seconds right after.
router.delete("/products/bulk", authMiddleware, async (req, res) => {
  const ids = Array.isArray(req.body.ids)
    ? req.body.ids.map((id) => parseInt(id, 10)).filter(Number.isInteger)
    : [];
  if (!ids.length) {
    return res.status(400).json({ error: "ids must be a non-empty array" });
  }
  try {
    await productDB.saveBackup(
      req.store.storeId,
      `Before deleting ${ids.length} product${ids.length === 1 ? "" : "s"}`,
    );
    const deleted = await productDB.deleteByIds(req.store.storeId, ids);
    if (deleted.length) await storeDB.touchCatalog(req.store.storeId);
    res.json({
      success: true,
      message: `${deleted.length} product${deleted.length === 1 ? "" : "s"} deleted.`,
      deleted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.parseCatalog = parseCatalog;
module.exports.parseDelimitedText = parseDelimitedText;
module.exports.parseHtmlTables = parseHtmlTables;
module.exports.rowsOfCellsToProducts = rowsOfCellsToProducts;
module.exports.normalizeRow = normalizeRow;
module.exports.sniffRowFromValues = sniffRowFromValues;
