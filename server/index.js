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

// Serve widget
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'widget.js'));
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
  res.json({
    version: '1.1.0',
    download_url: 'https://buildbot-production.up.railway.app/buildbot-woocommerce.zip',
    tested: '6.5',
    requires: '5.0',
    requires_php: '7.4'
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'BuildBot server is running!', version: '2.0' });
});

// Start server only after DB is ready
initDB().then(() => {

  // Check for trials ending soon — runs every 24 hours
  const { sendEmail, trialEndingEmail } = require('./email');

  async function checkTrialsEnding() {
    try {
      const { client } = require('./database');
      const res = await client.execute(`
        SELECT * FROM stores
        WHERE plan = 'trial'
        AND plan_status = 'active'
        AND date(trial_ends) IN (
          date('now', '+3 days'),
          date('now', '+1 day')
        )
      `);
      for (const store of res.rows) {
        const daysLeft = Math.ceil(
          (new Date(store.trial_ends) - new Date()) / (1000 * 60 * 60 * 24)
        );
        const check = await client.execute({ sql: 'SELECT * FROM trial_emails_sent WHERE store_id = ? AND days_left = ?', args: [store.store_id, daysLeft] });
        if (check.rows.length === 0) {
          sendEmail(trialEndingEmail(store.name, store.email, daysLeft));
          await client.execute({ sql: 'INSERT INTO trial_emails_sent (store_id, days_left) VALUES (?, ?)', args: [store.store_id, daysLeft] });
          console.log(`Trial ending email sent to: ${store.email}`);
        }
      }
    } catch(e) {
      console.error('Trial check error:', e.message);
    }
  }

  // Run once on startup then every 24 hours
  checkTrialsEnding();
  setInterval(checkTrialsEnding, 24 * 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`BuildBot server running on http://localhost:${PORT}`);
  });
})