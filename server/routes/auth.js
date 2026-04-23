const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { storeDB, tokenDB, verifyDB } = require('../database');
const { OAuth2Client } = require('google-auth-library');
const {
  sendEmail, welcomeEmail, emailVerificationEmail, passwordResetEmail
} = require('../email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'buildbot-secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ─── PASSWORD STRENGTH CHECK ──────────────────────────────
function isStrongPassword(password) {
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasNumber  = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isLong     = password.length >= 8;
  return hasUpper && hasLower && hasNumber && hasSpecial && isLong;
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.store = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── SIGNUP ───────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });

  if (password.length < 8)
    return res.status(400).json({
      error: 'Password must be at least 8 characters'
    });

  if (!isStrongPassword(password))
    return res.status(400).json({
      error: 'Password must contain uppercase, lowercase, number and special character (e.g. Test@123)'
    });

  const existing = await storeDB.findByEmail(email);
  if (existing)
    return res.status(400).json({ error: 'Email already registered' });

  const baseSlug = name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  const storeId = `${baseSlug}-${randomSuffix}`;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await storeDB.create(storeId, name, email, hashedPassword);
    const store = await storeDB.findByEmail(email);

    // Send verification email
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await tokenDB.save(email, verifyToken, 'verify');
    sendEmail(emailVerificationEmail(name, email, verifyToken));

    // Send welcome email
    sendEmail(welcomeEmail(name, email));

    const token = jwt.sign(
      { storeId: store.store_id, email: store.email, name: store.name },
      JWT_SECRET, { expiresIn: '7d' }
    );

    res.json({
      success: true, token,
      message: 'Account created! Please check your email to verify your address.',
      store: {
        storeId:   store.store_id,
        name:      store.name,
        email:     store.email,
        plan:      store.plan,
        trialEnds: store.trial_ends
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not create account: ' + err.message });
  }
});

// ─── VERIFY EMAIL ─────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token)
    return res.status(400).json({ error: 'Token required' });

  const record = await tokenDB.verify(token, 'verify');
  if (!record)
    return res.status(400).json({ error: 'Invalid or expired verification link' });

  await verifyDB.setVerified(record.email);
  await tokenDB.markUsed(token);

  res.json({ success: true, message: 'Email verified! You can now login.' });
});

// ─── LOGIN ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const store = await storeDB.findByEmail(email);
  if (!store)
    return res.status(400).json({ error: 'No account found with this email' });

  const valid = await bcrypt.compare(password, store.password);
  if (!valid)
    return res.status(400).json({ error: 'Incorrect password' });

  const token = jwt.sign(
    { storeId: store.store_id, email: store.email, name: store.name },
    JWT_SECRET, { expiresIn: '7d' }
  );

  res.json({
    success: true, token,
    store: {
      storeId:    store.store_id,
      name:       store.name,
      email:      store.email,
      plan:       store.plan,
      planStatus: store.plan_status,
      trialEnds:  store.trial_ends,
      brandColor: store.brand_color,
      currency:   store.currency
    }
  });
});

// ─── GOOGLE AUTH ──────────────────────────────────────────
router.post('/google-auth', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Credential is required' });

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
      const baseSlug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const randomSuffix = crypto.randomBytes(3).toString('hex');
      const storeId = `${baseSlug}-${randomSuffix}`;
      
      // Generate a strong random password for Google users
      const randomPassword = crypto.randomBytes(16).toString('hex') + 'G@1';
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      await storeDB.create(storeId, name, email, hashedPassword, googleId);
      store = await storeDB.findByEmail(email);

      // Auto-verify their email since Google verified it
      await verifyDB.setVerified(email);
      sendEmail(welcomeEmail(name, email));
    }

    const token = jwt.sign(
      { storeId: store.store_id, email: store.email, name: store.name },
      JWT_SECRET, { expiresIn: '7d' }
    );

    res.json({
      success: true, token,
      store: {
        storeId:    store.store_id,
        name:       store.name,
        email:      store.email,
        plan:       store.plan,
        planStatus: store.plan_status,
        trialEnds:  store.trial_ends,
        brandColor: store.brand_color,
        currency:   store.currency
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ error: 'Email required' });

  const store = await storeDB.findByEmail(email);

  // Always return success (don't reveal if email exists)
  if (!store)
    return res.json({
      success: true,
      message: 'If this email exists, a reset link has been sent.'
    });

  const resetToken = crypto.randomBytes(32).toString('hex');
  await tokenDB.save(email, resetToken, 'reset');
  sendEmail(passwordResetEmail(store.name, email, resetToken));

  res.json({
    success: true,
    message: 'Password reset link sent! Check your email.'
  });
});

