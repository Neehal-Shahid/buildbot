## CHUNK 4 — `server/auth.js` and `server/index.js`

**Files to edit:** `server/routes/auth.js` AND `server/index.js`. Do not touch any other file.

**Change 1 — `server/routes/auth.js`: notify admin on new signup.**

Find inside the `/signup` route, the line:
```js
sendEmail(welcomeEmail(name, email));
```

Add this line immediately after it:
```js
// Notify admin of new store registration
const { adminNewStoreEmail } = require('../email');
sendEmail(adminNewStoreEmail(name, email, storeId));
```

**Change 2 — `server/routes/auth.js`: notify admin on new payment submission.**

Find the route that calls `paymentDB.create(...)`. It will look something like:
```js
await paymentDB.create(storeId, amount, method, transactionRef, plan);
```

Add these lines immediately after that `paymentDB.create` call:
```js
// Notify admin of new payment submission
try {
  const store = await storeDB.findById(req.store.storeId);
  if (store) {
    const { sendEmail: _sendEmail, adminNewPaymentEmail } = require('../email');
    _sendEmail(adminNewPaymentEmail(store.name, store.email, plan, amount, method, transactionRef));
  }
} catch {}
```

Note: if the payment submission route is in a different file (e.g. `server/routes/store.js` or similar), find where `paymentDB.create` is called and add these lines there instead. The pattern is the same regardless of which file it's in.

**Change 3 — `server/index.js`: start the scheduled email job.**

Find the server `.listen()` call. It will look like:
```js
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Add the scheduled job immediately after the closing `});`:
```js
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
```

---

