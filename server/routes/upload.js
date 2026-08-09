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

function normalizeRow(row) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    const cleanKey = String(key || "")
      .trim()
      .toLowerCase();
    if (cleanKey) normalized[cleanKey] = value;
  });

  return {
    name: normalized.name || normalized.product || normalized.title || "",
    category:
      normalized.category || normalized.type || normalized.component || "",
    price: normalized.price || normalized.cost || normalized.amount || 0,
    description: normalized.description || normalized.details || "",
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
      const validProducts = products.filter(
        (p) => p.name && p.category && Number(p.price) >= 0,
      );

      if (!validProducts.length) {
        const freeform = ext === ".pdf" || ext === ".docx";
        return res.status(400).json({
          error: freeform
            ? "Couldn't find usable product rows in this file. For PDF/Word uploads, list each product on its own line or table row as: Name, Category, Price, Description (matching the CSV template columns)."
            : "The uploaded file does not contain usable inventory rows.",
        });
      }

      const count = await productDB.bulkInsert(storeId, validProducts);
      await storeDB.touchCatalog(storeId);
      res.json({
        success: true,
        message: `${count} products uploaded successfully!`,
        preview: validProducts.slice(0, 3),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

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
  try {
    await client.execute({
      sql: `INSERT INTO products (store_id, name, category, price, description)
             VALUES (?, ?, ?, ?, ?)`,
      args: [
        req.store.storeId,
        name,
        category,
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
  try {
    const result = await client.execute({
      sql: `UPDATE products SET name=?, category=?, price=?, description=?
             WHERE id=? AND store_id=?`,
      args: [
        name,
        category,
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

module.exports = router;
module.exports.parseCatalog = parseCatalog;
module.exports.parseDelimitedText = parseDelimitedText;
module.exports.parseHtmlTables = parseHtmlTables;
module.exports.rowsOfCellsToProducts = rowsOfCellsToProducts;