// ─── RESET PASSWORD ───────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ error: 'Token and password required' });

  if (!isStrongPassword(password))
    return res.status(400).json({
      error: 'Password must contain uppercase, lowercase, number and special character'
    });

  const record = await tokenDB.verify(token, 'reset');
  if (!record)
    return res.status(400).json({ error: 'Invalid or expired reset link' });

  const hashedPassword = await bcrypt.hash(password, 10);
  await storeDB.updatePassword(record.email, hashedPassword);
  await tokenDB.markUsed(token);

  res.json({ success: true, message: 'Password reset successfully! You can now login.' });
});

// ─── CHANGE PASSWORD (DASHBOARD) ──────────────────────────
router.put('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Both current and new password are required' });

  if (!isStrongPassword(newPassword))
    return res.status(400).json({
      error: 'New password must contain uppercase, lowercase, number and special character'
    });

  const store = await storeDB.findById(req.store.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  const valid = await bcrypt.compare(currentPassword, store.password);
  if (!valid)
    return res.status(400).json({ error: 'Current password is incorrect' });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await storeDB.updatePassword(store.email, hashedPassword);

  res.json({ success: true, message: 'Password changed successfully!' });
});

// ─── ME ───────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const store = await storeDB.findById(req.store.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  const { password, ...safeStore } = store;
  res.json({ success: true, store: safeStore });
});

// ─── SETTINGS ─────────────────────────────────────────────
router.put('/settings', authMiddleware, async (req, res) => {
  const { brandColor, currency } = req.body;
  if (!brandColor || !currency)
    return res.status(400).json({ error: 'Brand color and currency required' });
  try {
    await storeDB.updateBranding(req.store.storeId, brandColor, currency);
    res.json({ success: true, message: 'Settings saved!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STORE CONFIG (public, for widget) ───────────────────
router.get('/store-config/:storeId', async (req, res) => {
  const store = await storeDB.findById(req.params.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  // Get widget customization settings
  const { widgetDB } = require('../database');
  let widgetSettings = {};
  try {
    widgetSettings = await widgetDB.getSettings(req.params.storeId);
  } catch(e) {
    widgetSettings = {
      widgetTitle: 'BuildBot',
      welcomeMsg:  'Tell me your budget and what you need — I will find the best parts from this store for you.',
      buttonText:  'Get Started',
      widgetBg:    '#1a1d27'
    };
  }

  res.json({
    success:       true,
    brandColor:    store.brand_color   || '#7c6af7',
    currency:      store.currency      || 'PKR',
    widgetTitle:   widgetSettings.widgetTitle,
    welcomeMsg:    widgetSettings.welcomeMsg,
    buttonText:    widgetSettings.buttonText,
    widgetBg:      widgetSettings.widgetBg,
    widgetEnabled: store.widget_enabled !== 0
  });
});

// test-email route removed for security

// ─── WIDGET SETTINGS ──────────────────────────────────────
router.put('/widget-settings', authMiddleware, async (req, res) => {
  const { widgetTitle, welcomeMsg, buttonText, widgetBg } = req.body;
  if (!widgetTitle || !welcomeMsg || !buttonText)
    return res.status(400).json({ error: 'All fields are required' });
  if (widgetTitle.length > 30)
    return res.status(400).json({ error: 'Widget title must be 30 characters or less' });
  if (welcomeMsg.length > 200)
    return res.status(400).json({ error: 'Welcome message must be 200 characters or less' });
  if (buttonText.length > 20)
    return res.status(400).json({ error: 'Button text must be 20 characters or less' });
  try {
    const { widgetDB } = require('../database');
    await widgetDB.updateSettings(
      req.store.storeId, widgetTitle, welcomeMsg, buttonText, widgetBg || '#1a1d27'
    );
    res.json({ success: true, message: 'Widget settings saved!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, authMiddleware };