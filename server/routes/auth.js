const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  storeDB,
  tokenDB,
  verifyDB,
  configDB,
  pendingSignupDB,
} = require("../database");
const { OAuth2Client } = require("google-auth-library");
const rateLimit = require("express-rate-limit");
const { isValidPhoneNumber } = require("libphonenumber-js");
const {
  sendEmail,
  welcomeEmail,
  emailVerificationEmail,
  passwordResetEmail,
} = require("../email");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "buildbot-secret";
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for auth routes
  message: { error: "Too many attempts, please try again after 15 minutes" }
});

// ─── PASSWORD STRENGTH CHECK ──────────────────────────────
function isStrongPassword(password) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isLong = password.length >= 8;
  return hasUpper && hasLower && hasNumber && hasSpecial && isLong;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Emails are matched case-insensitively everywhere in practice (Gmail,
// Outlook, etc. all ignore case), so every entry point normalizes to
// lowercase before touching the DB. Without this, "John@x.com" (signup)
// and "john@x.com" (Google, which can return either casing) would be
// treated as two different accounts — defeating the one-account-per-email
// rule across signup methods.
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function sendVerificationEmail(name, email) {
  const verifyToken = crypto.randomBytes(32).toString("hex");
  await tokenDB.save(email, verifyToken, "verify");

  const otpCode = String(crypto.randomInt(100000, 999999));
  const otpHash = await bcrypt.hash(otpCode, 10);
  await tokenDB.saveOtp(email, otpHash);

  await sendEmail(emailVerificationEmail(name, email, verifyToken, otpCode));
}

async function completeEmailVerification(email) {
  // Idempotency guard: if the store already exists and is verified, bail out
  const existingStore = await storeDB.findByEmail(email);
  if (existingStore && existingStore.email_verified === 1) {
    return existingStore;
  }

  // Legacy path: unverified store row already exists (pre-migration accounts)
  if (existingStore && existingStore.email_verified !== 1) {
    await verifyDB.setVerified(email);
    await tokenDB.invalidateOtp(email);
    await sendEmail(welcomeEmail(existingStore.name, existingStore.email));
    const { adminNewStoreEmail } = require("../email");
    await sendEmail(
      adminNewStoreEmail(
        existingStore.name,
        existingStore.email,
        existingStore.store_id,
      ),
    );
    return await storeDB.findById(existingStore.store_id);
  }

  // New flow: no store row yet — read data from pending_signups
  const pending = await pendingSignupDB.findByEmail(email);
  if (!pending) {
    // Signup data was cleaned up (e.g. older than 7 days); nothing to create
    return null;
  }

  // Generate a temporary store ID for the onboarding session
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const storeId = `temp-${randomSuffix}`;

  try {
    // Create the real store record — this is the moment the account comes into existence
    await storeDB.create(storeId, pending.name, email, pending.password, null);

    // Mark email as verified on the newly created store row
    await verifyDB.setVerified(email);

    // Clean up ephemeral data
    await tokenDB.invalidateOtp(email);
    await pendingSignupDB.deleteByEmail(email);

    // Notify user and admin
    await sendEmail(welcomeEmail(pending.name, email));
    const { adminNewStoreEmail } = require("../email");
    await sendEmail(adminNewStoreEmail(pending.name, email, storeId));

    return await storeDB.findById(storeId);
  } catch (err) {
    // Handle rare race condition: store may have just been created by a concurrent request
    const raceStore = await storeDB.findByEmail(email);
    if (raceStore) return raceStore;
    throw err;
  }
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────
async function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    req.store = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const isVerified = await verifyDB.isVerified(req.store.email);
  if (!isVerified) {
    return res.status(403).json({
      error: "Please verify your email before accessing the dashboard.",
      requiresVerification: true,
    });
  }

  next();
}

// ─── SIGNUP ───────────────────────────────────────────────
router.post("/signup", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  const name = "setup-pending";

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  if (!isValidEmail(email))
    return res
      .status(400)
      .json({ error: "Please enter a valid email address" });

  if (password.length < 8)
    return res.status(400).json({
      error: "Password must be at least 8 characters",
    });

  if (!isStrongPassword(password))
    return res.status(400).json({
      error:
        "Password must contain uppercase, lowercase, number and special character (e.g. Test@123)",
    });

  // If a verified store already exists for this email, reject
  const existingStore = await storeDB.findByEmail(email);
  if (existingStore) {
    const isVerified = await verifyDB.isVerified(email);
    if (isVerified)
      return res.status(400).json({ error: "Email already registered" });

    // Legacy path: an unverified store row exists (pre-migration accounts).
    // Update the credentials in place and resend the verification email.
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      await storeDB.updateUnverifiedAccount(
        existingStore.store_id,
        name,
        hashedPassword,
      );
      await sendVerificationEmail(name, email);
      return res.json({
        success: true,
        requiresVerification: true,
        email,
        message:
          "Account already exists but is not verified. We sent a new verification link to your email.",
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Could not update account: " + err.message });
    }
  }

  // New flow: store credentials temporarily in pending_signups (no store row created yet)
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const existingPending = await pendingSignupDB.findByEmail(email);
    if (existingPending) {
      // Update credentials and resend — user may have mistyped their password or wants a fresh link
      await pendingSignupDB.upsert(name, email, hashedPassword);
      await sendVerificationEmail(name, email);
      return res.json({
        success: true,
        requiresVerification: true,
        email,
        message:
          "We sent a new verification link to your email. Please check your inbox.",
      });
    }

    // First-time signup: save pending record and send verification
    await pendingSignupDB.create(name, email, hashedPassword);
    await sendVerificationEmail(name, email);

    res.json({
      success: true,
      requiresVerification: true,
      email,
      message:
        "Check your email and click the verification link to complete your account setup.",
    });
  } catch (err) {
    res.status(500).json({ error: "Could not process signup: " + err.message });
  }
});

