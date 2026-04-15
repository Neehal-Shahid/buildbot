const express = require('express');
const { paymentDB, storeDB } = require('../database');
const { authMiddleware } = require('./auth');

const router = express.Router();

const PLANS = {
  starter: { price: 2999, label: 'Starter', recommendations: 500 },
  growth:  { price: 6999, label: 'Growth',  recommendations: 2000 },
  pro:     { price: 14999, label: 'Pro',     recommendations: 999999 }
};

// Submit payment proof
router.post('/payment/submit', authMiddleware, (req, res) => {
  const { plan, method, transactionRef } = req.body;
  const storeId = req.store.storeId;

  if (!plan || !method || !transactionRef)
    return res.status(400).json({ error: 'Plan, method and transaction reference are required' });

  if (!PLANS[plan])
    return res.status(400).json({ error: 'Invalid plan' });

  const amount = PLANS[plan].price;
  paymentDB.create(storeId, amount, method, transactionRef, plan);

  res.json({
    success: true,
    message: 'Payment submitted! It will be verified within 24 hours and your plan will be activated.'
  });
});

// Get payment history
router.get('/payment/history', authMiddleware, (req, res) => {
  const payments = paymentDB.getByStore(req.store.storeId);
  res.json({ success: true, payments });
});

// Get plans info
router.get('/plans', (req, res) => {
  res.json({ success: true, plans: PLANS });
});

module.exports = router;