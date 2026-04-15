const express = require('express');
const jwt = require('jsonwebtoken');
const { db, storeDB, paymentDB } = require('../database');

const router = express.Router();
const JWT_SECRET   = process.env.JWT_SECRET || 'buildbot-secret';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL;
const ADMIN_PASS   = process.env.ADMIN_PASSWORD;

// Admin auth middleware
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

// Admin login
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASS)
    return res.status(401).json({ error: 'Invalid admin credentials' });

  const token = jwt.sign({ isAdmin: true, email }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ success: true, token });
});

// Overview
router.get('/admin/overview', adminAuth, (req, res) => {
  const stores = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM products p WHERE p.store_id = s.store_id) as product_count,
      (SELECT COUNT(*) FROM recommendations r WHERE r.store_id = s.store_id) as rec_count
    FROM stores s ORDER BY s.created_at DESC
  `).all();

  const totalRecs = db.prepare('SELECT COUNT(*) as c FROM recommendations').get().c;

  const revenue = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='approved'"
  ).get().total;

  const pending = db.prepare(`
    SELECT p.*, s.name, s.email FROM payments p
    JOIN stores s ON p.store_id = s.store_id
    WHERE p.status = 'pending' ORDER BY p.created_at DESC
  `).all();

  res.json({ success: true, stores, totalRecs, revenue, pending });
});

// All stores
router.get('/admin/stores', adminAuth, (req, res) => {
  const stores = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM products p WHERE p.store_id = s.store_id) as product_count,
      (SELECT COUNT(*) FROM recommendations r WHERE r.store_id = s.store_id) as rec_count
    FROM stores s ORDER BY s.created_at DESC
  `).all();
  res.json({ success: true, stores });
});

// All payments
router.get('/admin/payments', adminAuth, (req, res) => {
  const payments = db.prepare(`
    SELECT p.*, s.name, s.email FROM payments p
    JOIN stores s ON p.store_id = s.store_id
    ORDER BY p.created_at DESC
  `).all();
  res.json({ success: true, payments });
});

// Approve payment
router.post('/admin/approve-payment', adminAuth, (req, res) => {
  const { id, storeId, plan } = req.body;
  paymentDB.approve(id, storeId, plan);
  res.json({ success: true });
});

// Reject payment
router.post('/admin/reject-payment', adminAuth, (req, res) => {
  db.prepare("UPDATE payments SET status='rejected' WHERE id=?").run(req.body.id);
  res.json({ success: true });
});

// Disable store
router.post('/admin/disable-store', adminAuth, (req, res) => {
  db.prepare("UPDATE stores SET plan_status='disabled' WHERE store_id=?")
    .run(req.body.storeId);
  res.json({ success: true });
});

// Activate store
router.post('/admin/activate-store', adminAuth, (req, res) => {
  db.prepare("UPDATE stores SET plan_status='active' WHERE store_id=?")
    .run(req.body.storeId);
  res.json({ success: true });
});

module.exports = router;