// ─── RESEND VERIFICATION ──────────────────────────────────
router.post("/resend-verification", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  // Check verified store first (already completed)
  const store = await storeDB.findByEmail(email);
  if (store) {
    const isVerified = await verifyDB.isVerified(email);
    if (isVerified)
      return res.json({
        success: true,
        message: "Your email is already verified. You can sign in now.",
      });

    // Legacy path: unverified store row — validate password against stores table
    const valid = await bcrypt.compare(password, store.password);
    if (!valid) return res.status(400).json({ error: "Incorrect password" });

    if (await tokenDB.recentlyCreated(email, "verify", 60))
      return res
        .status(429)
        .json({
          error:
            "Please wait 60 seconds before requesting another verification email.",
        });

    await sendVerificationEmail(store.name, email);
    return res.json({
      success: true,
      message: "Verification email sent! Check your inbox and spam folder.",
    });
  }

  // New flow: validate password against pending_signups
  const pending = await pendingSignupDB.findByEmail(email);
  if (!pending)
    return res.status(400).json({ error: "No account found with this email" });

  const valid = await bcrypt.compare(password, pending.password);
  if (!valid) return res.status(400).json({ error: "Incorrect password" });

  if (await tokenDB.recentlyCreated(email, "verify", 60))
    return res
      .status(429)
      .json({
        error:
          "Please wait 60 seconds before requesting another verification email.",
      });

  await sendVerificationEmail(pending.name, email);
  res.json({
    success: true,
    message: "Verification email sent! Check your inbox and spam folder.",
  });
});

// ─── VERIFY EMAIL (MAGIC LINK) ────────────────────────────
router.get("/verify-email", authLimiter, async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token required" });

  const record = await tokenDB.verify(token, "verify");
  if (!record)
    return res
      .status(400)
      .json({ error: "Invalid or expired verification link" });

  await tokenDB.markUsed(token);

  const already = await verifyDB.isVerified(record.email);
  if (!already) {
    const result = await completeEmailVerification(record.email);
    if (!result) {
      return res.status(400).json({
        error:
          "Your signup session has expired. Please sign up again to get a new verification link.",
      });
    }
  }

  res.json({ success: true, message: "Email verified! You can now sign in." });
});

// ─── VERIFY EMAIL (OTP) ───────────────────────────────────
router.post("/verify-email-otp", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = req.body.otp;
  const code = otp || req.body.code; // support both
  if (!email || !code)
    return res
      .status(400)
      .json({ error: "Email and verification code are required" });

  const isVerified = await verifyDB.isVerified(email);
  if (isVerified)
    return res.json({
      success: true,
      message: "Email already verified. You can sign in now.",
    });

  const otpRecord = await tokenDB.getActiveOtp(email);
  if (!otpRecord)
    return res
      .status(400)
      .json({ error: "No active verification code. Request a new one." });

  if ((otpRecord.attempt_count ?? 0) >= 5) {
    await tokenDB.invalidateOtp(email);
    return res.status(400).json({
      error:
        "Too many incorrect attempts. Please request a new verification email.",
    });
  }

  const valid = await bcrypt.compare(String(code).trim(), otpRecord.token);
  if (!valid) {
    await tokenDB.incrementOtpAttempts(email);
    const remaining = 5 - ((otpRecord.attempt_count ?? 0) + 1);
    return res.status(400).json({
      error:
        remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many incorrect attempts. Please request a new verification email.",
    });
  }

  await tokenDB.invalidateOtp(email);
  const result = await completeEmailVerification(email);
  if (!result) {
    return res.status(400).json({
      error:
        "Your signup session has expired. Please sign up again to get a new verification link.",
    });
  }

  res.json({ success: true, message: "Email verified! You can now sign in." });
});

