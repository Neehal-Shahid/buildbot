const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const {
  storeDB,
  analyticsDB,
  productDB,
  client,
  adminDB,
  tokenDB,
  configDB,
  emailLogDB,
  supportTicketDB,
  supportTicketRepliesDB,
  adminAuditDB,
} = require("../database");

const router = express.Router();
const { JWT_SECRET } = require("../lib/secrets");
const asyncHandler = require("../lib/asyncHandler");

// Basic brute-force protection for admin auth endpoints
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

// Same rule for both /admin/reset-password (token flow) and /admin/password
// (authenticated self-service change) — the latter used to only check
// length >= 8, letting an admin set something like "aaaaaaaa" through one
// flow that the other flow would refuse.
function isStrongAdminPassword(pw) {
  return (
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)
  );
}

// ─── EFFECTIVE STATUS HELPER ──────────────────────────────
// plan_status in the DB is 'disabled' only when explicitly disabled by admin.
function computeEffectiveStatus(store) {
  return store.plan_status === "disabled" ? "disabled" : "active";
}

async function enrichStoresWithCounts(stores) {
  if (!stores.length) return stores;
  const ids = stores.map((s) => s.store_id);
  const placeholders = ids.map(() => "?").join(",");

  const productCounts = await client.execute({
    sql: `SELECT store_id, COUNT(*) AS count
          FROM products
          WHERE store_id IN (${placeholders})
          GROUP BY store_id`,
    args: ids,
  });

  const recCounts = await client.execute({
    sql: `SELECT store_id, COUNT(*) AS count
          FROM recommendations
          WHERE store_id IN (${placeholders})
          GROUP BY store_id`,
    args: ids,
  });

  const pMap = new Map(
    productCounts.rows.map((r) => [r.store_id, Number(r.count || 0)]),
  );
  const rMap = new Map(
    recCounts.rows.map((r) => [r.store_id, Number(r.count || 0)]),
  );

  for (const store of stores) {
    store.product_count = pMap.get(store.store_id) || 0;
    store.rec_count = rMap.get(store.store_id) || 0;
    store.effectiveStatus = computeEffectiveStatus(store);
  }
  return stores;
}

// Emails are matched case-insensitively (see the matching helper in
// auth.js for the store-owner side) — normalize before any DB lookup so
// "Admin@x.com" and "admin@x.com" are always treated as the same address.
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function adminAuth(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: "Not admin" });
    // Lets any route handler attribute an action to the admin who took it
    // (see adminAuditDB.log calls below) without re-decoding the token itself.
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

router.post("/admin/login", adminAuthLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const admin = await adminDB.findByLoginEmail(email);
  if (!admin)
    return res.status(401).json({ error: "Invalid admin credentials" });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid)
    return res.status(401).json({ error: "Invalid admin credentials" });

  const token = jwt.sign(
    { isAdmin: true, id: admin.id, email: admin.email, name: admin.name },
    JWT_SECRET,
    { expiresIn: "1d" },
  );
  res.json({ success: true, token });
}));

router.get("/admin/overview", adminAuth, asyncHandler(async (req, res) => {
  const storesRaw = await storeDB.getAll();
  const stores = await enrichStoresWithCounts(storesRaw);
  const totalRecs = await analyticsDB.getTotalRecs();

  res.json({ success: true, stores, totalRecs });
}));

router.get("/admin/stores", adminAuth, asyncHandler(async (req, res) => {
  const storesRaw = await storeDB.getAll();
  const stores = await enrichStoresWithCounts(storesRaw);
  res.json({ success: true, stores });
}));

