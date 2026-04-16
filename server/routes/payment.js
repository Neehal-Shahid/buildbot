const express = require('express');
const { paymentDB } = require('../database');
const { authMiddleware } = require('./auth');

const router = express.Router();
const PLANS = {
  starter: { price: 2999,  label: 'Starter' },
  growth:  { price: 6999,  label: 'Growth'  },
  pro:     { price: 14999, label: 'Pro'      }
};

router.post('/payment/submit', authMiddleware, async (req, res) => {
  const { plan, method, transactionRef } = req.body;
  if (!plan || !method || !transactionRef)
    return res.status(400).json({ error: 'All fields required' });
  if (!PLANS[plan])
    return res.status(400).json({ error: 'Invalid plan' });
  await paymentDB.create(req.store.storeId, PLANS[plan].price, method, transactionRef, plan);
  res.json({ success: true, message: 'Payment submitted! Will be verified within 24 hours.' });
});

router.get('/payment/history', authMiddleware, async (req, res) => {
  const payments = await paymentDB.getByStore(req.store.storeId);
  res.json({ success: true, payments });
});

router.get('/plans', (req, res) => {
  res.json({ success: true, plans: PLANS });
});

module.exports = router;