// ─── LOGIN ────────────────────────────────────────────────
router.post("/login", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const store = await storeDB.findByEmail(email);
  if (!store) {
    // Give a helpful error if the user signed up but hasn't verified yet
    const pending = await pendingSignupDB.findByEmail(email);
    if (pending) {
      return res.status(403).json({
        error:
          "Please verify your email before logging in. Check your inbox for the verification link.",
        requiresVerification: true,
        email,
      });
    }
    return res.status(400).json({ error: "No account found with this email" });
  }

  const valid = await bcrypt.compare(password, store.password);
  if (!valid) return res.status(400).json({ error: "Incorrect password" });

  const isVerified = await verifyDB.isVerified(email);
  if (!isVerified) {
    return res.status(403).json({
      error:
        "Please verify your email before logging in. Check your inbox for the verification link.",
      requiresVerification: true,
    });
  }

  const token = jwt.sign(
    { storeId: store.store_id, email: store.email, name: store.name },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.json({
    success: true,
    token,
    store: {
      storeId: store.store_id,
      name: store.name,
      email: store.email,
      planStatus: store.plan_status,
      brandColor: store.brand_color,
      currency: store.currency,
    },
  });
});

// ─── GOOGLE LOGIN/SIGNUP ──────────────────────────────────
router.post("/google-auth", authLimiter, async (req, res) => {
  const { credential } = req.body;
  if (!credential)
    return res.status(400).json({ error: "Credential is required" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = normalizeEmail(payload.email);
    const name = payload.name;
    const googleId = payload.sub;

    let store = await storeDB.findByEmail(email);
    let isNewAccount = false;

    if (!store) {
      // Create new store for Google user with temporary ID
      const randomSuffix = crypto.randomBytes(4).toString("hex");
      const storeId = `temp-${randomSuffix}`;
      const storeName = "setup-pending";

      // Generate a strong random password for Google users
      const randomPassword = crypto.randomBytes(16).toString("hex") + "G@1";
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      await storeDB.create(storeId, storeName, email, hashedPassword, googleId);
      store = await storeDB.findByEmail(email);
      await pendingSignupDB.deleteByEmail(email); // discard any pending email/password signup

      // Auto-verify their email since Google verified it
      await verifyDB.setVerified(email);
      await sendEmail(welcomeEmail(name, email));
      store = await storeDB.findById(store.store_id);
      isNewAccount = true;
    } else {
      // Existing account — Google confirms email ownership; verify if still pending
      const isVerified = await verifyDB.isVerified(email);
      if (!isVerified) {
        await verifyDB.setVerified(email);
        store = await storeDB.findById(store.store_id);
      }
    }

    const token = jwt.sign(
      { storeId: store.store_id, email: store.email, name: store.name },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      token,
      isNewAccount,
      store: {
        storeId: store.store_id,
        name: store.name,
        email: store.email,
        planStatus: store.plan_status,
        brandColor: store.brand_color,
        currency: store.currency,
      },
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────
router.post("/forgot-password", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) return res.status(400).json({ error: "Email required" });

  const store = await storeDB.findByEmail(email);

  // Always return success (don't reveal if email exists)
  if (!store)
    return res.json({
      success: true,
      message: "If this email exists, a reset link has been sent.",
    });

  const resetToken = crypto.randomBytes(32).toString("hex");
  await tokenDB.save(email, resetToken, "reset");
  await sendEmail(passwordResetEmail(store.name, email, resetToken));

  res.json({
    success: true,
    message: "Password reset link sent! Check your email.",
  });
});

// ─── RESET PASSWORD ───────────────────────────────────────
router.post("/reset-password", authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ error: "Token and password required" });

  if (!isStrongPassword(password))
    return res.status(400).json({
      error:
        "Password must contain uppercase, lowercase, number and special character",
    });

  const record = await tokenDB.verify(token, "reset");
  if (!record)
    return res.status(400).json({ error: "Invalid or expired reset link" });

  const hashedPassword = await bcrypt.hash(password, 10);
  await storeDB.updatePassword(record.email, hashedPassword);
  await tokenDB.markUsed(token);

  res.json({
    success: true,
    message: "Password reset successfully! You can now login.",
  });
});

