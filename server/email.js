const { Resend } = require('resend');
require('dotenv').config();

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const APP_URL = process.env.APP_URL || 'https://buildbot-nine.vercel.app';
const FROM = 'BuildBot <onboarding@resend.dev>';
const TO_OVERRIDE = process.env.RESEND_TEST_EMAIL || null;

// ─── SEND FUNCTION ────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  try {
    if (!resend) {
      throw new Error('RESEND_API_KEY is not set');
    }
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
      <div style="font-family:'DM Sans', 'Segoe UI', sans-serif;max-width:560px;margin:32px auto;background:#ffffff;color:#111827;border-radius:16px;overflow:hidden;border:1px solid #e4e7ed;box-shadow:0 4px 12px rgba(17,24,39,0.08);">
        <div style="background:#f7f8fa;padding:32px;text-align:center;border-bottom:1px solid #e4e7ed;">
          <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:40px;height:40px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h1 style="color:#111827;font-size:24px;margin:0;font-weight:700;">BuildBot</h1>
          </div>
          <p style="color:#6b7280;margin:0;font-size:14px;">AI PC Build Recommender</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#111827;margin-bottom:8px;font-size:20px;">Welcome, ${storeName}! 🎉</h2>
          <p style="color:#374151;line-height:1.6;font-size:15px;">Your 14-day free trial has started. Here's how to get set up in 3 steps:</p>
          <div style="background:#f7f8fa;border:1px solid #e4e7ed;border-radius:12px;padding:24px;margin:24px 0;">
            <p style="margin:0 0 16px;color:#111827;font-size:14px;"><strong style="color:#4f46e5;">Step 1:</strong> Upload your product catalog (CSV file)</p>
            <p style="margin:0 0 16px;color:#111827;font-size:14px;"><strong style="color:#4f46e5;">Step 2:</strong> Copy your embed code from the dashboard</p>
            <p style="margin:0;color:#111827;font-size:14px;"><strong style="color:#4f46e5;">Step 3:</strong> Paste it on your website before &lt;/body&gt;</p>
          </div>
          <a href="${APP_URL}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;font-size:14px;">Go to Dashboard →</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Trial ends in 14 days. Need help? Reply to this email.</p>
        </div>
      </div>`
  };
}

function emailVerificationEmail(storeName, email, token) {
  return {
    to: email,
    subject: '⚡ Verify your BuildBot email address',
    html: `
      <div style="font-family:'DM Sans', 'Segoe UI', sans-serif;max-width:560px;margin:32px auto;background:#ffffff;color:#111827;border-radius:16px;overflow:hidden;border:1px solid #e4e7ed;box-shadow:0 4px 12px rgba(17,24,39,0.08);">
        <div style="background:#f7f8fa;padding:32px;text-align:center;border-bottom:1px solid #e4e7ed;">
          <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:40px;height:40px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h1 style="color:#111827;font-size:24px;margin:0;font-weight:700;">BuildBot</h1>
          </div>
          <p style="color:#6b7280;margin:0;font-size:14px;">AI PC Build Recommender</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#111827;margin-bottom:8px;font-size:20px;">Verify your email, ${storeName}</h2>
          <p style="color:#374151;line-height:1.6;font-size:15px;">Click the button below to verify your email address and activate your account.</p>
          <a href="${APP_URL}/verify.html?token=${token}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;font-size:14px;">✅ Verify Email Address</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
        </div>
      </div>`
  };
}

function paymentApprovedEmail(storeName, email, plan) {
  return {
    to: email,
    subject: '✅ Payment approved — Your BuildBot plan is now active!',
    html: `
      <div style="font-family:'DM Sans', 'Segoe UI', sans-serif;max-width:560px;margin:32px auto;background:#ffffff;color:#111827;border-radius:16px;overflow:hidden;border:1px solid #e4e7ed;box-shadow:0 4px 12px rgba(17,24,39,0.08);">
        <div style="background:#f7f8fa;padding:32px;text-align:center;border-bottom:1px solid #e4e7ed;">
          <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:40px;height:40px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h1 style="color:#111827;font-size:24px;margin:0;font-weight:700;">BuildBot</h1>
          </div>
          <p style="color:#6b7280;margin:0;font-size:14px;">AI PC Build Recommender</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#059669;margin-bottom:8px;font-size:20px;">Payment Approved! ✅</h2>
          <p style="color:#374151;line-height:1.6;font-size:15px;">Hi ${storeName}, your payment has been verified and your <strong style="color:#4f46e5;">${plan.charAt(0).toUpperCase()+plan.slice(1)}</strong> plan is now active.</p>
          <div style="background:#ecfdf5;border:1px solid rgba(5,150,105,0.2);border-radius:12px;padding:20px;margin:20px 0;">
            <p style="margin:0;color:#059669;font-size:14px;">Your widget is fully active. Customers can now get AI build recommendations on your store!</p>
          </div>
          <a href="${APP_URL}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Go to Dashboard →</a>
        </div>
      </div>`
  };
}

function paymentRejectedEmail(storeName, email, plan) {
  return {
    to: email,
    subject: '❌ Payment could not be verified — BuildBot',
    html: `
      <div style="font-family:'DM Sans', 'Segoe UI', sans-serif;max-width:560px;margin:32px auto;background:#ffffff;color:#111827;border-radius:16px;overflow:hidden;border:1px solid #e4e7ed;box-shadow:0 4px 12px rgba(17,24,39,0.08);">
        <div style="background:#f7f8fa;padding:32px;text-align:center;border-bottom:1px solid #e4e7ed;">
          <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:40px;height:40px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h1 style="color:#111827;font-size:24px;margin:0;font-weight:700;">BuildBot</h1>
          </div>
          <p style="color:#6b7280;margin:0;font-size:14px;">AI PC Build Recommender</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#dc2626;margin-bottom:8px;font-size:20px;">Payment Not Verified ❌</h2>
          <p style="color:#374151;line-height:1.6;font-size:15px;">Hi ${storeName}, unfortunately we could not verify your payment for the <strong style="color:#4f46e5;">${plan.charAt(0).toUpperCase()+plan.slice(1)}</strong> plan.</p>
          <div style="background:#fef2f2;border:1px solid rgba(220,38,38,0.2);border-radius:12px;padding:20px;margin:20px 0;">
            <p style="margin:0;color:#dc2626;font-size:14px;">Please make sure to send the correct amount and provide the exact transaction ID. Try submitting again from your dashboard.</p>
          </div>
          <a href="${APP_URL}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Try Again →</a>
        </div>
      </div>`
  };
}

function trialEndingEmail(storeName, email, daysLeft) {
  return {
    to: email,
    subject: `⏰ Your BuildBot trial ends in ${daysLeft} days`,
    html: `
      <div style="font-family:'DM Sans', 'Segoe UI', sans-serif;max-width:560px;margin:32px auto;background:#ffffff;color:#111827;border-radius:16px;overflow:hidden;border:1px solid #e4e7ed;box-shadow:0 4px 12px rgba(17,24,39,0.08);">
        <div style="background:#f7f8fa;padding:32px;text-align:center;border-bottom:1px solid #e4e7ed;">
          <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:40px;height:40px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h1 style="color:#111827;font-size:24px;margin:0;font-weight:700;">BuildBot</h1>
          </div>
          <p style="color:#6b7280;margin:0;font-size:14px;">AI PC Build Recommender</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#d97706;margin-bottom:8px;font-size:20px;">Trial ending in ${daysLeft} days ⏰</h2>
          <p style="color:#374151;line-height:1.6;font-size:15px;">Hi ${storeName}, your free trial ends in <strong style="color:#d97706;">${daysLeft} days</strong>. After that your widget will stop working.</p>
          <div style="background:#f7f8fa;border:1px solid #e4e7ed;border-radius:12px;padding:24px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#111827;font-weight:600;font-size:14px;">Keep BuildBot active from just:</p>
            <p style="margin:0;color:#4f46e5;font-size:22px;font-weight:700;">Rs 2,999/month</p>
          </div>
          <p style="color:#6b7280;font-size:13px;">Pay via JazzCash or EasyPaisa — verified within 24 hours.</p>
          <a href="${APP_URL}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Upgrade Now →</a>
        </div>
      </div>`
  };
}

function passwordResetEmail(storeName, email, token) {
  return {
    to: email,
    subject: '🔑 Reset your BuildBot password',
    html: `
      <div style="font-family:'DM Sans', 'Segoe UI', sans-serif;max-width:560px;margin:32px auto;background:#ffffff;color:#111827;border-radius:16px;overflow:hidden;border:1px solid #e4e7ed;box-shadow:0 4px 12px rgba(17,24,39,0.08);">
        <div style="background:#f7f8fa;padding:32px;text-align:center;border-bottom:1px solid #e4e7ed;">
          <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:40px;height:40px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h1 style="color:#111827;font-size:24px;margin:0;font-weight:700;">BuildBot</h1>
          </div>
          <p style="color:#6b7280;margin:0;font-size:14px;">AI PC Build Recommender</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#111827;margin-bottom:8px;font-size:20px;">Reset your password 🔑</h2>
          <p style="color:#374151;line-height:1.6;font-size:15px;">Hi ${storeName}, click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${APP_URL}/reset-password.html?token=${token}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;font-size:14px;">🔑 Reset Password</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email. Your password won't change.</p>
        </div>
      </div>`
  };
}

function adminPasswordResetEmail(name, email, token) {
  return {
    to: email,
    subject: '🔑 Reset your BuildBot Admin password',
    html: `
      <div style="font-family:'DM Sans', 'Segoe UI', sans-serif;max-width:560px;margin:32px auto;background:#ffffff;color:#111827;border-radius:16px;overflow:hidden;border:1px solid #e4e7ed;box-shadow:0 4px 12px rgba(17,24,39,0.08);">
        <div style="background:#f7f8fa;padding:32px;text-align:center;border-bottom:1px solid #e4e7ed;">
          <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:40px;height:40px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h1 style="color:#111827;font-size:24px;margin:0;font-weight:700;">BuildBot Admin</h1>
          </div>
          <p style="color:#6b7280;margin:0;font-size:14px;">AI PC Build Recommender</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#111827;margin-bottom:8px;font-size:20px;">Reset your admin password 🔑</h2>
          <p style="color:#374151;line-height:1.6;font-size:15px;">Hi ${name}, click the button below to reset your admin password. This link expires in 1 hour.</p>
          <a href="${APP_URL}/admin.html?reset_token=${token}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;font-size:14px;">🔑 Reset Password</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email. Your password won't change.</p>
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