You're absolutely right on both points. Let me fix the 2 real critical issues and split into clean chunks.

The actual issues to fix are:
1. `productDB` missing from import in `admin.js`
2. Prompt contradicts itself about `auth.js` and `index.js` — need to add them to allowed files list
3. `daysLeft = 4` magic number needs a comment
4. `getPlanLapsedBy` uses `trial_ends` for paid plans which won't work — needs a `plan_ends` column

Let me write 5 clean chunks now.

---

## CHUNK 1 — `server/email.js`

**File to edit:** `server/email.js` only.

Add these new functions after `adminPasswordResetEmail` and before `module.exports`. Do not modify any existing function or the `sendEmail` function.

**Add `adminNewStoreEmail`:**
```js
function adminNewStoreEmail(storeName, storeEmail, storeId) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'workwithneehal@gmail.com';
  return {
    to: ADMIN_EMAIL,
    subject: `New store registered — ${storeName}`,
    html: emailBase({
      preheader: `${storeName} just signed up for BuildBot.`,
      content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#eef2ff;border:1px solid rgba(79,70,229,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#4f46e5;letter-spacing:0.05em;text-transform:uppercase;">New Signup</span>
      </td>
    </tr></table>
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">A new store just signed up.</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Here are the details:</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr><td style="padding:16px 20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;">
        <div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Store Name</span><br/><strong style="color:#111827;font-size:14px;">${storeName}</strong></div>
        <div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Email</span><br/><strong style="color:#111827;font-size:14px;">${storeEmail}</strong></div>
        <div><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Store ID</span><br/><strong style="color:#111827;font-size:14px;">${storeId}</strong></div>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/admin.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Open Admin Panel</a>
      </td>
    </tr></table>
  `
    })
  };
}
```

**Add `adminNewPaymentEmail`:**
```js
function adminNewPaymentEmail(storeName, storeEmail, plan, amount, method, transactionRef) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'workwithneehal@gmail.com';
  return {
    to: ADMIN_EMAIL,
    subject: `Payment submitted — ${storeName} (${plan} plan)`,
    html: emailBase({
      preheader: `${storeName} submitted a payment of Rs ${Number(amount).toLocaleString()} for the ${plan} plan. Action required.`,
      content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#fffbeb;border:1px solid rgba(217,119,6,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#d97706;letter-spacing:0.05em;text-transform:uppercase;">Action Required — Payment Pending</span>
      </td>
    </tr></table>
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">A payment is waiting for your approval.</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Verify the transaction and approve or reject from the admin panel.</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr><td style="padding:16px 20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;">
        <div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Store</span><br/><strong style="color:#111827;font-size:14px;">${storeName}</strong><br/><span style="font-size:12px;color:#6b7280;">${storeEmail}</span></div>
        <div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Plan</span><br/><strong style="color:#111827;font-size:14px;">${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong></div>
        <div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Amount</span><br/><strong style="color:#111827;font-size:14px;">Rs ${Number(amount).toLocaleString()}</strong></div>
        <div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Method</span><br/><strong style="color:#111827;font-size:14px;">${method}</strong></div>
        <div><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Transaction Reference</span><br/><strong style="color:#111827;font-size:14px;font-family:monospace;">${transactionRef}</strong></div>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/admin.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Review Payment</a>
      </td>
    </tr></table>
  `
    })
  };
}
```

**Add `adminPaymentStaleEmail`:**
```js
function adminPaymentStaleEmail(storeName, storeEmail, plan, amount, hoursWaiting) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'workwithneehal@gmail.com';
  return {
    to: ADMIN_EMAIL,
    subject: `Reminder — payment still pending for ${storeName} (${hoursWaiting}h)`,
    html: emailBase({
      preheader: `A payment from ${storeName} has been waiting ${hoursWaiting} hours without action.`,
      content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#fef2f2;border:1px solid rgba(220,38,38,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#dc2626;letter-spacing:0.05em;text-transform:uppercase;">Reminder — Pending ${hoursWaiting} Hours</span>
      </td>
    </tr></table>
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">A payment still hasn't been reviewed.</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">${storeName} submitted a payment <strong style="color:#111827;">${hoursWaiting} hours ago</strong> and is waiting for approval. They may not be able to use BuildBot until this is resolved.</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr><td style="padding:16px 20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;">
        <div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Store</span><br/><strong style="color:#111827;font-size:14px;">${storeName}</strong><br/><span style="font-size:12px;color:#6b7280;">${storeEmail}</span></div>
        <div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Plan</span><br/><strong style="color:#111827;font-size:14px;">${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong></div>
        <div><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Amount</span><br/><strong style="color:#111827;font-size:14px;">Rs ${Number(amount).toLocaleString()}</strong></div>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#dc2626;border-radius:8px;">
        <a href="${APP_URL}/admin.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Approve or Reject Now</a>
      </td>
    </tr></table>
  `
    })
  };
}
```

**Add `onboardingDay4Email`:**
```js
function onboardingDay4Email(storeName, email) {
  return {
    to: email,
    subject: `${storeName}, your widget isn't live yet`,
    html: emailBase({
      preheader: "Your trial is running — but your widget hasn't been installed yet.",
      content: `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Your widget isn't live yet.</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, you signed up 4 days ago but your BuildBot widget hasn't been installed yet. You're missing out on customers getting AI PC recommendations right now.</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr><td style="padding:16px 20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827;">Two things to do right now:</p>
        <p style="margin:0 0 6px;font-size:13px;color:#374151;">1. Upload your product catalog as a CSV in your dashboard</p>
        <p style="margin:0;font-size:13px;color:#374151;">2. Copy your embed code and paste it before &lt;/body&gt; on your site</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Complete Setup</a>
      </td>
    </tr></table>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Need help? Reply to this email — we'll walk you through it.</p>
  `
    })
  };
}
```

**Add `onboardingDay10Email`:**
```js
function onboardingDay10Email(storeName, email) {
  // Store signed up 10 days ago — 14 day trial — so 4 days remain
  const daysLeft = 4;
  return {
    to: email,
    subject: `${daysLeft} days left in your BuildBot trial`,
    html: emailBase({
      preheader: `Your trial ends in ${daysLeft} days. Upgrade to keep your widget running.`,
      content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#fffbeb;border:1px solid rgba(217,119,6,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#d97706;letter-spacing:0.05em;text-transform:uppercase;">${daysLeft} days remaining</span>
      </td>
    </tr></table>
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Your trial ends in ${daysLeft} days.</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, when your trial ends your widget will stop working and customers won't be able to get recommendations. Upgrade now to keep things running.</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr><td style="padding:20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Starting from</p>
        <p style="margin:0 0 2px;font-size:28px;font-weight:800;color:#4f46e5;letter-spacing:-0.03em;">Rs 2,999</p>
        <p style="margin:0;font-size:12px;color:#9ca3af;">per month — via JazzCash or EasyPaisa</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Upgrade Now</a>
      </td>
    </tr></table>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Payments approved within a few hours. Reply if you have any questions.</p>
  `
    })
  };
}
```

**Add `planExpiredEmail`:**
```js
function planExpiredEmail(storeName, email, daysSinceExpiry) {
  const subjects = {
    1: `${storeName}, your BuildBot widget has stopped working`,
    3: `Reminder — your BuildBot subscription has lapsed`,
    7: `Final notice — your BuildBot account is at risk`
  };
  const urgency = daysSinceExpiry >= 7
    ? 'Your account may be permanently disabled soon if no payment is received.'
    : 'Resubmit your payment to restore access immediately.';
  return {
    to: email,
    subject: subjects[daysSinceExpiry] || `Your BuildBot subscription has lapsed`,
    html: emailBase({
      preheader: `Your subscription lapsed ${daysSinceExpiry} day${daysSinceExpiry === 1 ? '' : 's'} ago. Resubmit to restore your widget.`,
      content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#fef2f2;border:1px solid rgba(220,38,38,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#dc2626;letter-spacing:0.05em;text-transform:uppercase;">Widget Inactive — Day ${daysSinceExpiry}</span>
      </td>
    </tr></table>
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Your subscription has lapsed.</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, your BuildBot subscription expired ${daysSinceExpiry} day${daysSinceExpiry === 1 ? '' : 's'} ago. Your widget is no longer showing recommendations to customers. ${urgency}</p>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Renew Subscription</a>
      </td>
    </tr></table>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Reply to this email if you need help with payment.</p>
  `
    })
  };
}
```

**Add `adminManualEmail`:**
```js
function adminManualEmail(storeName, storeEmail, subject, message) {
  return {
    to: storeEmail,
    subject,
    html: emailBase({
      preheader: message.substring(0, 100),
      content: `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Message from BuildBot</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName},</p>
    <div style="font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap;">${message}</div>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">This message was sent by the BuildBot team. Reply to this email to respond.</p>
  `
    })
  };
}
```

**Replace `module.exports` at the bottom with:**
```js
module.exports = {
  sendEmail,
  welcomeEmail,
  emailVerificationEmail,
  paymentApprovedEmail,
  paymentRejectedEmail,
  trialEndingEmail,
  passwordResetEmail,
  adminPasswordResetEmail,
  adminNewStoreEmail,
  adminNewPaymentEmail,
  adminPaymentStaleEmail,
  onboardingDay4Email,
  onboardingDay10Email,
  planExpiredEmail,
  adminManualEmail
};
```

---

## CHUNK 2 — `server/database.js`

**File to edit:** `server/database.js` only.

**Step 1 — Add `plan_ends` and `admin_notes` migrations.**

In the `migrations` array inside `initDB`, add these two new entries at the end of the array before the closing `]`:

```js
`ALTER TABLE stores ADD COLUMN plan_ends TEXT DEFAULT ''`,
`ALTER TABLE stores ADD COLUMN admin_notes TEXT DEFAULT ''`,
```

**Step 2 — Update `paymentDB.approve` to also set `plan_ends`.**

Find the existing `approve` method in `paymentDB`:

```js
approve: async (paymentId, storeId, plan) => {
  await client.execute({
    sql:  "UPDATE payments SET status = 'approved' WHERE id = ?",
    args: [paymentId]
  });
  await client.execute({
    sql:  "UPDATE stores SET plan = ?, plan_status = 'active' WHERE store_id = ?",
    args: [plan, storeId]
  });
},
```

Replace with:

```js
approve: async (paymentId, storeId, plan) => {
  await client.execute({
    sql:  "UPDATE payments SET status = 'approved' WHERE id = ?",
    args: [paymentId]
  });
  // Set plan and record plan_ends as 30 days from today for dunning tracking
  await client.execute({
    sql: `UPDATE stores 
          SET plan = ?, plan_status = 'active', plan_ends = date('now', '+30 days')
          WHERE store_id = ?`,
    args: [plan, storeId]
  });
},
```

**Step 3 — Add new methods to `storeDB`.**

In the `storeDB` object, add these methods before its closing `}`. Do not modify any existing method:

```js
  // Set plan manually with optional plan_ends date (admin override)
  setPlan: async (storeId, plan, planStatus, planEnds = null) => {
    if (planEnds) {
      return await client.execute({
        sql: 'UPDATE stores SET plan = ?, plan_status = ?, plan_ends = ? WHERE store_id = ?',
        args: [plan, planStatus, planEnds, storeId]
      });
    }
    return await client.execute({
      sql: 'UPDATE stores SET plan = ?, plan_status = ? WHERE store_id = ?',
      args: [plan, planStatus, storeId]
    });
  },

  // Extend trial by N days from today or current trial_ends, whichever is later
  extendTrial: async (storeId, days) => {
    return await client.execute({
      sql: `UPDATE stores SET
              trial_ends = date(MAX(COALESCE(NULLIF(trial_ends,''), date('now')), date('now')), '+${days} days'),
              plan = 'trial',
              plan_status = 'active'
            WHERE store_id = ?`,
      args: [storeId]
    });
  },

  // Save internal admin notes for a store
  setNotes: async (storeId, notes) => {
    return await client.execute({
      sql: 'UPDATE stores SET admin_notes = ? WHERE store_id = ?',
      args: [notes, storeId]
    });
  },

  // Get trial stores expiring in exactly N days — used for trial warning emails
  getTrialEndingIn: async (days) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
            WHERE plan = 'trial'
            AND plan_status = 'active'
            AND date(trial_ends) = date('now', '+${days} days')`,
      args: []
    });
    return res.rows;
  },

  // Get paid stores whose plan_ends was exactly N days ago — used for dunning emails
  // plan_ends is set when a payment is approved. Requires plan_ends column (migration added above).
  getPlanLapsedBy: async (days) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
            WHERE plan != 'trial'
            AND plan_status = 'active'
            AND plan_ends != ''
            AND plan_ends IS NOT NULL
            AND date(plan_ends) = date('now', '-${days} days')`,
      args: []
    });
    return res.rows;
  },

  // Get stores that created their account exactly N days ago — used for onboarding drip
  getSignedUpDaysAgo: async (days) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
            WHERE date(created_at) = date('now', '-${days} days')`,
      args: []
    });
    return res.rows;
  },
```

