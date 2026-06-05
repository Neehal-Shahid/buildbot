const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initDB } = require('./database');
const uploadRoute = require('./routes/upload');
const recommendRoute = require('./routes/recommend');
const { router: authRoute } = require('./routes/auth');
const analyticsRoute = require('./routes/analytics');
const paymentRoute = require('./routes/payment');
const adminRoute = require('./routes/admin');
const pluginRoute = require('./routes/plugin');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api', authRoute);
app.use('/api', uploadRoute);
app.use('/api', recommendRoute);
app.use('/api', analyticsRoute);
app.use('/api', paymentRoute);
app.use('/api', adminRoute);
app.use('/api', pluginRoute);

// Serve widget script
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'widget.js'));
});

// Serve widget styles
app.get('/widget.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'widget.css'));
});

// Serve WooCommerce plugin zip
app.get('/buildbot-woocommerce.zip', (req, res) => {
  const zipPath = path.join(__dirname, 'buildbot-woocommerce.zip');
  if (require('fs').existsSync(zipPath)) {
    res.download(zipPath, 'buildbot-woocommerce.zip');
  } else {
    res.status(404).json({ error: 'Plugin file not found' });
  }
});
// Plugin update checker
app.get('/plugin-update.json', (req, res) => {
  const jsonPath = path.join(__dirname, 'plugin-update.json');
  if (fs.existsSync(jsonPath)) {
    res.sendFile(jsonPath);
  } else {
    res.status(404).json({ error: 'Update file not found' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'BuildBot server is running!', version: '2.0' });
});

// Start server only after DB is ready
initDB().then(async () => {

  // Clean up stale unverified accounts (typo'd emails, abandoned signups)
  try {
    const { storeDB } = require('./database');
    const removed = await storeDB.deleteUnverifiedOlderThan(7);
    if (removed > 0) console.log(`Cleaned up ${removed} unverified account(s) older than 7 days`);
  } catch (e) {
    console.error('Unverified account cleanup failed:', e.message);
  }

  app.listen(PORT, () => {
    console.log(`BuildBot server running on http://localhost:${PORT}`);
  });

  // ─── SCHEDULED EMAIL JOB ────────────────────────────────────
  // Runs every hour — handles trial warnings, onboarding drip, dunning, stale payments
  const { runScheduledEmails } = require('./routes/admin');

  // Run once 30 seconds after startup to catch any sends missed during downtime
  setTimeout(async () => {
    try { await runScheduledEmails(); }
    catch (e) { console.error('Startup email job error:', e.message); }
  }, 30 * 1000);

  // Then run every 60 minutes
  setInterval(async () => {
    try { await runScheduledEmails(); }
    catch (e) { console.error('Hourly email job error:', e.message); }
  }, 60 * 60 * 1000);
})