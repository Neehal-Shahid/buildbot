const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { storeDB, paymentDB, analyticsDB, productDB, client, adminDB, tokenDB } = require('../database');

const router = express.Router();
const JWT_SECRET   = process.env.JWT_SECRET || 'buildbot-secret';

// Basic brute-force protection for admin auth endpoints
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' }
});

async function enrichStoresWithCounts(stores) {
  if (!stores.length) return stores;
  const ids = stores.map(s => s.store_id);
  const placeholders = ids.map(() => '?').join(',');

  const productCounts = await client.execute({
    sql: `SELECT store_id, COUNT(*) AS count
          FROM products
          WHERE store_id IN (${placeholders})
          GROUP BY store_id`,
    args: ids
  });

  const recCounts = await client.execute({
    sql: `SELECT store_id, COUNT(*) AS count
          FROM recommendations
          WHERE store_id IN (${placeholders})
          GROUP BY store_id`,
    args: ids
  });

  const pMap = new Map(productCounts.rows.map(r => [r.store_id, Number(r.count || 0)]));
  const rMap = new Map(recCounts.rows.map(r => [r.store_id, Number(r.count || 0)]));

  for (const store of stores) {
    store.product_count = pMap.get(store.store_id) || 0;
    store.rec_count = rMap.get(store.store_id) || 0;
  }
  return stores;
}

function adminAuth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Not admin' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.post('/admin/login', adminAuthLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const admin = await adminDB.findByEmail(email);
  if (!admin) return res.status(401).json({ error: 'Invalid admin credentials' });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return res.status(401).json({ error: 'Invalid admin credentials' });

  const token = jwt.sign({ isAdmin: true, id: admin.id, email: admin.email, name: admin.name }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ success: true, token });
});

router.get('/admin/overview', adminAuth, async (req, res) => {
  const storesRaw = await storeDB.getAll();
  const stores    = await enrichStoresWithCounts(storesRaw);
  const totalRecs = await analyticsDB.getTotalRecs();
  const revenue   = await paymentDB.getRevenue();
  const pending   = await paymentDB.getPending();

  res.json({ success: true, stores, totalRecs, revenue, pending });
});

router.get('/admin/stores', adminAuth, async (req, res) => {
  const storesRaw = await storeDB.getAll();
  const stores = await enrichStoresWithCounts(storesRaw);
  res.json({ success: true, stores });
});

router.get('/admin/payments', adminAuth, async (req, res) => {
  const payments = await paymentDB.getAll();
  res.json({ success: true, payments });
});

router.post('/admin/approve-payment', adminAuth, async (req, res) => {
  const { id, storeId, plan } = req.body;
  await paymentDB.approve(id, storeId, plan);

  // Send email notification
  const store = await storeDB.findById(storeId);
  if (store) {
    const { sendEmail, paymentApprovedEmail } = require('../email');
    sendEmail(paymentApprovedEmail(store.name, store.email, plan));
  }

  res.json({ success: true });
});

router.post('/admin/reject-payment', adminAuth, async (req, res) => {
  const { id, storeId, plan } = req.body;
  await paymentDB.reject(id);

  // Send email notification
  if (storeId && plan) {
    const store = await storeDB.findById(storeId);
    if (store) {
      const { sendEmail, paymentRejectedEmail } = require('../email');
      sendEmail(paymentRejectedEmail(store.name, store.email, plan));
    }
  }

  res.json({ success: true });
});

router.post('/admin/disable-store', adminAuth, async (req, res) => {
  await storeDB.disableStore(req.body.storeId);
  res.json({ success: true });
});