**Step 4 — Add `getStalePending` to `paymentDB`.**

In the `paymentDB` object, add this method before its closing `}`:

```js
  // Get pending payments older than N hours — used for admin stale payment alert
  getStalePending: async (hours) => {
    const res = await client.execute({
      sql: `SELECT p.*, s.name, s.email FROM payments p
            JOIN stores s ON p.store_id = s.store_id
            WHERE p.status = 'pending'
            AND p.created_at <= datetime('now', '-${hours} hours')`,
      args: []
    });
    return res.rows;
  },
```

---

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

## CHUNK 5 — `dashboard/admin.html`

**File to edit:** `dashboard/admin.html` only.

**Step 1 — Add a "Manage" button and "View Catalog" button to each store row in `renderStores`.**

In `renderStores`, find the actions `<td>` that contains the existing three `.action-btn` buttons (activate, disable, delete). Add these two new buttons inside the same `<div style="display:flex;...">`, after the existing three:

```js
<button class="action-btn" data-tip="View catalog"
  style="background:var(--surface-2);color:var(--muted);border-color:var(--border);"
  onmouseover="this.style.background='var(--text)';this.style.color='#fff';"
  onmouseout="this.style.background='var(--surface-2)';this.style.color='var(--muted)';"
  onclick="viewStoreProducts('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
</button>
<button class="action-btn" data-tip="Manage store"
  style="background:var(--accent-light);color:var(--accent);border-color:var(--accent-border);"
  onmouseover="this.style.background='var(--accent)';this.style.color='#fff';"
  onmouseout="this.style.background='var(--accent-light)';this.style.color='var(--accent)';"
  onclick="openManageStore('${safeText(s.store_id)}','${encodeURIComponent(s.name)}','${safeText(s.plan)}','${safeText(s.plan_status)}','${encodeURIComponent(s.admin_notes||'')}')">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
</button>
```