// ─── CHANGE PASSWORD (DASHBOARD) ──────────────────────────
router.put("/change-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res
      .status(400)
      .json({ error: "Both current and new password are required" });

  if (!isStrongPassword(newPassword))
    return res.status(400).json({
      error:
        "New password must contain uppercase, lowercase, number and special character",
    });

  const store = await storeDB.findById(req.store.storeId);
  if (!store) return res.status(404).json({ error: "Store not found" });

  const valid = await bcrypt.compare(currentPassword, store.password);
  if (!valid)
    return res.status(400).json({ error: "Current password is incorrect" });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await storeDB.updatePassword(store.email, hashedPassword);

  res.json({ success: true, message: "Password changed successfully!" });
});

// ─── COMPLETE STORE SETUP ─────────────────────────────────
router.put("/store-setup", authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === "")
    return res.status(400).json({ error: "Store name is required" });

  const oldStoreId = req.store.storeId;
  if (!oldStoreId.startsWith("temp-")) {
    return res.status(400).json({ error: "Store is already set up" });
  }

  const cleanName = name.trim();
  const baseSlug = cleanName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  if (!baseSlug) return res.status(400).json({ error: "Invalid store name" });

  const randomSuffix = crypto.randomBytes(3).toString("hex");
  const newStoreId = `${baseSlug}-${randomSuffix}`;

  try {
    await storeDB.upgradeSetup(oldStoreId, newStoreId, cleanName);

    // Issue a new token with the permanent store ID
    const token = jwt.sign(
      { storeId: newStoreId, email: req.store.email, name: cleanName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, storeId: newStoreId, name: cleanName });
  } catch (err) {
    res.status(500).json({ error: "Could not complete setup: " + err.message });
  }
});

