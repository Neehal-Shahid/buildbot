const express = require('express');
const { analyticsDB, productDB } = require('../database');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.get('/analytics', authMiddleware, async (req, res) => {
  const rawDays = parseInt(req.query.days, 10);
  const days = Number.isFinite(rawDays) ? Math.max(0, Math.min(365, rawDays)) : 0;
  const stats = await analyticsDB.getStats(req.store.storeId, days);
  const productCount = await productDB.getCount(req.store.storeId);
  res.json({ success: true, stats, productCount, days });
});

module.exports = router;