**Step 2 — Add "Broadcast" button to the overview tab.**

In the overview tab HTML, find the `card-head` of the "Recently Joined Stores" card. It has an `<h2>` and a `<div class="card-sub">`. Add a button in that `card-head` div alongside them:

```html
<button class="btn btn-sm" onclick="document.getElementById('broadcast-modal').classList.add('open')" style="display:inline-flex;align-items:center;gap:5px;">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
  Broadcast
</button>
```

**Step 3 — Add "Run Drip" button to the stores tab.**

In the stores tab HTML, find the `card-head` of the stores card (the one with the `#store-search` input). Add this button alongside the search input:

```html
<button class="btn btn-sm" onclick="runDripNow(this)" style="display:inline-flex;align-items:center;gap:5px;">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
  Run Drip
</button>
```

**Step 4 — Add all three new modals to the HTML.**

Add this HTML block directly before the `<!-- TOAST CONTAINER -->` comment. Do not replace any existing modals:

```html
<!-- MANAGE STORE MODAL -->
<div class="modal-bg" id="manage-modal">
  <div class="modal" style="max-width:520px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--muted);margin-bottom:4px;">Store Management</div>
        <h3 style="margin:0;" id="manage-store-title">Store</h3>
      </div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>

    <div style="margin-bottom:14px;padding:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Change Plan</div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <select id="manage-plan-select" style="flex:1;">
          <option value="trial">Trial</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
        </select>
        <select id="manage-status-select" style="flex:1;">
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      <button class="btn btn-primary btn-sm" id="manage-plan-btn" onclick="submitPlanChange()" style="width:100%;justify-content:center;">Save Plan</button>
    </div>

    <div style="margin-bottom:14px;padding:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Extend Trial</div>
      <div style="display:flex;gap:8px;">
        <select id="manage-trial-days" style="flex:1;">
          <option value="3">+ 3 days</option>
          <option value="7">+ 7 days</option>
          <option value="14">+ 14 days</option>
          <option value="30">+ 30 days</option>
        </select>
        <button class="btn btn-warning btn-sm" id="manage-trial-btn" onclick="submitTrialExtend()">Extend</button>
      </div>
    </div>

    <div style="margin-bottom:14px;padding:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Send Email to Store</div>
      <input type="text" id="manage-email-subject" placeholder="Subject line" style="margin-bottom:8px;"/>
      <textarea id="manage-email-body" placeholder="Message to store owner…" rows="3" style="width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-md);color:var(--text);font-size:13px;resize:vertical;font-family:inherit;outline:none;box-sizing:border-box;"></textarea>
      <button class="btn btn-primary btn-sm" id="manage-email-btn" onclick="submitManualEmail()" style="width:100%;justify-content:center;margin-top:8px;">Send Email</button>
    </div>

    <div style="padding:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Internal Notes</div>
      <textarea id="manage-notes" placeholder="Private notes (not visible to store owner)…" rows="3" style="width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-md);color:var(--text);font-size:13px;resize:vertical;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:8px;"></textarea>
      <button class="btn btn-sm" id="manage-notes-btn" onclick="submitNotes()" style="width:100%;justify-content:center;">Save Notes</button>
    </div>

    <div class="alert" id="manage-alert" style="margin-top:12px;"></div>
  </div>
</div>

<!-- VIEW PRODUCTS MODAL -->
<div class="modal-bg" id="products-modal">
  <div class="modal" style="max-width:640px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 id="products-modal-title">Product Catalog</h3>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div style="overflow-x:auto;max-height:440px;overflow-y:auto;">
      <table>
        <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead>
        <tbody id="products-modal-table"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- BROADCAST MODAL -->
<div class="modal-bg" id="broadcast-modal">
  <div class="modal" style="max-width:520px;">
    <div class="modal-icon" style="background:var(--accent-light);color:var(--accent);">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
    </div>
    <h3>Broadcast Email</h3>
    <p>Send an email to all active stores or filter by plan.</p>
    <div class="form-group">
      <label class="form-label">Target Audience</label>
      <select id="broadcast-target">
        <option value="">All active stores</option>
        <option value="trial">Trial stores only</option>
        <option value="starter">Starter plan only</option>
        <option value="growth">Growth plan only</option>
        <option value="pro">Pro plan only</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Subject</label>
      <input type="text" id="broadcast-subject" placeholder="Email subject line"/>
    </div>
    <div class="form-group">
      <label class="form-label">Message</label>
      <textarea id="broadcast-body" rows="5" placeholder="Your message to stores…" style="width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-md);color:var(--text);font-size:13px;resize:vertical;font-family:inherit;outline:none;box-sizing:border-box;"></textarea>
    </div>
    <div class="modal-btns">
      <button class="btn btn-primary" id="broadcast-confirm-btn" onclick="submitBroadcast()">Send Broadcast</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>
    <div class="alert" id="broadcast-alert" style="margin-top:12px;"></div>
  </div>
</div>
```

