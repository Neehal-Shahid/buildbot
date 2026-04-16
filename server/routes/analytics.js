const express = require('express');
const { analyticsDB, productDB } = require('../database');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.get('/analytics', authMiddleware, async (req, res) => {
  const stats        = await analyticsDB.getStats(req.store.storeId);
  const productCount = await productDB.getCount(req.store.storeId);
  res.json({ success: true, stats, productCount });
});

module.exports = router;