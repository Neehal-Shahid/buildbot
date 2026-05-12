## CHUNK 3 — `server/routes/admin.js`

**File to edit:** `server/routes/admin.js` only.

**Step 1 — Add `productDB` to the existing import line.**

Find the first line of the file:
```js
const { storeDB, paymentDB, analyticsDB, client, adminDB, tokenDB } = require('../database');
```

Replace with:
```js
const { storeDB, paymentDB, analyticsDB, productDB, client, adminDB, tokenDB } = require('../database');
```

**Step 2 — Add `runScheduledEmails` function.**

Add this function directly before the `module.exports = router` line at the bottom of the file:

```js
async function runScheduledEmails() {
  const {
    sendEmail,
    trialEndingEmail,
    onboardingDay4Email,
    onboardingDay10Email,
    planExpiredEmail,
    adminPaymentStaleEmail
  } = require('../email');

  const results = {
    trialWarnings: 0,
    onboarding: 0,
    dunning: 0,
    stalePayments: 0,
    errors: []
  };

  // 1. Trial ending warnings — 3 days before and 1 day before expiry
  for (const days of [3, 1]) {
    try {
      const stores = await storeDB.getTrialEndingIn(days);
      for (const store of stores) {
        try {
          await sendEmail(trialEndingEmail(store.name, store.email, days));
          results.trialWarnings++;
        } catch (e) {
          results.errors.push(`trial-warning-day${days}: ${store.email}: ${e.message}`);
        }
      }
    } catch (e) {
      results.errors.push(`getTrialEndingIn(${days}): ${e.message}`);
    }
  }

  // 2. Onboarding drip — Day 4 (not live yet nudge) and Day 10 (upgrade urgency)
  try {
    const day4Stores = await storeDB.getSignedUpDaysAgo(4);
    for (const store of day4Stores) {
      try {
        await sendEmail(onboardingDay4Email(store.name, store.email));
        results.onboarding++;
      } catch (e) {
        results.errors.push(`onboarding-day4: ${store.email}: ${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push(`getSignedUpDaysAgo(4): ${e.message}`);
  }

  try {
    const day10Stores = await storeDB.getSignedUpDaysAgo(10);
    for (const store of day10Stores) {
      try {
        await sendEmail(onboardingDay10Email(store.name, store.email));
        results.onboarding++;
      } catch (e) {
        results.errors.push(`onboarding-day10: ${store.email}: ${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push(`getSignedUpDaysAgo(10): ${e.message}`);
  }

  // 3. Dunning emails — Day 1, Day 3, Day 7 after plan_ends
  for (const days of [1, 3, 7]) {
    try {
      const stores = await storeDB.getPlanLapsedBy(days);
      for (const store of stores) {
        try {
          await sendEmail(planExpiredEmail(store.name, store.email, days));
          results.dunning++;
        } catch (e) {
          results.errors.push(`dunning-day${days}: ${store.email}: ${e.message}`);
        }
      }
    } catch (e) {
      results.errors.push(`getPlanLapsedBy(${days}): ${e.message}`);
    }
  }

  // 4. Stale payment alert — payments pending for 6+ hours with no admin action
  try {
    const stalePayments = await paymentDB.getStalePending(6);
    for (const payment of stalePayments) {
      try {
        const hoursWaiting = Math.floor(
          (Date.now() - new Date(payment.created_at).getTime()) / 3600000
        );
        await sendEmail(adminPaymentStaleEmail(
          payment.name,
          payment.email,
          payment.plan,
          payment.amount,
          hoursWaiting
        ));
        results.stalePayments++;
      } catch (e) {
        results.errors.push(`stale-payment: ${payment.email}: ${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push(`getStalePending: ${e.message}`);
  }

  console.log('Scheduled emails result:', JSON.stringify(results));
  return results;
}
```

**Step 3 — Add new admin routes.**

Add all of these routes directly before `runScheduledEmails` (i.e. before the function you just added). Do not modify any existing route:

```js
// Manual plan override
router.post('/admin/set-plan', adminAuth, async (req, res) => {
  const { storeId, plan, planStatus, planEnds } = req.body;
  if (!storeId || !plan || !planStatus)
    return res.status(400).json({ error: 'storeId, plan and planStatus required' });
  const validPlans = ['trial', 'starter', 'growth', 'pro'];
  if (!validPlans.includes(plan))
    return res.status(400).json({ error: 'Invalid plan. Must be: trial, starter, growth, pro' });
  try {
    await storeDB.setPlan(storeId, plan, planStatus, planEnds || null);
    res.json({ success: true, message: `Plan updated to ${plan} (${planStatus})` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trial extension
router.post('/admin/extend-trial', adminAuth, async (req, res) => {
  const { storeId, days } = req.body;
  if (!storeId || !days)
    return res.status(400).json({ error: 'storeId and days required' });
  const daysNum = Number(days);
  if (daysNum < 1 || daysNum > 90)
    return res.status(400).json({ error: 'Days must be between 1 and 90' });
  try {
    await storeDB.extendTrial(storeId, daysNum);
    res.json({ success: true, message: `Trial extended by ${daysNum} days` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual email to a specific store
router.post('/admin/send-email', adminAuth, async (req, res) => {
  const { storeId, subject, message } = req.body;
  if (!storeId || !subject || !message)
    return res.status(400).json({ error: 'storeId, subject and message required' });
  if (subject.length > 150)
    return res.status(400).json({ error: 'Subject too long (max 150 chars)' });
  if (message.length > 2000)
    return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
  try {
    const store = await storeDB.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    const { sendEmail, adminManualEmail } = require('../email');
    await sendEmail(adminManualEmail(store.name, store.email, subject, message));
    res.json({ success: true, message: `Email sent to ${store.email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast to all or filtered stores
router.post('/admin/broadcast', adminAuth, async (req, res) => {
  const { subject, message, targetPlan } = req.body;
  if (!subject || !message)
    return res.status(400).json({ error: 'subject and message required' });
  if (subject.length > 150)
    return res.status(400).json({ error: 'Subject too long (max 150 chars)' });
  if (message.length > 2000)
    return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
  try {
    const allStores = await storeDB.getAll();
    const targets = targetPlan
      ? allStores.filter(s => s.plan === targetPlan && s.plan_status !== 'disabled')
      : allStores.filter(s => s.plan_status !== 'disabled');
    const { sendEmail, adminManualEmail } = require('../email');
    let sent = 0;
    for (const store of targets) {
      try {
        await sendEmail(adminManualEmail(store.name, store.email, subject, message));
        sent++;
      } catch {}
    }
    res.json({ success: true, message: `Broadcast sent to ${sent} store${sent !== 1 ? 's' : ''}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save internal admin notes for a store
router.post('/admin/save-notes', adminAuth, async (req, res) => {
  const { storeId, notes } = req.body;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  if ((notes || '').length > 1000)
    return res.status(400).json({ error: 'Notes too long (max 1000 chars)' });
  try {
    await storeDB.setNotes(storeId, notes || '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View a store's product catalog
router.get('/admin/store-products/:storeId', adminAuth, async (req, res) => {
  try {
    const products = await productDB.getByStore(req.params.storeId);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger scheduled email jobs
router.post('/admin/run-drip', adminAuth, async (req, res) => {
  try {
    const results = await runScheduledEmails();
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**Step 4 — Export `runScheduledEmails` alongside the router.**

Find the last line of the file:
```js
module.exports = router;
```

Replace with:
```js
module.exports = router;
module.exports.runScheduledEmails = runScheduledEmails;
```

---