router.post('/admin/delete-store', adminAuth, async (req, res) => {
  const storeId = String(req.body.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  try {
    const store = await storeDB.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    await storeDB.deleteStoreAndData(storeId);

    res.json({ success: true, message: 'Store and all related data deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/activate-store', adminAuth, async (req, res) => {
  await storeDB.activateStore(req.body.storeId);
  res.json({ success: true });
});

router.post('/admin/forgot-password', adminAuthLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const admin = await adminDB.findByEmail(email);
  if (!admin) return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  await tokenDB.save(email, resetToken, 'admin_reset');
  const { sendEmail, adminPasswordResetEmail } = require('../email');
  sendEmail(adminPasswordResetEmail(admin.name, email, resetToken));

  res.json({ success: true, message: 'Password reset link sent! Check your email.' });
});

router.post('/admin/reset-password', adminAuthLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const record = await tokenDB.verify(token, 'admin_reset');
  if (!record) return res.status(400).json({ error: 'Invalid or expired reset link' });

  const hashedPassword = await bcrypt.hash(password, 10);
  await adminDB.updatePassword(record.email, hashedPassword);
  await tokenDB.markUsed(token);

  res.json({ success: true, message: 'Admin password reset successfully! You can now login.' });
});

router.put('/admin/profile', adminAuth, async (req, res) => {
  const { name, email } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  
  try {
    await adminDB.updateProfile(decoded.id, name, email);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/password', adminAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Passwords required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const admin = await adminDB.findById(decoded.id);
  if (!admin) return res.status(404).json({ error: 'Admin not found' });

  const valid = await bcrypt.compare(currentPassword, admin.password);
  if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await adminDB.updatePassword(admin.email, hashedPassword);

  res.json({ success: true, message: 'Password changed successfully' });
});

router.get('/admin/me', adminAuth, async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  const admin = await adminDB.findById(decoded.id);
  if (!admin) return res.status(404).json({ error: 'Admin not found' });
  res.json({ success: true, admin: { name: admin.name, email: admin.email } });
});

// ─── DB INTEGRITY AUDIT (admin only) ──────────────────────
router.get('/admin/db-audit', adminAuth, async (req, res) => {
  try {
    const tables = ['stores', 'products', 'recommendations', 'payments', 'tokens', 'trial_emails_sent'];
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
    const orphanPayments = await client.execute(`
      SELECT COUNT(*) AS c
      FROM payments p
      LEFT JOIN stores s ON s.store_id = p.store_id
      WHERE s.store_id IS NULL
    `);
    const orphanTrials = await client.execute(`
      SELECT COUNT(*) AS c
      FROM trial_emails_sent t
      LEFT JOIN stores s ON s.store_id = t.store_id
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
        payments: Number(orphanPayments.rows[0]?.c || 0),
        trialEmailsSent: Number(orphanTrials.rows[0]?.c || 0),
        orphanProductsTop: topStoresByOrphans.rows
      },
      tokens: {
        expired: Number(expiredTokens.rows[0]?.c || 0),
        used: Number(usedTokens.rows[0]?.c || 0)
      },
      notes: [
        'Orphan counts > 0 indicate non-cascaded deletes or manual DB edits.',
        'Expired/used tokens can be periodically cleaned up without affecting app behavior.'
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual plan override
router.post('/admin/set-plan', adminAuth, async (req, res) => {
  const { storeId, plan, planStatus, planEnds } = req.body;
  if (!storeId || !plan || !planStatus)
    return res.status(400).json({ error: 'storeId, plan and planStatus required' });
  const validPlans = ['trial', 'starter', 'growth', 'pro'];
  if (!validPlans.includes(plan))
    return res.status(400).json({ error: 'Invalid plan. Must be: trial, starter, growth, pro' });
  try {
    await storeDB.setPlan(storeId, plan, planStatus, planEnds || null);
    res.json({ success: true, message: `Plan updated to ${plan} (${planStatus})` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trial extension
router.post('/admin/extend-trial', adminAuth, async (req, res) => {
  const { storeId, days } = req.body;
  if (!storeId || !days)
    return res.status(400).json({ error: 'storeId and days required' });
  const daysNum = Number(days);
  if (daysNum < 1 || daysNum > 90)
    return res.status(400).json({ error: 'Days must be between 1 and 90' });
  try {
    await storeDB.extendTrial(storeId, daysNum);
    res.json({ success: true, message: `Trial extended by ${daysNum} days` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual email to a specific store
router.post('/admin/send-email', adminAuth, async (req, res) => {
  const { storeId, subject, message } = req.body;
  if (!storeId || !subject || !message)
    return res.status(400).json({ error: 'storeId, subject and message required' });
  if (subject.length > 150)
    return res.status(400).json({ error: 'Subject too long (max 150 chars)' });
  if (message.length > 2000)
    return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
  try {
    const store = await storeDB.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    const { sendEmail, adminManualEmail } = require('../email');
    await sendEmail(adminManualEmail(store.name, store.email, subject, message));
    res.json({ success: true, message: `Email sent to ${store.email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast to all or filtered stores
router.post('/admin/broadcast', adminAuth, async (req, res) => {
  const { subject, message, targetPlan } = req.body;
  if (!subject || !message)
    return res.status(400).json({ error: 'subject and message required' });
  if (subject.length > 150)
    return res.status(400).json({ error: 'Subject too long (max 150 chars)' });
  if (message.length > 2000)
    return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
  try {
    const allStores = await storeDB.getAll();
    const targets = targetPlan
      ? allStores.filter(s => s.plan === targetPlan && s.plan_status !== 'disabled')
      : allStores.filter(s => s.plan_status !== 'disabled');
    const { sendEmail, adminManualEmail } = require('../email');
    let sent = 0;
    for (const store of targets) {
      try {
        await sendEmail(adminManualEmail(store.name, store.email, subject, message));
        sent++;
      } catch {}
    }
    res.json({ success: true, message: `Broadcast sent to ${sent} store${sent !== 1 ? 's' : ''}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save internal admin notes for a store
router.post('/admin/save-notes', adminAuth, async (req, res) => {
  const { storeId, notes } = req.body;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  if ((notes || '').length > 1000)
    return res.status(400).json({ error: 'Notes too long (max 1000 chars)' });
  try {
    await storeDB.setNotes(storeId, notes || '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View a store's product catalog
router.get('/admin/store-products/:storeId', adminAuth, async (req, res) => {
  try {
    const products = await productDB.getByStore(req.params.storeId);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger scheduled email jobs
router.post('/admin/run-drip', adminAuth, async (req, res) => {
  try {
    const results = await runScheduledEmails();
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function runScheduledEmails() {
  const {
    sendEmail,
    trialEndingEmail,
    onboardingDay4Email,
    onboardingDay10Email,
    planExpiredEmail,
    adminPaymentStaleEmail
  } = require('../email');

  const results = {
    trialWarnings: 0,
    onboarding: 0,
    dunning: 0,
    stalePayments: 0,
    errors: []
  };

  // 1. Trial ending warnings — 3 days before and 1 day before expiry
  for (const days of [3, 1]) {
    try {
      const stores = await storeDB.getTrialEndingIn(days);
      for (const store of stores) {
        try {
          await sendEmail(trialEndingEmail(store.name, store.email, days));
          results.trialWarnings++;
        } catch (e) {
          results.errors.push(`trial-warning-day${days}: ${store.email}: ${e.message}`);
        }
      }
    } catch (e) {
      results.errors.push(`getTrialEndingIn(${days}): ${e.message}`);
    }
  }

  // 2. Onboarding drip — Day 4 (not live yet nudge) and Day 10 (upgrade urgency)
  try {
    const day4Stores = await storeDB.getSignedUpDaysAgo(4);
    for (const store of day4Stores) {
      try {
        await sendEmail(onboardingDay4Email(store.name, store.email));
        results.onboarding++;
      } catch (e) {
        results.errors.push(`onboarding-day4: ${store.email}: ${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push(`getSignedUpDaysAgo(4): ${e.message}`);
  }

  try {
    const day10Stores = await storeDB.getSignedUpDaysAgo(10);
    for (const store of day10Stores) {
      try {
        await sendEmail(onboardingDay10Email(store.name, store.email));
        results.onboarding++;
      } catch (e) {
        results.errors.push(`onboarding-day10: ${store.email}: ${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push(`getSignedUpDaysAgo(10): ${e.message}`);
  }

  // 3. Dunning emails — Day 1, Day 3, Day 7 after plan_ends
  for (const days of [1, 3, 7]) {
    try {
      const stores = await storeDB.getPlanLapsedBy(days);
      for (const store of stores) {
        try {
          await sendEmail(planExpiredEmail(store.name, store.email, days));
          results.dunning++;
        } catch (e) {
          results.errors.push(`dunning-day${days}: ${store.email}: ${e.message}`);
        }
      }
    } catch (e) {
      results.errors.push(`getPlanLapsedBy(${days}): ${e.message}`);
    }
  }

  // 4. Stale payment alert — payments pending for 6+ hours with no admin action
  try {
    const stalePayments = await paymentDB.getStalePending(6);
    for (const payment of stalePayments) {
      try {
        const hoursWaiting = Math.floor(
          (Date.now() - new Date(payment.created_at).getTime()) / 3600000
        );
        await sendEmail(adminPaymentStaleEmail(
          payment.name,
          payment.email,
          payment.plan,
          payment.amount,
          hoursWaiting
        ));
        results.stalePayments++;
      } catch (e) {
        results.errors.push(`stale-payment: ${payment.email}: ${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push(`getStalePending: ${e.message}`);
  }

  console.log('Scheduled emails result:', JSON.stringify(results));
  return results;
}

module.exports = router;
module.exports.runScheduledEmails = runScheduledEmails;