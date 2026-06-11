const express = require('express');
const { paymentDB } = require('../database');
const { authMiddleware } = require('./auth');
const { getPublicPlanConfig } = require('../lib/plans');

const router = express.Router();

router.post('/payment/submit', authMiddleware, async (req, res) => {
  const { plan, method, transactionRef } = req.body;
  if (!plan || !method || !transactionRef)
    return res.status(400).json({ error: 'All fields required' });

  const { plans } = await getPublicPlanConfig();
  if (!plans[plan])
    return res.status(400).json({ error: 'Invalid plan' });

  await paymentDB.create(req.store.storeId, plans[plan].price, method, transactionRef, plan);
  res.json({ success: true, message: 'Payment submitted! Will be verified within 24 hours.' });
});

router.get('/payment/history', authMiddleware, async (req, res) => {
  const payments = await paymentDB.getByStore(req.store.storeId);
  res.json({ success: true, payments });
});

router.get('/plans', async (req, res) => {
  try {
    const config = await getPublicPlanConfig();
    res.json({ success: true, ...config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;