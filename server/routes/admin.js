const express = require('express');
const jwt = require('jsonwebtoken');
const { storeDB, paymentDB, analyticsDB, productDB, client } = require('../database');

const router = express.Router();
const JWT_SECRET   = process.env.JWT_SECRET;
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL;
const ADMIN_PASS   = process.env.ADMIN_PASSWORD;

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

router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASS)
    return res.status(401).json({ error: 'Invalid admin credentials' });
  const token = jwt.sign({ isAdmin: true, email }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ success: true, token });
});

router.get('/admin/overview', adminAuth, async (req, res) => {
  const stores    = await storeDB.getAll();
  const totalRecs = await analyticsDB.getTotalRecs();
  const revenue   = await paymentDB.getRevenue();
  const pending   = await paymentDB.getPending();

  // Add product and rec counts per store
  for (const store of stores) {
    const pc = await productDB.getCount(store.store_id);
    const rc = await analyticsDB.getStats(store.store_id);
    store.product_count = pc.count;
    store.rec_count     = rc.total.count;
  }

  res.json({ success: true, stores, totalRecs, revenue, pending });
});

router.get('/admin/stores', adminAuth, async (req, res) => {
  const stores = await storeDB.getAll();
  for (const store of stores) {
    const pc = await productDB.getCount(store.store_id);
    const rc = await analyticsDB.getStats(store.store_id);
    store.product_count = pc.count;
    store.rec_count     = rc.total.count;
  }
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
  const { storeId } = req.body;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  try {
    // Delete all related data in correct order
    await client.execute({ sql: 'DELETE FROM recommendations WHERE store_id = ?', args: [storeId] });
    await client.execute({ sql: 'DELETE FROM payments WHERE store_id = ?', args: [storeId] });
    await client.execute({ sql: 'DELETE FROM products WHERE store_id = ?', args: [storeId] });
    await client.execute({ sql: 'DELETE FROM tokens WHERE email = (SELECT email FROM stores WHERE store_id = ?)', args: [storeId] });
    await client.execute({ sql: 'DELETE FROM stores WHERE store_id = ?', args: [storeId] });

    res.json({ success: true, message: 'Store and all related data deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/activate-store', adminAuth, async (req, res) => {
  await storeDB.activateStore(req.body.storeId);
  res.json({ success: true });
});

module.exports = router;