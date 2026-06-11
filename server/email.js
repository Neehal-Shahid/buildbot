const { Resend } = require('resend');
require('dotenv').config();

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const APP_URL = process.env.APP_URL || 'https://buildbot-nine.vercel.app';
const FROM = 'BuildBot <onboarding@resend.dev>';
const TO_OVERRIDE = process.env.RESEND_TEST_EMAIL || null;

// ─── EMAIL BASE TEMPLATE ────────────────────────────────────────
function emailBase({ preheader = '', content = '' } = {}) {
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

// ─── SEND FUNCTION ────────────────────────────────────────
async function sendEmail({ to, subject, html, meta = null }) {
  try {
    if (!resend) {
      throw new Error('RESEND_API_KEY is not set');
    }
    const recipient = TO_OVERRIDE || to;
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: recipient,
      subject,
      html
    });
    if (error) {
      console.error('Resend error:', error);
      if (meta?.logOnFail) {
        try {
          const { emailLogDB } = require('./database');
          await emailLogDB.logSend(meta.storeId || '', meta.emailType || 'manual', recipient, subject, 'failed');
        } catch {}
      }
      throw new Error(error.message);
    }
    if (meta?.emailType) {
      try {
        const { emailLogDB } = require('./database');
        await emailLogDB.logSend(meta.storeId || '', meta.emailType, recipient, subject, 'sent');
      } catch {}
    }
    console.log('Email sent to:', recipient, meta?.emailType ? `(${meta.emailType})` : '');
    return data;
  } catch (err) {
    console.error('Email failed:', err.message);
    throw err;
  }
}

// ─── TEMPLATES ────────────────────────────────────────────
function welcomeEmail(storeName, email) {
  return {
    to: email,
    subject: 'Welcome to BuildBot — your trial starts now',
    html: emailBase({
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
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Open Dashboard</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">Trial ends in 14 days. Questions? Just reply to this email.</p>
  `
    })
  };
}

function emailVerificationEmail(storeName, email, token, otpCode = null) {
  const otpBlock = otpCode ? `
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
      <tr><td style="padding:16px 20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Or enter this code</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#4f46e5;letter-spacing:0.25em;font-family:monospace;">${otpCode}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Expires in 15 minutes</p>
      </td></tr>
    </table>
  ` : '';

  return {
    to: email,
    subject: 'Please verify your BuildBot email address',
    html: emailBase({
      preheader: 'Verify your email to activate your BuildBot account.',
      content: `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Verify your email</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, click the button below or enter the verification code to confirm your email. The link expires in 24 hours.</p>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/verify.html?token=${token}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Verify Email Address</a>
      </td>
    </tr></table>

    ${otpBlock}

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">If the button doesn't work, copy and paste this link into your browser:<br/>
    <span style="color:#4f46e5;word-break:break-all;">${APP_URL}/verify.html?token=${token}</span></p>
    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Didn't create a BuildBot account? You can safely ignore this email.</p>
  `
    })
  };
}

function paymentApprovedEmail(storeName, email, plan) {
  return {
    to: email,
    subject: 'Your BuildBot payment is confirmed',
    html: emailBase({
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
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Open Dashboard</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Thank you for choosing BuildBot. We're glad to have you.</p>
  `
    })
  };
}