router.post("/admin/disable-store", adminAuth, async (req, res) => {
  const storeId = String(req.body.storeId || "").trim();
  if (!storeId) return res.status(400).json({ error: "storeId required" });

  try {
    const store = await storeDB.findById(storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });

    await storeDB.disableStore(storeId);
    await storeDB.disconnectWoo(storeId);
    await adminAuditDB.log(req.admin.email, "Disabled store", storeId, store.name);

    const { sendEmail, storeDisabledEmail } = require("../email");
    if (store.email) {
      sendEmail(storeDisabledEmail(store.name, store.email)).catch((e) =>
        console.error("Disable store email failed:", e.message),
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/delete-store", adminAuth, async (req, res) => {
  const storeId = String(req.body.storeId || "").trim();
  if (!storeId) return res.status(400).json({ error: "storeId required" });

  try {
    const store = await storeDB.findById(storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });

    // Deletion is the actual point of this endpoint; the notification
    // email is informational. It used to be awaited *before* the delete,
    // so a Resend outage or a bad email address meant the store never
    // actually got deleted despite the admin's request succeeding up to
    // that point — fire-and-forget, same pattern as disable-store above.
    await storeDB.deleteStoreAndData(storeId);
    await adminAuditDB.log(req.admin.email, "Deleted store", storeId, `${store.name} (${store.email})`);

    const { sendEmail, storeDeletedEmail } = require("../email");
    if (store.email) {
      sendEmail(storeDeletedEmail(store.name, store.email)).catch((e) =>
        console.error("Store-deleted email failed:", e.message),
      );
    }

    res.json({ success: true, message: "Store and all related data deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/activate-store", adminAuth, async (req, res) => {
  const storeId = String(req.body.storeId || "").trim();
  if (!storeId) return res.status(400).json({ error: "storeId required" });
  try {
    const store = await storeDB.findById(storeId);
    await storeDB.activateStore(storeId);
    await adminAuditDB.log(req.admin.email, "Activated store", storeId, store?.name || "");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TOGGLE WIDGET (admin override) ──────────────────────
router.post("/admin/toggle-widget", adminAuth, async (req, res) => {
  const storeId = String(req.body.storeId || "").trim();
  const enabled = req.body.enabled !== false; // default true
  if (!storeId) return res.status(400).json({ error: "storeId required" });
  try {
    const store = await storeDB.findById(storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });
    await client.execute({
      sql: "UPDATE stores SET widget_enabled = ? WHERE store_id = ?",
      args: [enabled ? 1 : 0, storeId],
    });
    // This can take a live customer's widget offline (or back on) just
    // like disable-store/activate-store do — it needs the same audit
    // trail those already get, or an admin flipping it leaves no record
    // of who actually did it.
    await adminAuditDB.log(
      req.admin.email,
      enabled ? "Enabled widget (override)" : "Disabled widget (override)",
      storeId,
      store.name,
    );
    res.json({ success: true, widgetEnabled: enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/forgot-password", adminAuthLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) return res.status(400).json({ error: "Email required" });

  // Matches either the primary or recovery email, so a lost primary inbox
  // doesn't lock the admin out — the reset link goes to whichever address
  // was actually entered here, not always the primary one.
  const admin = await adminDB.findByLoginEmail(email);
  if (!admin)
    return res.json({
      success: true,
      message: "If this email exists, a reset link has been sent.",
    });

  const resetToken = crypto.randomBytes(32).toString("hex");
  await tokenDB.save(email, resetToken, "admin_reset");
  const { sendEmail, adminPasswordResetEmail } = require("../email");
  sendEmail(adminPasswordResetEmail(admin.name, email, resetToken));

  res.json({
    success: true,
    message: "Password reset link sent! Check your email.",
  });
});

router.post("/admin/reset-password", adminAuthLimiter, asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ error: "Token and password required" });

  if (!isStrongAdminPassword(password))
    return res
      .status(400)
      .json({
        error:
          "Password must be at least 8 characters with uppercase, lowercase, number and special character",
      });

  const record = await tokenDB.verify(token, "admin_reset");
  if (!record)
    return res.status(400).json({ error: "Invalid or expired reset link" });

  const hashedPassword = await bcrypt.hash(password, 10);
  await adminDB.updatePassword(record.email, hashedPassword);
  await tokenDB.markUsed(token);

  res.json({
    success: true,
    message: "Admin password reset successfully! You can now login.",
  });
}));

router.put("/admin/profile", adminAuth, async (req, res) => {
  const name = req.body.name;
  const email = normalizeEmail(req.body.email);
  const token = req.headers["authorization"]?.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!name || !email)
    return res.status(400).json({ error: "Name and email required" });

  const admin = await adminDB.findById(decoded.id);
  if (
    admin &&
    admin.recovery_email &&
    email === admin.recovery_email.toLowerCase()
  )
    return res.status(400).json({
      error: "This email is set as your recovery email — remove it as recovery email first",
    });

  try {
    await adminDB.updateProfile(decoded.id, name, email);
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RECOVERY EMAIL (backup login for admin panel) ────────
router.put("/admin/recovery-email", adminAuth, async (req, res) => {
  const recoveryEmail = normalizeEmail(req.body.recoveryEmail);
  const token = req.headers["authorization"]?.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET);

  if (recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail))
    return res.status(400).json({ error: "Please enter a valid email address" });

  const admin = await adminDB.findById(decoded.id);
  if (!admin) return res.status(404).json({ error: "Admin not found" });

  if (recoveryEmail && recoveryEmail === admin.email.toLowerCase())
    return res.status(400).json({
      error: "Recovery email must be different from your primary login email",
    });

  try {
    await adminDB.updateRecoveryEmail(decoded.id, recoveryEmail);
    res.json({
      success: true,
      message: recoveryEmail
        ? "Recovery email saved. You can now sign in with either email."
        : "Recovery email removed.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/admin/password", adminAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const token = req.headers["authorization"]?.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET);

  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "Passwords required" });
  if (!isStrongAdminPassword(newPassword))
    return res.status(400).json({
      error:
        "New password must be at least 8 characters with uppercase, lowercase, number and special character",
    });

  const admin = await adminDB.findById(decoded.id);
  if (!admin) return res.status(404).json({ error: "Admin not found" });

  const valid = await bcrypt.compare(currentPassword, admin.password);
  if (!valid)
    return res.status(400).json({ error: "Current password is incorrect" });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await adminDB.updatePassword(admin.email, hashedPassword);

  res.json({ success: true, message: "Password changed successfully" });
}));

router.get("/admin/me", adminAuth, asyncHandler(async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  const admin = await adminDB.findById(decoded.id);
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  res.json({
    success: true,
    admin: {
      name: admin.name,
      email: admin.email,
      recoveryEmail: admin.recovery_email || "",
    },
  });
}));

// ─── DB INTEGRITY AUDIT (admin only) ──────────────────────
router.get("/admin/db-audit", adminAuth, async (req, res) => {
  try {
    const tables = [
      "stores",
      "pending_signups",
      "products",
      "recommendations",
      "tokens",
    ];
    const counts = {};
    for (const t of tables) {
      const r = await client.execute(`SELECT COUNT(*) AS c FROM ${t}`);
      counts[t] = Number(r.rows[0]?.c || 0);
    }

    // Orphans (rows referencing missing stores)
    const orphanProducts = await client.execute(`
      SELECT COUNT(*) AS c
      FROM products p
      LEFT JOIN stores s ON s.store_id = p.store_id
      WHERE s.store_id IS NULL
    `);
    const orphanRecs = await client.execute(`
      SELECT COUNT(*) AS c
      FROM recommendations r
      LEFT JOIN stores s ON s.store_id = r.store_id
      WHERE s.store_id IS NULL
    `);
    // Tokens health
    const expiredTokens = await client.execute(`
      SELECT COUNT(*) AS c
      FROM tokens
      WHERE expires_at <= datetime('now')
    `);
    const usedTokens = await client.execute(`
      SELECT COUNT(*) AS c
      FROM tokens
      WHERE used = 1
    `);

    // Per-store mismatches (quick spot checks)
    const topStoresByOrphans = await client.execute(`
      SELECT p.store_id, COUNT(*) AS c
      FROM products p
      LEFT JOIN stores s ON s.store_id = p.store_id
      WHERE s.store_id IS NULL
      GROUP BY p.store_id
      ORDER BY c DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      counts,
      orphans: {
        products: Number(orphanProducts.rows[0]?.c || 0),
        recommendations: Number(orphanRecs.rows[0]?.c || 0),
        orphanProductsTop: topStoresByOrphans.rows,
      },
      tokens: {
        expired: Number(expiredTokens.rows[0]?.c || 0),
        used: Number(usedTokens.rows[0]?.c || 0),
      },
      notes: [
        "Orphan counts > 0 indicate non-cascaded deletes or manual DB edits.",
        "Expired/used tokens can be periodically cleaned up without affecting app behavior.",
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual email to a specific store
router.post("/admin/send-email", adminAuth, async (req, res) => {
  const { storeId, subject, message } = req.body;
  if (!storeId || !subject || !message)
    return res
      .status(400)
      .json({ error: "storeId, subject and message required" });
  if (subject.length > 150)
    return res.status(400).json({ error: "Subject too long (max 150 chars)" });
  if (message.length > 2000)
    return res.status(400).json({ error: "Message too long (max 2000 chars)" });
  try {
    const store = await storeDB.findById(storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });
    const { sendEmail, adminManualEmail } = require("../email");
    await sendEmail(
      adminManualEmail(store.name, store.email, subject, message),
    );
    res.json({ success: true, message: `Email sent to ${store.email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast to all or filtered stores
router.post("/admin/broadcast", adminAuth, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message)
    return res.status(400).json({ error: "subject and message required" });
  if (subject.length > 150)
    return res.status(400).json({ error: "Subject too long (max 150 chars)" });
  if (message.length > 2000)
    return res.status(400).json({ error: "Message too long (max 2000 chars)" });
  try {
    const allStores = await storeDB.getAll();
    const targets = allStores.filter((s) => s.plan_status !== "disabled");
    const { sendEmail, adminManualEmail } = require("../email");
    let sent = 0;
    for (const store of targets) {
      try {
        await sendEmail(
          adminManualEmail(store.name, store.email, subject, message),
        );
        sent++;
      } catch {}
    }
    res.json({
      success: true,
      message: `Broadcast sent to ${sent} store${sent !== 1 ? "s" : ""}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save internal admin notes for a store
router.post("/admin/save-notes", adminAuth, async (req, res) => {
  const { storeId, notes } = req.body;
  if (!storeId) return res.status(400).json({ error: "storeId required" });
  if ((notes || "").length > 1000)
    return res.status(400).json({ error: "Notes too long (max 1000 chars)" });
  try {
    await storeDB.setNotes(storeId, notes || "");
    await adminAuditDB.log(req.admin.email, "Updated store notes", storeId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View a store's product catalog
router.get("/admin/store-products/:storeId", adminAuth, async (req, res) => {
  try {
    const products = await productDB.getByStore(req.params.storeId);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger scheduled email jobs
router.post("/admin/run-drip", adminAuth, async (req, res) => {
  try {
    const results = await runScheduledEmails();
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/email-log — recent automated email sends
router.get("/admin/email-log", adminAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const storeId = req.query.storeId;
    const logs = storeId
      ? await emailLogDB.getByStore(storeId, limit)
      : await emailLogDB.getRecent(limit);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/set-drip-paused — pause/resume automated drip for a store
router.post("/admin/set-drip-paused", adminAuth, async (req, res) => {
  const { storeId, paused } = req.body;
  if (!storeId || paused === undefined)
    return res.status(400).json({ error: "storeId and paused required" });
  try {
    await storeDB.setDripPaused(storeId, !!paused);
    await adminAuditDB.log(
      req.admin.email,
      paused ? "Paused drip emails" : "Resumed drip emails",
      storeId,
    );
    res.json({
      success: true,
      message: paused
        ? "Automated drip emails paused for this store"
        : "Automated drip emails resumed for this store",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/support-tickets
router.get("/admin/support-tickets", adminAuth, async (req, res) => {
  try {
    const status = req.query.status || null;
    const tickets = await supportTicketDB.getAll(status);
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/support-tickets/:id/status
router.post(
  "/admin/support-tickets/:id/status",
  adminAuth,
  async (req, res) => {
    const { status } = req.body;
    if (!["open", "in_progress", "resolved", "closed"].includes(status))
      return res.status(400).json({ error: "Invalid status" });
    try {
      await supportTicketDB.updateStatus(req.params.id, status);
      res.json({ success: true, message: "Ticket updated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// POST /admin/support-tickets/:id/reply
// The piece that was actually missing before: a way for the admin to
// message the store owner back, rather than only changing a status label.
// Emails the store owner immediately so they don't have to keep checking
// the dashboard for a reply.
router.post(
  "/admin/support-tickets/:id/reply",
  adminAuth,
  async (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim())
      return res.status(400).json({ error: "Message is required" });
    if (message.length > 2000)
      return res.status(400).json({ error: "Message too long (max 2000 chars)" });

    try {
      const ticket = await supportTicketDB.getById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Support ticket not found" });

      await supportTicketRepliesDB.create(ticket.id, "admin", message.trim());
      // Only ever bumps a fresh "open" ticket forward — never overrides a
      // status the admin has deliberately set (e.g. replying once more on
      // an already "resolved" ticket shouldn't silently flip it back).
      if (ticket.status === "open") {
        await supportTicketDB.updateStatus(ticket.id, "in_progress");
      }

      const { sendEmail, supportTicketReplyToStoreEmail } = require("../email");
      await sendEmail(
        supportTicketReplyToStoreEmail(
          ticket.store_name,
          ticket.store_email,
          ticket.subject,
          message.trim(),
          ticket.id,
        ),
      );

      res.json({ success: true, message: "Reply sent." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ─── AUDIT LOG ──────────────────────────────────────────────
// GET /admin/audit-log — the real, shared record behind the "Activity
// Log" tab, replacing what used to be a per-browser localStorage list
// (see admin_audit_log's comment in server/database.js initDB()).
router.get("/admin/audit-log", adminAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const entries = await adminAuditDB.getRecent(limit);
    res.json({ success: true, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PLATFORM CONFIG ──────────────────────────────────────────

// GET /admin/platform-config — return all config key/value pairs
router.get("/admin/platform-config", adminAuth, async (req, res) => {
  try {
    const config = await configDB.getAll();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/platform-config — save config key/value pairs
router.post("/admin/platform-config", adminAuth, async (req, res) => {
  const { config } = req.body;
  if (!config || typeof config !== "object")
    return res.status(400).json({ error: "config object required" });

  // Whitelist allowed keys — never allow arbitrary keys
  const allowedKeys = ["maintenance_mode", "budget_presets"];

  try {
    const filtered = {};
    for (const key of allowedKeys) {
      if (config[key] !== undefined) filtered[key] = config[key];
    }
    await configDB.setMany(filtered);
    // Platform config affects every store at once, so it gets logged even
    // though per-store actions above are the more common audit entry.
    await adminAuditDB.log(
      req.admin.email,
      "Changed platform configuration",
      "",
      Object.entries(filtered).map(([k, v]) => `${k}=${v}`).join(", "),
    );

    res.json({ success: true, message: "Configuration saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DB CLEANUP ───────────────────────────────────────────────

// POST /admin/db-cleanup — safe cleanup of expired tokens or orphaned records
router.post("/admin/db-cleanup", adminAuth, async (req, res) => {
  const { action } = req.body;
  if (!action)
    return res.status(400).json({ error: "action required: tokens | orphans" });

  try {
    if (action === "tokens") {
      // Delete expired tokens (past expires_at) and used tokens
      const expiredRes = await client.execute(
        "DELETE FROM tokens WHERE expires_at <= datetime('now') OR used = 1",
      );
      const deleted = expiredRes.rowsAffected || 0;
      await adminAuditDB.log(req.admin.email, "Ran DB cleanup: tokens", "", `${deleted} removed`);
      res.json({
        success: true,
        message: `Cleaned up ${deleted} expired/used token${deleted !== 1 ? "s" : ""}`,
      });
    } else if (action === "orphans") {
      // Delete records that reference store_ids that no longer exist
      const r1 = await client.execute(`
        DELETE FROM products WHERE store_id NOT IN (SELECT store_id FROM stores)
      `);
      const r2 = await client.execute(`
        DELETE FROM recommendations WHERE store_id NOT IN (SELECT store_id FROM stores)
      `);
      const total = (r1.rowsAffected || 0) + (r2.rowsAffected || 0);
      await adminAuditDB.log(
        req.admin.email,
        "Ran DB cleanup: orphans",
        "",
        `${total} removed (products: ${r1.rowsAffected || 0}, recommendations: ${r2.rowsAffected || 0})`,
      );
      res.json({
        success: true,
        message: `Removed ${total} orphaned record${total !== 1 ? "s" : ""} (products: ${r1.rowsAffected || 0}, recommendations: ${r2.rowsAffected || 0})`,
      });
    } else {
      res.status(400).json({ error: "Invalid action. Use: tokens | orphans" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function runScheduledEmails() {
  const { sendEmail, onboardingDay4Email } = require("../email");

  const results = {
    onboarding: 0,
    skipped: 0,
    errors: [],
  };

  async function sendDripOnce(storeId, emailType, template) {
    const claimed = await emailLogDB.tryClaim(
      storeId,
      emailType,
      template.to,
      template.subject,
    );
    if (!claimed) {
      results.skipped++;
      return false;
    }
    await sendEmail(template);
    return true;
  }

  // Onboarding nudge — Day 4, store hasn't gone live yet (no products, no WooCommerce)
  try {
    const day4Stores = await storeDB.getSignedUpDaysAgoNotLive(4);
    for (const store of day4Stores) {
      try {
        const template = onboardingDay4Email(store.name, store.email);
        const sent = await sendDripOnce(
          store.store_id,
          "onboarding_day4",
          template,
        );
        if (sent) results.onboarding++;
      } catch (e) {
        results.errors.push(`onboarding-day4: ${store.email}: ${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push(`getSignedUpDaysAgoNotLive(4): ${e.message}`);
  }

  console.log("Scheduled emails result:", JSON.stringify(results));
  return results;
}

module.exports = router;
module.exports.runScheduledEmails = runScheduledEmails;