**Step 5 — Add all new JavaScript functions.**

Add these functions inside the `<script>` block, directly before the closing `</script>` tag. Do not modify any existing function:

```js
// ─── MANAGE STORE ──────────────────────────────────────────
let _managingStoreId = null;

function openManageStore(storeId, name, plan, planStatus, notes) {
  _managingStoreId = storeId;
  document.getElementById('manage-store-title').textContent = decodeURIComponent(name || '');
  document.getElementById('manage-plan-select').value = plan || 'trial';
  document.getElementById('manage-status-select').value = planStatus || 'active';
  document.getElementById('manage-notes').value = decodeURIComponent(notes || '');
  document.getElementById('manage-email-subject').value = '';
  document.getElementById('manage-email-body').value = '';
  const alertEl = document.getElementById('manage-alert');
  if (alertEl) alertEl.className = 'alert';
  document.getElementById('manage-modal').classList.add('open');
}

async function submitPlanChange() {
  if (!_managingStoreId) return;
  const plan = document.getElementById('manage-plan-select').value;
  const planStatus = document.getElementById('manage-status-select').value;
  const btn = document.getElementById('manage-plan-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/set-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: _managingStoreId, plan, planStatus })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('manage-alert', `Plan updated to ${plan} (${planStatus})`, 'success');
      loadStores();
      loadOverview();
    } else {
      showAlert('manage-alert', data.error || 'Failed to update plan', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('manage-alert', 'Server error', 'error');
  }
}

async function submitTrialExtend() {
  if (!_managingStoreId) return;
  const days = document.getElementById('manage-trial-days').value;
  const btn = document.getElementById('manage-trial-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/extend-trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: _managingStoreId, days: Number(days) })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('manage-alert', `Trial extended by ${days} days`, 'success');
      loadStores();
    } else {
      showAlert('manage-alert', data.error || 'Failed to extend trial', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('manage-alert', 'Server error', 'error');
  }
}

async function submitManualEmail() {
  if (!_managingStoreId) return;
  const subject = document.getElementById('manage-email-subject').value.trim();
  const message = document.getElementById('manage-email-body').value.trim();
  if (!subject || !message) return showAlert('manage-alert', 'Subject and message required', 'error');
  const btn = document.getElementById('manage-email-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: _managingStoreId, subject, message })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('manage-alert', 'Email sent successfully', 'success');
      document.getElementById('manage-email-subject').value = '';
      document.getElementById('manage-email-body').value = '';
    } else {
      showAlert('manage-alert', data.error || 'Failed to send email', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('manage-alert', 'Server error', 'error');
  }
}

async function submitNotes() {
  if (!_managingStoreId) return;
  const notes = document.getElementById('manage-notes').value.trim();
  const btn = document.getElementById('manage-notes-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/save-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: _managingStoreId, notes })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) showAlert('manage-alert', 'Notes saved', 'success');
    else showAlert('manage-alert', data.error || 'Failed to save notes', 'error');
  } catch {
    setBtnLoading(btn, false);
    showAlert('manage-alert', 'Server error', 'error');
  }
}

// ─── VIEW STORE PRODUCTS ───────────────────────────────────
async function viewStoreProducts(storeId, name) {
  document.getElementById('products-modal-title').textContent =
    `${decodeURIComponent(name || '')} — Catalog`;
  document.getElementById('products-modal-table').innerHTML =
    `<tr class="table-loading"><td colspan="4">Loading catalog…</td></tr>`;
  document.getElementById('products-modal').classList.add('open');
  try {
    const res = await fetch(`${API}/admin/store-products/${storeId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('products-modal-table').innerHTML =
        data.products.length > 0
        ? data.products.map(p => `
          <tr>
            <td>${safeText(p.name)}</td>
            <td><span class="badge badge-muted">${safeText(p.category)}</span></td>
            <td>Rs ${Number(p.price).toLocaleString()}</td>
            <td><span class="badge ${p.in_stock ? 'badge-success' : 'badge-danger'}">${p.in_stock ? 'In stock' : 'Out of stock'}</span></td>
          </tr>`).join('')
        : `<tr><td colspan="4" class="table-empty">No products in catalog yet.</td></tr>`;
    } else {
      document.getElementById('products-modal-table').innerHTML =
        `<tr><td colspan="4" class="table-empty">Failed to load catalog.</td></tr>`;
    }
  } catch {
    document.getElementById('products-modal-table').innerHTML =
      `<tr><td colspan="4" class="table-empty">Could not connect to server.</td></tr>`;
  }
}