function paymentRejectedEmail(storeName, email, plan) {
  return {
    to: email,
    subject: 'Action required — your BuildBot payment needs attention',
    html: emailBase({
      preheader: 'We could not verify your payment. Please resubmit from your dashboard.',
      content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#fef2f2;border:1px solid rgba(220,38,38,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#dc2626;letter-spacing:0.05em;text-transform:uppercase;">Payment not verified</span>
      </td>
    </tr></table>

    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">We couldn't verify your payment.</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, your payment submission for <strong style="color:#111827;">${plan.charAt(0).toUpperCase() + plan.slice(1)} plan</strong> could not be confirmed. This is usually because of an incorrect transaction ID or amount.</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827;">To resubmit, make sure:</p>
          <p style="margin:0 0 6px;font-size:13px;color:#374151;">— The transaction ID is copied exactly as shown by JazzCash / EasyPaisa</p>
          <p style="margin:0 0 6px;font-size:13px;color:#374151;">— The amount matches your selected plan</p>
          <p style="margin:0;font-size:13px;color:#374151;">— The payment was sent to correct number</p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Resubmit Payment</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Still having trouble? Reply to this email and we'll sort it out.</p>
  `
    })
  };
}

function storeDisabledEmail(storeName, email) {
  return {
    to: email,
    subject: 'Your BuildBot store has been disabled',
    html: emailBase({
      preheader: 'Your BuildBot widget is no longer active.',
      content: `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Your store was disabled</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, your BuildBot account has been disabled by our team. Your widget will no longer show recommendations to customers.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">If you believe this was a mistake, reply to this email and we'll help you restore access.</p>
  `,
    }),
  };
}

function storeDeletedEmail(storeName, email) {
  return {
    to: email,
    subject: 'Your BuildBot store has been removed',
    html: emailBase({
      preheader: 'Your BuildBot account and data have been deleted.',
      content: `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Your store was deleted</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, your BuildBot store account and associated data have been permanently removed from our platform.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">If you'd like to use BuildBot again in the future, you can sign up for a new account at any time.</p>
  `,
    }),
  };
}

function trialEndingEmail(storeName, email, daysLeft) {
  return {
    to: email,
    subject: daysLeft === 1 ? 'Your BuildBot trial ends tomorrow' : `Your BuildBot trial ends in ${daysLeft} days`,
    html: emailBase({
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
          <p style="margin:0;font-size:12px;color:#9ca3af;">per month — via JazzCash or EasyPaisa</p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Upgrade Now</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Payments are verified within 24 hours. Reply to this email if you need help.</p>
  `
    })
  };
}

function passwordResetEmail(storeName, email, token) {
  return {
    to: email,
    subject: 'Reset your BuildBot password',
    html: emailBase({
      preheader: 'You requested a password reset. This link expires in 1 hour.',
      content: `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Reset your password</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, we received a request to reset your BuildBot password. Click below to choose a new one. This link expires in <strong style="color:#111827;">1 hour</strong>.</p>

    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/reset-password.html?token=${token}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Reset Password</a>
      </td>
    </tr></table>

    <p style="margin:24px 0 8px;font-size:12px;color:#9ca3af;line-height:1.6;">If button doesn't work, paste this link into your browser:<br/>
    <span style="color:#4f46e5;word-break:break-all;">${APP_URL}/reset-password.html?token=${token}</span></p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">Didn't request this? Your password is safe — you can ignore this email.</p>
  `
    })
  };
}

function adminPasswordResetEmail(name, email, token) {
  return {
    to: email,
    subject: 'Reset your BuildBot Admin password',
    html: emailBase({
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
  };
}

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

function supportTicketAdminEmail(storeName, storeEmail, storeId, subject, message, ticketId) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'workwithneehal@gmail.com';
  return {
    to: ADMIN_EMAIL,
    subject: `[Support #${ticketId}] ${subject}`,
    html: emailBase({
      preheader: `${storeName} submitted a support request.`,
      content: `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td style="background:#eef2ff;border:1px solid rgba(79,70,229,0.2);border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#4f46e5;letter-spacing:0.05em;text-transform:uppercase;">Support Request #${ticketId}</span>
      </td>
    </tr></table>
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">${subject}</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
      <strong style="color:#111827;">${storeName}</strong><br/>
      ${storeEmail} · Store ID: ${storeId}
    </p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr><td style="padding:16px 20px;background:#f7f8fa;border:1px solid #e4e7ed;border-radius:10px;">
        <div style="font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap;">${message}</div>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#4f46e5;border-radius:8px;">
        <a href="${APP_URL}/admin.html" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Open Admin Panel</a>
      </td>
    </tr></table>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Reply directly to ${storeEmail} to respond to this store owner.</p>
  `
    })
  };
}

function supportTicketConfirmationEmail(storeName, email, subject, ticketId) {
  return {
    to: email,
    subject: `We received your support request — #${ticketId}`,
    html: emailBase({
      preheader: 'Our team will get back to you as soon as possible.',
      content: `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Support request received</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Hi ${storeName}, we received your message about <strong style="color:#111827;">${subject}</strong>. Ticket reference: <strong>#${ticketId}</strong>. We typically respond within 24 hours.</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">You can reply to this email if you need to add more details.</p>
  `
    })
  };
}

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
  adminManualEmail,
  supportTicketAdminEmail,
  supportTicketConfirmationEmail,
  storeDisabledEmail,
  storeDeletedEmail,
};