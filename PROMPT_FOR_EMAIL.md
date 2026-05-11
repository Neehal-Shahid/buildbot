Files to edit:

server/email.js
dashboard/reset-password.html
dashboard/verify.html

Do not touch any other file. Do not change any function names, exports, parameters, API routes, or logic. Only replace HTML strings and page markup.

Part 1 — Shared email base template
Every email function in server/email.js builds its own HTML from scratch. We will replace all of them with a cleaner shared structure. First, add this reusable helper function at the top of the file, directly after the FROM constant (line 7):
jsfunction emailBase({ preheader = '', content = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>BuildBot</title>
</head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:'Segoe UI',Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f7f8fa;">${preheader}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e4e7ed;overflow:hidden;">

      <!-- HEADER -->
      <tr>
        <td style="padding:28px 36px;border-bottom:1px solid #e4e7ed;background:#ffffff;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:30px;height:30px;background:#4f46e5;border-radius:7px;text-align:center;vertical-align:middle;">
                    <img src="https://buildbot-nine.vercel.app/favicon.ico" width="16" height="16" alt="" style="display:block;margin:7px auto;" onerror="this.style.display='none'"/>
                  </td>
                  <td style="padding-left:9px;font-size:15px;font-weight:700;color:#111827;letter-spacing:-0.2px;vertical-align:middle;">BuildBot</td>
                </tr></table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CONTENT -->
      <tr><td style="padding:36px 36px 28px;">${content}</td></tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:20px 36px;border-top:1px solid #e4e7ed;background:#f7f8fa;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
            You received this email because you have a BuildBot account.<br/>
            BuildBot &mdash; AI PC Build Recommender for Pakistani stores.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Part 2 — Replace all email template functions
Replace each function's returned html value. Keep every function signature, to, subject, and module.exports identical. Only the html string changes.

welcomeEmail(storeName, email)
Subject: 'Welcome to BuildBot — your trial starts now'
jshtml: emailBase({
  preheader: `Your 14-day free trial has started, ${storeName}. Here's how to go live in minutes.`,
  content: `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Welcome, ${storeName}.</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Your 14-day free trial has started. Let's get your AI PC recommender live — it takes less than 5 minutes.</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;margin-bottom:8px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:26px;height:26px;background:#eef2ff;border-radius:6px;text-align:center;vertical-align:middle;font-size:12px;font-weight:700;color:#4f46e5;">1</td>
            <td style="padding-left:12px;font-size:13px;color:#374151;line-height:1.5;"><strong style="color:#111827;">Upload your catalog</strong><br/>Export your products as a CSV and upload it in your dashboard.</td>
          </tr></table>
        </td>
      </tr>
      <tr><td height="8"></td></tr>
      <tr>
        <td style="padding:16px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:26px;height:26px;background:#eef2ff;border-radius:6px;text-align:center;vertical-align:middle;font-size:12px;font-weight:700;color:#4f46e5;">2</td>
            <td style="padding-left:12px;font-size:13px;color:#374151;line-height:1.5;"><strong style="color:#111827;">Copy your embed code</strong><br/>One script tag. Paste it before &lt;/body&gt; on your site.</td>
          </tr></table>
        </td>
      </tr>
      <tr><td height="8"></td></tr>
      <tr>
        <td style="padding:16px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:26px;height:26px;background:#eef2ff;border-radius:6px;text-align:center;vertical-align:middle;font-size:12px;font-weight:700;color:#4f46e5;">3</td>
            <td style="padding-left:12px;font-size:13px;color:#374151;line-height:1.5;"><strong style="color:#111827;">Go live</strong><br/>Your customers can now get instant AI PC recommendations.</td>
          </tr></table>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Open Dashboard</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">Trial ends in 14 days. Questions? Just reply to this email.</p>
  `
})

emailVerificationEmail(storeName, email, token)
Subject: 'Please verify your BuildBot email address'
jshtml: emailBase({
  preheader: 'One click to verify your email and activate your BuildBot account.',
  content: `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Verify your email</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, click the button below to confirm your email address and activate your account. This link expires in 24 hours.</p>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/verify.html?token=${token}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Verify Email Address</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">If the button doesn't work, copy and paste this link into your browser:<br/>
    <span style="color:#4f46e5;word-break:break-all;">${APP_URL}/verify.html?token=${token}</span></p>
    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Didn't create a BuildBot account? You can safely ignore this email.</p>
  `
})

paymentApprovedEmail(storeName, email, plan)
Subject: 'Your BuildBot payment is confirmed'
jshtml: emailBase({
  preheader: `Your ${plan} plan is now active. Your widget is live.`,
  content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#ecfdf5;border:1px solid rgba(5,150,105,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#059669;letter-spacing:0.05em;text-transform:uppercase;">Payment confirmed</span>
      </td>
    </tr></table>

    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">You're all set, ${storeName}.</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Your payment has been verified and your <strong style="color:#111827;">${plan.charAt(0).toUpperCase() + plan.slice(1)} plan</strong> is now active. Your widget is live and ready for customers.</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Active Plan</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Open Dashboard</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Thank you for choosing BuildBot. We're glad to have you.</p>
  `
})

paymentRejectedEmail(storeName, email, plan)
Subject: 'Action required — your BuildBot payment needs attention'
jshtml: emailBase({
  preheader: 'We could not verify your payment. Please resubmit from your dashboard.',
  content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#fef2f2;border:1px solid rgba(220,38,38,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#dc2626;letter-spacing:0.05em;text-transform:uppercase;">Payment not verified</span>
      </td>
    </tr></table>

    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">We couldn't verify your payment.</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, your payment submission for the <strong style="color:#111827;">${plan.charAt(0).toUpperCase() + plan.slice(1)} plan</strong> could not be confirmed. This is usually because of an incorrect transaction ID or amount.</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827;">To resubmit, make sure:</p>
          <p style="margin:0 0 6px;font-size:13px;color:#374151;">— The transaction ID is copied exactly as shown by JazzCash / EasyPaisa</p>
          <p style="margin:0 0 6px;font-size:13px;color:#374151;">— The amount matches your selected plan</p>
          <p style="margin:0;font-size:13px;color:#374151;">— The payment was sent to the correct number</p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Resubmit Payment</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Still having trouble? Reply to this email and we'll sort it out.</p>
  `
})

trialEndingEmail(storeName, email, daysLeft)
Subject: daysLeft === 1 ? 'Your BuildBot trial ends tomorrow' : \Your BuildBot trial ends in ${daysLeft} days``
jshtml: emailBase({
  preheader: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left. Keep your widget running — upgrade before your trial ends.`,
  content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#fffbeb;border:1px solid rgba(217,119,6,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#d97706;letter-spacing:0.05em;text-transform:uppercase;">${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining</span>
      </td>
    </tr></table>

    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Your trial is almost over.</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, your free trial ends in <strong style="color:#111827;">${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>. After that, your widget will stop working and customers won't be able to get recommendations.</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Starting from</p>
          <p style="margin:0 0 2px;font-size:28px;font-weight:800;color:#4f46e5;letter-spacing:-0.03em;">Rs 2,999</p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">per month &mdash; via JazzCash or EasyPaisa</p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Upgrade Now</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Payments are verified within 24 hours. Reply to this email if you need help.</p>
  `
})

passwordResetEmail(storeName, email, token)
Subject: 'Reset your BuildBot password'
jshtml: emailBase({
  preheader: 'You requested a password reset. This link expires in 1 hour.',
  content: `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Reset your password</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, we received a request to reset your BuildBot password. Click below to choose a new one. This link expires in <strong style="color:#111827;">1 hour</strong>.</p>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/reset-password.html?token=${token}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Reset Password</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 8px;font-size:12px;color:#9ca3af;line-height:1.6;">If the button doesn't work, paste this link into your browser:<br/>
    <span style="color:#4f46e5;word-break:break-all;">${APP_URL}/reset-password.html?token=${token}</span></p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">Didn't request this? Your password is safe — you can ignore this email.</p>
  `
})

adminPasswordResetEmail(name, email, token)
Subject: 'Reset your BuildBot Admin password'
jshtml: emailBase({
  preheader: 'Admin password reset requested. This link expires in 1 hour.',
  content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#fef2f2;border:1px solid rgba(220,38,38,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#dc2626;letter-spacing:0.05em;text-transform:uppercase;">Admin Access</span>
      </td>
    </tr></table>

    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Reset your admin password</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${name}, a password reset was requested for your BuildBot admin account. This link expires in <strong style="color:#111827;">1 hour</strong>.</p>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/admin.html?reset_token=${token}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Reset Admin Password</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 8px;font-size:12px;color:#9ca3af;line-height:1.6;">If the button doesn't work, paste this link into your browser:<br/>
    <span style="color:#4f46e5;word-break:break-all;">${APP_URL}/admin.html?reset_token=${token}</span></p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">If you didn't request this, contact your team immediately — this may indicate unauthorised access.</p>
  `
})

Part 3 — Replace dashboard/reset-password.html completely
Replace the entire file content with:
html<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Password — BuildBot</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <script src="config.js"></script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: #f7f8fa;
      color: #111827;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 20px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e4e7ed;
      border-radius: 16px;
      padding: 36px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 1px 3px rgba(17,24,39,0.07), 0 4px 16px rgba(17,24,39,0.04);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 24px;
    }
    .logo-mark {
      width: 30px;
      height: 30px;
      background: #4f46e5;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo-mark svg { width: 15px; height: 15px; }
    .logo-text { font-size: 15px; font-weight: 700; color: #111827; letter-spacing: -0.2px; }
    h2 { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 5px; letter-spacing: -0.2px; }
    .sub { font-size: 13px; color: #6b7280; margin-bottom: 24px; line-height: 1.6; }
    .form-group { margin-bottom: 16px; }
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .pwd-wrap { position: relative; }
    input[type=password], input[type=text] {
      width: 100%;
      padding: 10px 40px 10px 12px;
      background: #f7f8fa;
      border: 1px solid #e4e7ed;
      border-radius: 9px;
      color: #111827;
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input:focus {
      border-color: #4f46e5;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
    }
    input::placeholder { color: #9ca3af; }
    .pwd-toggle {
      position: absolute;
      right: 11px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      color: #9ca3af;
      display: flex;
      align-items: center;
      transition: color 0.15s;
    }
    .pwd-toggle:hover { color: #6b7280; }
    .pwd-toggle svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
    .strength-track {
      height: 3px;
      background: #e4e7ed;
      border-radius: 2px;
      margin: 8px 0 5px;
      overflow: hidden;
    }
    .strength-fill {
      height: 100%;
      border-radius: 2px;
      width: 0;
      transition: all 0.3s ease;
    }
    .hint { font-size: 11px; color: #9ca3af; line-height: 1.5; margin-bottom: 4px; }
    .btn {
      width: 100%;
      padding: 11px;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 9px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn:hover { background: #4338ca; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn svg { animation: spin 0.7s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .alert {
      margin-top: 14px;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      display: none;
      border: 1px solid transparent;
    }
    .alert.show { display: block; }
    .alert-success { background: #ecfdf5; border-color: rgba(5,150,105,0.2); color: #059669; }
    .alert-error   { background: #fef2f2; border-color: rgba(220,38,38,0.2);   color: #dc2626; }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">
    <div class="logo-mark">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    </div>
    <span class="logo-text">BuildBot</span>
  </div>

  <h2>Set new password</h2>
  <p class="sub">Choose a strong password for your account.</p>

  <div class="form-group">
    <label>New Password</label>
    <div class="pwd-wrap">
      <input type="password" id="password" placeholder="Min 8 characters" oninput="checkStrength(this.value)" autocomplete="new-password"/>
      <span class="pwd-toggle" onclick="togglePwd('password', this)">
        <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </span>
    </div>
    <div class="strength-track"><div class="strength-fill" id="strength-bar"></div></div>
    <div class="hint">Uppercase, lowercase, number and special character required.</div>
  </div>

  <div class="form-group">
    <label>Confirm Password</label>
    <div class="pwd-wrap">
      <input type="password" id="confirm" placeholder="Repeat password" autocomplete="new-password"/>
      <span class="pwd-toggle" onclick="togglePwd('confirm', this)">
        <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </span>
    </div>
  </div>

  <button class="btn" id="reset-btn" onclick="doReset()">Reset Password</button>
  <div class="alert" id="alert"></div>
</div>

<script>
const API   = window.BB_API || 'https://buildbot-production.up.railway.app/api';
const token = new URLSearchParams(window.location.search).get('token');

function togglePwd(inputId, iconEl) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  iconEl.innerHTML = isHidden
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function checkStrength(val) {
  const bar = document.getElementById('strength-bar');
  let score = 0;
  if (val.length >= 8)                                          score++;
  if (/[A-Z]/.test(val))                                       score++;
  if (/[0-9]/.test(val))                                       score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val))     score++;
  const colors = ['#e4e7ed','#dc2626','#d97706','#d97706','#059669'];
  bar.style.width      = (score / 4 * 100) + '%';
  bar.style.background = colors[score];
}

async function doReset() {
  const password = document.getElementById('password').value;
  const confirm  = document.getElementById('confirm').value;
  const btn      = document.getElementById('reset-btn');
  if (!password || !confirm) return showAlert('Please fill in both fields.', 'error');
  if (password !== confirm)  return showAlert('Passwords do not match.', 'error');
  if (!token)                return showAlert('Invalid or missing reset link.', 'error');

  const orig = btn.innerHTML;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`;
  btn.disabled = true;

  try {
    const res  = await fetch(`${API}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Password reset successfully. Redirecting to login…', 'success');
      setTimeout(() => window.location.href = '/', 2500);
    } else {
      btn.innerHTML = orig;
      btn.disabled  = false;
      showAlert(data.error || 'Something went wrong.', 'error');
    }
  } catch {
    btn.innerHTML = orig;
    btn.disabled  = false;
    showAlert('Cannot connect to server. Please try again.', 'error');
  }
}

function showAlert(msg, type) {
  const el = document.getElementById('alert');
  el.textContent = msg;
  el.className   = `alert alert-${type} show`;
}

// Enter key support
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') doReset();
});
</script>
</body>
</html>

Part 4 — Replace dashboard/verify.html completely
Replace the entire file content with:
html<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify Email — BuildBot</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <script src="config.js"></script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: #f7f8fa;
      color: #111827;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 20px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e4e7ed;
      border-radius: 16px;
      padding: 40px 36px;
      width: 100%;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(17,24,39,0.07), 0 4px 16px rgba(17,24,39,0.04);
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 28px;
    }
    .logo-mark {
      width: 30px;
      height: 30px;
      background: #4f46e5;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo-mark svg { width: 15px; height: 15px; }
    .logo-text { font-size: 15px; font-weight: 700; color: #111827; letter-spacing: -0.2px; }
    .status-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .status-icon svg { width: 26px; height: 26px; stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
    .status-icon.loading { background: #eef2ff; color: #4f46e5; }
    .status-icon.success { background: #ecfdf5; color: #059669; }
    .status-icon.error   { background: #fef2f2; color: #dc2626; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    h2 { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 8px; letter-spacing: -0.2px; }
    p  { font-size: 13px; color: #6b7280; line-height: 1.6; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #4f46e5;
      color: #fff;
      padding: 11px 24px;
      border-radius: 9px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: background 0.15s;
    }
    .btn:hover { background: #4338ca; }
  </style>
</head>
<body>
<div class="card" id="card">

  <div class="logo">
    <div class="logo-mark">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    </div>
    <span class="logo-text">BuildBot</span>
  </div>

  <div class="status-icon loading">
    <svg viewBox="0 0 24 24" class="spin">
      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  </div>
  <h2>Verifying your email…</h2>
  <p>Please wait a moment.</p>

</div>
<script>
const API = window.BB_API || 'https://buildbot-production.up.railway.app/api';

function setCard({ type, title, message, btnText, btnHref }) {
  const iconSvg = {
    success: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  };
  document.getElementById('card').innerHTML = `
    <div class="logo">
      <div class="logo-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
      <span class="logo-text">BuildBot</span>
    </div>
    <div class="status-icon ${type}">${iconSvg[type] || ''}</div>
    <h2>${title}</h2>
    <p>${message}</p>
    <a href="${btnHref}" class="btn">${btnText}</a>
  `;
}

async function verify() {
  const token = new URLSearchParams(window.location.search).get('token');

  if (!token) {
    setCard({
      type: 'error',
      title: 'Invalid link',
      message: 'This verification link is missing a token. Please use the link from your email.',
      btnText: 'Back to home',
      btnHref: '/'
    });
    return;
  }

  try {
    const res  = await fetch(`${API}/verify-email?token=${token}`);
    const data = await res.json();
    if (data.success) {
      setCard({
        type: 'success',
        title: 'Email verified',
        message: 'Your email address has been confirmed. You can now sign in to your dashboard.',
        btnText: 'Sign in now',
        btnHref: '/'
      });
    } else {
      setCard({
        type: 'error',
        title: 'Link expired',
        message: data.error || 'This verification link has expired. Please sign up again to get a new one.',
        btnText: 'Back to home',
        btnHref: '/'
      });
    }
  } catch {
    setCard({
      type: 'error',
      title: 'Connection error',
      message: 'Could not connect to the server. Please check your connection and try again.',
      btnText: 'Try again',
      btnHref: window.location.href
    });
  }
}

verify();
</script>
</body>
</html>

Do not change anything else. Do not modify sendEmail, module.exports, any function signatures, any API routes, auth.js, database.js, or config.js.