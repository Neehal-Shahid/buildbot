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

// Serve widget
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'widget.js'));
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'BuildBot server is running!', version: '2.0' });
});

// Start server only after DB is ready
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`BuildBot server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});