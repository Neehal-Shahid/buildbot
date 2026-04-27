const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { storeDB, paymentDB, analyticsDB, client, adminDB, tokenDB } = require('../database');

const router = express.Router();
const JWT_SECRET   = process.env.JWT_SECRET || 'buildbot-secret';

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

router.post('/admin/login', async (req, res) => {
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

router.post('/admin/forgot-password', async (req, res) => {
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

router.post('/admin/reset-password', async (req, res) => {
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

module.exports = router;