// ─── BROADCAST ────────────────────────────────────────────
async function submitBroadcast() {
  const subject = document.getElementById('broadcast-subject').value.trim();
  const message = document.getElementById('broadcast-body').value.trim();
  const targetPlan = document.getElementById('broadcast-target').value;
  if (!subject || !message)
    return showAlert('broadcast-alert', 'Subject and message are required', 'error');
  const btn = document.getElementById('broadcast-confirm-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ subject, message, targetPlan: targetPlan || undefined })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('broadcast-alert', data.message, 'success');
      document.getElementById('broadcast-subject').value = '';
      document.getElementById('broadcast-body').value = '';
    } else {
      showAlert('broadcast-alert', data.error || 'Broadcast failed', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('broadcast-alert', 'Server error', 'error');
  }
}

// ─── RUN DRIP MANUALLY ────────────────────────────────────
async function runDripNow(btn) {
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/run-drip`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      const r = data.results;
      showToast(
        'Drip emails sent',
        `Trial warnings: ${r.trialWarnings} · Onboarding: ${r.onboarding} · Dunning: ${r.dunning} · Stale alerts: ${r.stalePayments}`,
        'success'
      );
    } else {
      showToast('Drip failed', data.error || 'Something went wrong', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showToast('Error', 'Could not connect to server', 'error');
  }
}
```

---

Give Windsurf one chunk at a time in the order listed. After each chunk, verify the server starts without errors before moving to the next.