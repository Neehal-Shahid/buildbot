const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { storeDB } = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'buildbot-secret';

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.store = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = await storeDB.findByEmail(email);
  if (existing)
    return res.status(400).json({ error: 'Email already registered' });

  const storeId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await storeDB.create(storeId, name, email, hashedPassword);
    const store = await storeDB.findByEmail(email);
    const token = jwt.sign(
      { storeId: store.store_id, email: store.email, name: store.name },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({
      success: true, token,
      store: {
        storeId: store.store_id, name: store.name,
        email: store.email, plan: store.plan,
        trialEnds: store.trial_ends
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not create account: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const store = await storeDB.findByEmail(email);
  if (!store)
    return res.status(400).json({ error: 'No account found with this email' });

  const valid = await bcrypt.compare(password, store.password);
  if (!valid)
    return res.status(400).json({ error: 'Incorrect password' });

  const token = jwt.sign(
    { storeId: store.store_id, email: store.email, name: store.name },
    JWT_SECRET, { expiresIn: '7d' }
  );
  res.json({
    success: true, token,
    store: {
      storeId: store.store_id, name: store.name,
      email: store.email, plan: store.plan,
      planStatus: store.plan_status, trialEnds: store.trial_ends,
      brandColor: store.brand_color, currency: store.currency
    }
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  const store = await storeDB.findById(req.store.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  const { password, ...safeStore } = store;
  res.json({ success: true, store: safeStore });
});

router.get('/store-config/:storeId', async (req, res) => {
  const store = await storeDB.findById(req.params.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  res.json({
    success: true,
    brandColor: store.brand_color,
    currency: store.currency
  });
});

module.exports = { router, authMiddleware };