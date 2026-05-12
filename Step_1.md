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

