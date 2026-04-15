const express = require('express');
const { analyticsDB, productDB } = require('../database');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.get('/analytics', authMiddleware, (req, res) => {
  const storeId = req.store.storeId;
  const stats = analyticsDB.getStats(storeId);
  const productCount = productDB.getCount(storeId);
  res.json({ success: true, stats, productCount });
});

module.exports = router;