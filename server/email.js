const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || 'https://buildbot-nine.vercel.app';
const FROM = 'BuildBot <onboarding@resend.dev>';
const TO_OVERRIDE = process.env.RESEND_TEST_EMAIL || null;

// ─── SEND FUNCTION ────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  try {
    const recipient = TO_OVERRIDE || to;
    const { error } = await resend.emails.send({
      from: FROM,
      to: recipient,
      subject,
      html
    });
    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message);
    }
    console.log('Email sent to:', recipient);
    return true;
  } catch (err) {
    console.error('Email failed:', err.message);
    throw err;
  }
}

// ─── TEMPLATES ────────────────────────────────────────────
function welcomeEmail(storeName, email) {
  return {
    to: email,
    subject: '⚡ Welcome to BuildBot — Your trial has started!',
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0f1117;color:#e0e0e0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#7c6af7,#5b4fe0);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:28px;margin:0;">⚡ BuildBot</h1>
          <p style="color:rgba(255,255,255,.8);margin:8px 0 0;">AI PC Build Recommender</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;margin-bottom:8px;">Welcome, ${storeName}! 🎉</h2>
          <p style="color:#888;line-height:1.7;">Your 14-day free trial has started. Here's how to get set up in 3 steps:</p>
          <div style="background:#1a1d27;border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 12px;color:#e0e0e0;"><strong style="color:#7c6af7;">Step 1:</strong> Upload your product catalog (CSV file)</p>
            <p style="margin:0 0 12px;color:#e0e0e0;"><strong style="color:#7c6af7;">Step 2:</strong> Copy your embed code from the dashboard</p>
            <p style="margin:0;color:#e0e0e0;"><strong style="color:#7c6af7;">Step 3:</strong> Paste it on your website before &lt;/body&gt;</p>
          </div>
          <a href="${APP_URL}" style="display:inline-block;background:#7c6af7;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0;">Go to Dashboard →</a>
          <p style="color:#666;font-size:12px;margin-top:24px;">Trial ends in 14 days. Need help? Reply to this email.</p>
        </div>
      </div>`
  };
}

function emailVerificationEmail(storeName, email, token) {
  return {
    to: email,
    subject: '⚡ Verify your BuildBot email address',
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0f1117;color:#e0e0e0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#7c6af7,#5b4fe0);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:28px;margin:0;">⚡ BuildBot</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;">Verify your email, ${storeName}</h2>
          <p style="color:#888;line-height:1.7;">Click the button below to verify your email address and activate your account.</p>
          <a href="${APP_URL}/verify.html?token=${token}" style="display:inline-block;background:#7c6af7;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">✅ Verify Email Address</a>
          <p style="color:#666;font-size:12px;margin-top:24px;">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
        </div>
      </div>`
  };
}

function paymentApprovedEmail(storeName, email, plan) {
  return {
    to: email,
    subject: '✅ Payment approved — Your BuildBot plan is now active!',
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0f1117;color:#e0e0e0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#7c6af7,#5b4fe0);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:28px;margin:0;">⚡ BuildBot</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#2ecc71;">Payment Approved! ✅</h2>
          <p style="color:#888;line-height:1.7;">Hi ${storeName}, your payment has been verified and your <strong style="color:#7c6af7;">${plan.charAt(0).toUpperCase()+plan.slice(1)}</strong> plan is now active.</p>
          <div style="background:#1a3a2a;border:1px solid #2ecc71;border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:0;color:#2ecc71;">Your widget is fully active. Customers can now get AI build recommendations on your store!</p>
          </div>
          <a href="${APP_URL}" style="display:inline-block;background:#7c6af7;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard →</a>
        </div>
      </div>`
  };
}

function paymentRejectedEmail(storeName, email, plan) {
  return {
    to: email,
    subject: '❌ Payment could not be verified — BuildBot',
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0f1117;color:#e0e0e0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#7c6af7,#5b4fe0);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:28px;margin:0;">⚡ BuildBot</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#e74c3c;">Payment Not Verified ❌</h2>
          <p style="color:#888;line-height:1.7;">Hi ${storeName}, unfortunately we could not verify your payment for the <strong style="color:#7c6af7;">${plan.charAt(0).toUpperCase()+plan.slice(1)}</strong> plan.</p>
          <div style="background:#3a1a1a;border:1px solid #e74c3c;border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:0;color:#e74c3c;">Please make sure to send the correct amount and provide the exact transaction ID. Try submitting again from your dashboard.</p>
          </div>
          <a href="${APP_URL}" style="display:inline-block;background:#7c6af7;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Try Again →</a>
        </div>
      </div>`
  };
}

function trialEndingEmail(storeName, email, daysLeft) {
  return {
    to: email,
    subject: `⏰ Your BuildBot trial ends in ${daysLeft} days`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0f1117;color:#e0e0e0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#7c6af7,#5b4fe0);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:28px;margin:0;">⚡ BuildBot</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#f39c12;">Trial ending in ${daysLeft} days ⏰</h2>
          <p style="color:#888;line-height:1.7;">Hi ${storeName}, your free trial ends in <strong style="color:#f39c12;">${daysLeft} days</strong>. After that your widget will stop working.</p>
          <div style="background:#1a1d27;border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#e0e0e0;font-weight:600;">Keep BuildBot active from just:</p>
            <p style="margin:0;color:#7c6af7;font-size:22px;font-weight:700;">Rs 2,999/month</p>
          </div>
          <p style="color:#888;font-size:13px;">Pay via JazzCash or EasyPaisa — verified within 24 hours.</p>
          <a href="${APP_URL}" style="display:inline-block;background:#7c6af7;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Upgrade Now →</a>
        </div>
      </div>`
  };
}

function passwordResetEmail(storeName, email, token) {
  return {
    to: email,
    subject: '🔑 Reset your BuildBot password',
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0f1117;color:#e0e0e0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#7c6af7,#5b4fe0);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:28px;margin:0;">⚡ BuildBot</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;">Reset your password 🔑</h2>
          <p style="color:#888;line-height:1.7;">Hi ${storeName}, click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${APP_URL}/reset-password.html?token=${token}" style="display:inline-block;background:#7c6af7;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">🔑 Reset Password</a>
          <p style="color:#666;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email. Your password won't change.</p>
        </div>
      </div>`
  };
}

function adminPasswordResetEmail(name, email, token) {
  return {
    to: email,
    subject: '🔑 Reset your BuildBot Admin password',
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0f1117;color:#e0e0e0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#7c6af7,#5b4fe0);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:28px;margin:0;">⚡ BuildBot Admin</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;">Reset your admin password 🔑</h2>
          <p style="color:#888;line-height:1.7;">Hi ${name}, click the button below to reset your admin password. This link expires in 1 hour.</p>
          <a href="${APP_URL}/admin.html?reset_token=${token}" style="display:inline-block;background:#7c6af7;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">🔑 Reset Password</a>
          <p style="color:#666;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email. Your password won't change.</p>
        </div>
      </div>`
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
  adminPasswordResetEmail
};