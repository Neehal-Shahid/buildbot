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
    await storeDB.startTrial(existingStore.store_id);
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

  // Generate a unique store ID from the user's name
  const baseSlug = pending.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  const storeId = `${baseSlug}-${randomSuffix}`;

  try {
    // Create the real store record — this is the moment the account comes into existence
    await storeDB.create(storeId, pending.name, email, pending.password, null);

    // Mark email as verified on the newly created store row
    await verifyDB.setVerified(email);

    // Clean up ephemeral data
    await tokenDB.invalidateOtp(email);
    await pendingSignupDB.deleteByEmail(email);

    // Activate the trial (sets trial_started_at and trial_ends)
    await storeDB.startTrial(storeId);

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
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields are required" });

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
router.post("/resend-verification", async (req, res) => {
  const { email, password } = req.body;
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

// ─── VERIFY EMAIL ─────────────────────────────────────────
router.get("/verify-email", async (req, res) => {
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

// ─── VERIFY EMAIL OTP ─────────────────────────────────────
router.post("/verify-email-otp", async (req, res) => {
  const { email, code } = req.body;
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
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
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
      plan: store.plan,
      planStatus: store.plan_status,
      trialEnds: store.trial_ends,
      brandColor: store.brand_color,
      currency: store.currency,
    },
  });
});

// ─── GOOGLE AUTH ──────────────────────────────────────────
router.post("/google-auth", async (req, res) => {
  const { credential } = req.body;
  if (!credential)
    return res.status(400).json({ error: "Credential is required" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const googleId = payload.sub;

    let store = await storeDB.findByEmail(email);

    if (!store) {
      // Create new store for Google user
      const baseSlug = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const randomSuffix = crypto.randomBytes(3).toString("hex");
      const storeId = `${baseSlug}-${randomSuffix}`;

      // Generate a strong random password for Google users
      const randomPassword = crypto.randomBytes(16).toString("hex") + "G@1";
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      await storeDB.create(storeId, name, email, hashedPassword, googleId);
      store = await storeDB.findByEmail(email);
      await pendingSignupDB.deleteByEmail(email); // discard any pending email/password signup

      // Auto-verify their email since Google verified it
      await verifyDB.setVerified(email);
      await storeDB.startTrial(store.store_id);
      sendEmail(welcomeEmail(name, email));
      store = await storeDB.findById(store.store_id);
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
        plan: store.plan,
        planStatus: store.plan_status,
        trialEnds: store.trial_ends,
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
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
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
  sendEmail(passwordResetEmail(store.name, email, resetToken));

  res.json({
    success: true,
    message: "Password reset link sent! Check your email.",
  });
});

// ─── RESET PASSWORD ───────────────────────────────────────
router.post("/reset-password", async (req, res) => {
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
        : "Marketing emails disabled. You will still receive account and billing emails.",
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

// ─── ME ───────────────────────────────────────────────────
router.get("/me", authMiddleware, async (req, res) => {
  const store = await storeDB.findById(req.store.storeId);
  if (!store) return res.status(404).json({ error: "Store not found" });

  await storeDB.ensureTrialDates(store.store_id);
  const refreshed = await storeDB.findById(req.store.storeId);
  const trialDays = Number(await configDB.get("trial_days", "14")) || 14;
  const trialEndsMs = refreshed.trial_ends
    ? new Date(refreshed.trial_ends).getTime()
    : 0;
  const trialDaysLeft = trialEndsMs
    ? Math.max(0, Math.ceil((trialEndsMs - Date.now()) / 86400000))
    : 0;

  const { password, plugin_secret, ...safeStore } = refreshed;
  res.json({
    success: true,
    store: safeStore,
    trialDays,
    trialDaysLeft,
  });
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

// ─── STORE CONFIG (public, for widget) ───────────────────
router.get("/store-config/:storeId", async (req, res) => {
  const store = await storeDB.findById(req.params.storeId);
  if (!store) return res.status(404).json({ error: "Store not found" });

  const active = await storeDB.isActive(req.params.storeId);
  if (
    !active ||
    store.plan_status === "disabled" ||
    store.widget_enabled === 0
  ) {
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
      widgetTitle: "BuildBot",
      welcomeMsg:
        "Tell me your budget and what you need — I will find the best parts from this store for you.",
      buttonText: "Get Started",
      widgetBg: "#1a1d27",
    };
  }

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

// ─── PAYMENT (DASHBOARD) ───────────────────────────────
router.post("/payment", authMiddleware, async (req, res) => {
  const { amount, method, transactionRef, plan } = req.body;
  if (!amount || !method || !transactionRef || !plan)
    return res.status(400).json({ error: "All fields are required" });

  try {
    await paymentDB.create(
      req.store.storeId,
      amount,
      method,
      transactionRef,
      plan,
    );

    // Notify admin of new payment submission
    try {
      const store = await storeDB.findById(req.store.storeId);
      if (store) {
        const {
          sendEmail: _sendEmail,
          adminNewPaymentEmail,
        } = require("../email");
        _sendEmail(
          adminNewPaymentEmail(
            store.name,
            store.email,
            plan,
            amount,
            method,
            transactionRef,
          ),
        );
      }
    } catch {}

    res.json({
      success: true,
      message: "Payment submitted! We will verify and activate your plan.",
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Payment submission failed: " + err.message });
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