// ─── MARKETING EMAIL PREFERENCE ───────────────────────────
router.put("/email-preferences", authMiddleware, async (req, res) => {
  const { marketingEmailsEnabled } = req.body;
  if (marketingEmailsEnabled === undefined)
    return res
      .status(400)
      .json({ error: "marketingEmailsEnabled is required" });

  try {
    await storeDB.setMarketingEmails(
      req.store.storeId,
      !!marketingEmailsEnabled,
    );
    res.json({
      success: true,
      message: marketingEmailsEnabled
        ? "Marketing emails enabled"
        : "Marketing emails disabled. You will still receive account emails.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SUPPORT TICKET (store owner → admin) ─────────────────
router.post("/support", authMiddleware, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message)
    return res.status(400).json({ error: "Subject and message are required" });
  if (subject.length > 150)
    return res.status(400).json({ error: "Subject too long (max 150 chars)" });
  if (message.length > 2000)
    return res.status(400).json({ error: "Message too long (max 2000 chars)" });

  try {
    const store = await storeDB.findById(req.store.storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });

    const { supportTicketDB } = require("../database");
    const {
      sendEmail,
      supportTicketAdminEmail,
      supportTicketConfirmationEmail,
    } = require("../email");

    const ticketId = await supportTicketDB.create(
      store.store_id,
      store.name,
      store.email,
      subject.trim(),
      message.trim(),
    );

    await sendEmail(
      supportTicketAdminEmail(
        store.name,
        store.email,
        store.store_id,
        subject.trim(),
        message.trim(),
        ticketId,
      ),
    );
    await sendEmail(
      supportTicketConfirmationEmail(
        store.name,
        store.email,
        subject.trim(),
        ticketId,
      ),
    );

    res.json({
      success: true,
      ticketId,
      message: `Support request #${ticketId} submitted. We will respond within 24 hours.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MY SUPPORT TICKETS ───────────────────────────────────
router.get("/support", authMiddleware, async (req, res) => {
  try {
    const { supportTicketDB } = require("../database");
    const tickets = await supportTicketDB.getByStore(req.store.storeId);
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ORDER REQUESTS ────────────────────────────────────────
// The ground-truth record of what customers actually clicked "Order" on —
// written server-side at order time (see /order-request in recommend.js),
// so a store owner can cross-check it against a WhatsApp message a
// customer may have edited before sending.
router.get("/order-requests", authMiddleware, async (req, res) => {
  try {
    const { orderRequestDB } = require("../database");
    const orders = await orderRequestDB.getByStore(req.store.storeId);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ME ───────────────────────────────────────────────────
router.get("/me", authMiddleware, async (req, res) => {
  const store = await storeDB.findById(req.store.storeId);
  if (!store) return res.status(404).json({ error: "Store not found" });

  const { password, plugin_secret, ...safeStore } = store;
  res.json({
    success: true,
    store: safeStore,
  });
});

// ─── TOGGLE WIDGET ────────────────────────────────────────
router.post("/widget-toggle", authMiddleware, async (req, res) => {
  const { enabled } = req.body;
  if (enabled === undefined)
    return res.status(400).json({ error: "enabled field is required" });

  try {
    if (enabled) {
      // Every live widget must have a real way for the customer to
      // actually place the order — WooCommerce cart, or a verified
      // WhatsApp number (an unverified one could be a typo/fake).
      const store = await storeDB.findById(req.store.storeId);
      if (!store) return res.status(404).json({ error: "Store not found" });
      const hasOrderMethod =
        !!store.woo_connected ||
        (!!store.whatsapp_number && !!store.whatsapp_verified);
      if (!hasOrderMethod)
        return res.status(400).json({
          error:
            "Connect WooCommerce or add and verify a WhatsApp number in Settings before turning the widget on — customers need a way to actually place their order.",
        });
    }

    const { client } = require("../database");
    await client.execute({
      sql: "UPDATE stores SET widget_enabled = ? WHERE store_id = ?",
      args: [enabled ? 1 : 0, req.store.storeId],
    });

    res.json({
      success: true,
      widgetEnabled: enabled,
      message: enabled ? "Widget has been enabled." : "Widget has been disabled.",
    });
  } catch (err) {
    res.status(500).json({ error: "Could not toggle widget: " + err.message });
  }
});

// ─── SETTINGS ─────────────────────────────────────────────
router.put("/settings", authMiddleware, async (req, res) => {
  const { brandColor, currency } = req.body;
  if (!brandColor || !currency)
    return res.status(400).json({ error: "Brand color and currency required" });
  try {
    await storeDB.updateBranding(req.store.storeId, brandColor, currency);
    res.json({ success: true, message: "Settings saved!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WHATSAPP ORDERING NUMBER ─────────────────────────────
// Used by the widget's "Order via WhatsApp" fallback for stores that
// aren't WooCommerce-connected — customers land in a chat with the full
// build pre-filled instead of an automated cart.
//
// No paid WhatsApp Business API is wired up, so we can't confirm delivery
// — but libphonenumber-js (Google's own number-formatting rules, no
// network call, no cost) catches most fake/typo'd numbers up front by
// checking real per-country length and prefix rules, which a plain regex
// can't do (e.g. it rejects "+11234567890123" even though a naive
// digit-count regex would happily accept it).
router.put("/settings/whatsapp", authMiddleware, async (req, res) => {
  const raw = String(req.body.whatsappNumber || "").trim();
  let digits = raw.replace(/[\s()-]/g, "");
  if (digits && !digits.startsWith("+")) digits = `+${digits}`;

  if (raw && !isValidPhoneNumber(digits))
    return res.status(400).json({
      error:
        "That doesn't look like a real WhatsApp number. Enter it with country code, e.g. +923001234567",
    });

  try {
    await storeDB.updateWhatsappNumber(req.store.storeId, digits);
    res.json({
      success: true,
      message: digits
        ? "WhatsApp number saved — now verify it before it can be used for orders."
        : "WhatsApp ordering number removed.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verification is done via Firebase Phone Auth: the dashboard sends the
// SMS OTP directly from the client using Firebase's own infrastructure
// (free up to 10k verifications/month), then hands us the resulting
// Firebase ID token. We verify that token server-side and only mark the
// number verified if the phone number Firebase actually confirmed matches
// the number saved on the store — this is real proof of delivery/ownership
// (unlike the earlier free click-to-confirm flow), it just proves phone
// ownership rather than WhatsApp-specifically, since Firebase verifies via
// SMS, not WhatsApp. In practice a number that can receive SMS is almost
// always usable on WhatsApp too (WhatsApp itself verifies numbers by SMS).
router.post(
  "/settings/whatsapp/verify-firebase",
  authMiddleware,
  async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "idToken is required" });

    const store = await storeDB.findById(req.store.storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });
    if (!store.whatsapp_number)
      return res.status(400).json({ error: "Save a WhatsApp number first" });

    try {
      const admin = require("../firebaseAdmin");
      const decoded = await admin.auth().verifyIdToken(idToken);
      const verifiedNumber = decoded.phone_number;

      if (!verifiedNumber || verifiedNumber !== store.whatsapp_number) {
        return res.status(400).json({
          error:
            "The verified number doesn't match the number saved on your account — verify the same number you entered above.",
        });
      }

      await storeDB.markWhatsappVerified(req.store.storeId);
      res.json({ success: true, message: "Number verified!" });
    } catch (err) {
      res.status(400).json({ error: "Could not verify code: " + err.message });
    }
  },
);

// ─── STORE CONFIG (public, for widget) ───────────────────
router.get("/store-config/:storeId", async (req, res) => {
  const store = await storeDB.findById(req.params.storeId);
  if (!store) return res.status(404).json({ error: "Store not found" });

  const active = await storeDB.isActive(req.params.storeId);
  if (!active || store.widget_enabled === 0) {
    return res.json({
      success: true,
      active: false,
      widgetEnabled: false,
    });
  }

  // Get widget customization settings
  const { widgetDB } = require("../database");
  let widgetSettings = {};
  try {
    widgetSettings = await widgetDB.getSettings(req.params.storeId);
  } catch (e) {
    widgetSettings = {
      widgetTitle: "BuildVolt",
      welcomeMsg:
        "Tell me your budget and what you need — I will find the best parts from this store for you.",
      buttonText: "Get Started",
      widgetBg: "#1a1d27",
    };
  }

  // Get budget presets from platform config
  const { configDB } = require("../database");
  let budgetPresets = [50000, 80000, 120000, 200000]; // fallback defaults
  try {
    const rawPresets = await configDB.get("budget_presets", "");
    if (rawPresets) {
      const parsed = rawPresets.split(",").map(v => parseInt(v.trim())).filter(v => !isNaN(v) && v > 0);
      if (parsed.length >= 2) budgetPresets = parsed;
    }
  } catch (_) {}

  res.json({
    success: true,
    active: true,
    brandColor: store.brand_color || "#7c6af7",
    currency: store.currency || "PKR",
    widgetTitle: widgetSettings.widgetTitle,
    welcomeMsg: widgetSettings.welcomeMsg,
    buttonText: widgetSettings.buttonText,
    widgetBg: widgetSettings.widgetBg,
    widgetEnabled: store.widget_enabled !== 0,
    budgetPresets,
    // Ordering: WooCommerce-connected stores get one-click cart checkout;
    // everyone else falls back to a WhatsApp order handoff — only once
    // that number has actually been verified (see /settings/whatsapp),
    // so customers never message a typo'd or fake number.
    wooConnected: !!store.woo_connected,
    wooUrl: store.woo_connected ? store.woo_url || "" : "",
    whatsappNumber: store.whatsapp_verified ? store.whatsapp_number || "" : "",
  });
});

// test-email route removed for security

// ─── WIDGET SETTINGS ──────────────────────────────────────
router.put("/widget-settings", authMiddleware, async (req, res) => {
  const { widgetTitle, welcomeMsg, buttonText, widgetBg } = req.body;
  if (!widgetTitle || !welcomeMsg || !buttonText)
    return res.status(400).json({ error: "All fields are required" });
  if (widgetTitle.length > 30)
    return res
      .status(400)
      .json({ error: "Widget title must be 30 characters or less" });
  if (welcomeMsg.length > 200)
    return res
      .status(400)
      .json({ error: "Welcome message must be 200 characters or less" });
  if (buttonText.length > 20)
    return res
      .status(400)
      .json({ error: "Button text must be 20 characters or less" });
  try {
    const { widgetDB } = require("../database");
    await widgetDB.updateSettings(
      req.store.storeId,
      widgetTitle,
      welcomeMsg,
      buttonText,
      widgetBg || "#1a1d27",
    );
    res.json({ success: true, message: "Widget settings saved!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE ACCOUNT ───────────────────────────────────────
router.delete("/account", authMiddleware, async (req, res) => {
  try {
    await storeDB.deleteStoreAndData(req.store.storeId);
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Could not delete account: " + err.message });
  }
});

module.exports = { router, authMiddleware };
