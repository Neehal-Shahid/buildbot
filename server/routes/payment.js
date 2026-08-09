const express = require('express');
const { paymentDB, storeDB } = require('../database');
const { authMiddleware } = require('./auth');
const { getPublicPlanConfig } = require('../lib/plans');
const { sendEmail, adminNewPaymentEmail } = require('../email');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 payment submissions per hour
  message: { error: 'Too many payment submissions. Please wait before trying again.' }
});

router.post('/payment/submit', authMiddleware, paymentLimiter, async (req, res) => {
  const { plan, method, transactionRef } = req.body;
  if (!plan || !method || !transactionRef)
    return res.status(400).json({ error: 'All fields required' });
  if (plan.length > 50 || method.length > 50 || transactionRef.length > 200)
    return res.status(400).json({ error: 'Input too long' });

  const { plans } = await getPublicPlanConfig();
  if (!plans[plan])
    return res.status(400).json({ error: 'Invalid plan' });

  const amount = plans[plan].price;
  await paymentDB.create(req.store.storeId, amount, method, transactionRef, plan);

  try {
    const store = await storeDB.findById(req.store.storeId);
    if (store) {
      await sendEmail(
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
  } catch (e) {
    console.error('Payment admin notify failed:', e.message);
  }

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