Context: This is dashboard/index.html — a single-file SPA. It has a landing page (#page-landing), and three auth pages (#page-signup, #page-login, #page-forgot). We are ONLY redesigning the three auth pages. Do not touch the landing page, nav, any JavaScript functions (doSignup, doLogin, doForgot, showPage, checkSignupStrength, togglePassword, setSignupStoreMode, handleGoogleCredentialResponse), or any input IDs. All logic and functionality must remain exactly as-is.
________________________________________
What We're Building
A clean, minimal, light-themed full-screen auth experience. Think Linear, Vercel, or Raycast sign-in pages — white background, generous whitespace, one clear action per screen. No header, no nav visible. Just a centered card with a subtle back-to-home link.
________________________________________
Step 1 — Add These CSS Variables
Inside the existing :root block at the top of the <style> tag, add these new variables (they don't conflict with landing page variables):
--auth-bg: #f8f9fb;
--auth-surface: #ffffff;
--auth-border: #e5e7eb;
--auth-border-focus: #4f46e5;
--auth-text: #111827;
--auth-muted: #6b7280;
--auth-dim: #9ca3af;
--auth-accent: #4f46e5;
--auth-accent-hover: #4338ca;
--auth-accent-light: #eef2ff;
--auth-success: #059669;
--auth-danger: #dc2626;
--auth-danger-bg: #fef2f2;
--auth-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
________________________________________
Step 2 — Replace Auth Page CSS
Find and DELETE these CSS rule blocks entirely (they apply only to auth pages, not the landing page):
•	#page-signup .auth-wrap, #page-login .auth-wrap, #page-forgot .auth-wrap { background: radial-gradient(...) }
•	#page-signup .auth-box, #page-login .auth-box, #page-forgot .auth-box { ... } (the dark glassmorphism box with backdrop-filter)
•	#page-signup .auth-box::before, #page-login .auth-box::before, #page-forgot .auth-box::before (the lineSweep animation bar)
•	#page-signup .auth-box h2, #page-login .auth-box h2, #page-forgot .auth-box h2
•	#page-signup .auth-box p, #page-login .auth-box p, #page-forgot .auth-box p
•	#page-signup .form-group, #page-login .form-group, #page-forgot .form-group
•	#page-signup .form-label, #page-login .form-label, #page-forgot .form-label
•	#page-signup .auth-tagline, #page-login .auth-tagline
•	#page-signup .auth-benefits, #page-login .auth-benefits
•	#page-signup .auth-benefits li, #page-login .auth-benefits li
•	#page-signup .divider, #page-login .divider, #page-forgot .divider
•	#page-signup .btn.btn-primary.btn-full, #page-login .btn.btn-primary.btn-full, #page-forgot .btn.btn-primary.btn-full (the gradient button override)
•	#page-signup .btn.btn-primary.btn-full:hover, #page-login ... hover
•	#page-signup input, #page-login input, #page-forgot input (the dark input override)
•	#page-signup input:focus, #page-login input:focus, #page-forgot input:focus
•	#page-signup .auth-switch, #page-login .auth-switch, #page-forgot .auth-switch
•	.auth-meta { ... } and .auth-meta span { ... } and .auth-meta span:hover { ... }
•	.auth-box .btn.btn-primary.btn-full { ... }
•	.auth-box .auth-switch a { ... } and .auth-box .auth-switch a:hover { ... }
•	The media queries inside @media(max-width:768px) that reference #page-signup .auth-box, #page-login .auth-box, #page-forgot .auth-box, .auth-meta, and #page-signup .auth-benefits
•	The @media (max-height: 760px) block that references auth boxes
Then ADD this new CSS block in their place:
/* ── AUTH PAGES — CLEAN LIGHT THEME ── */

#page-signup,
#page-login,
#page-forgot {
  background: var(--auth-bg);
  min-height: 100vh;
}

#page-signup.active,
#page-login.active,
#page-forgot.active {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 20px;
}

/* Back to home link — top left, subtle */
.auth-back {
  position: fixed;
  top: 20px;
  left: 24px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--auth-muted);
  cursor: pointer;
  text-decoration: none;
  transition: color 0.15s;
  z-index: 10;
  font-family: 'DM Sans', 'Poppins', sans-serif;
}
.auth-back:hover { color: var(--auth-text); }
.auth-back svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* Logo mark top left */
.auth-logo {
  position: fixed;
  top: 18px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--auth-text);
  cursor: pointer;
  z-index: 10;
  font-family: 'Montserrat', sans-serif;
}
.auth-logo-mark {
  width: 28px;
  height: 28px;
  background: var(--auth-accent);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-logo-mark svg {
  width: 14px;
  height: 14px;
  stroke: #fff;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* The card */
#page-signup .auth-wrap,
#page-login .auth-wrap,
#page-forgot .auth-wrap {
  width: 100%;
  max-width: 440px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  min-height: unset;
  background: none;
}

#page-signup .auth-box,
#page-login .auth-box,
#page-forgot .auth-box {
  width: 100%;
  background: var(--auth-surface);
  border: 1px solid var(--auth-border);
  border-radius: 16px;
  padding: 36px 36px 32px;
  box-shadow: var(--auth-shadow);
  animation: authCardIn 0.22s ease both;
  max-height: none;
  overflow: visible;
  backdrop-filter: none;
}

@keyframes authCardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Card header */
#page-signup .auth-box h2,
#page-login .auth-box h2,
#page-forgot .auth-box h2 {
  font-size: 22px;
  font-weight: 700;
  color: var(--auth-text);
  margin-bottom: 5px;
  letter-spacing: -0.3px;
  line-height: 1.25;
  font-family: 'Montserrat', sans-serif;
}

#page-signup .auth-box > p,
#page-login .auth-box > p,
#page-forgot .auth-box > p {
  font-size: 13px;
  color: var(--auth-muted);
  margin-bottom: 24px;
  line-height: 1.6;
}

/* Google button section */
#page-signup .g_id_signin,
#page-login .g_id_signin {
  margin-bottom: 0;
}

/* Divider */
#page-signup .divider,
#page-login .divider,
#page-forgot .divider {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--auth-dim);
  margin: 18px 0;
}
#page-signup .divider::before,
#page-signup .divider::after,
#page-login .divider::before,
#page-login .divider::after,
#page-forgot .divider::before,
#page-forgot .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--auth-border);
}

/* Form fields */
#page-signup .form-group,
#page-login .form-group,
#page-forgot .form-group {
  margin-bottom: 14px;
}

#page-signup .form-label,
#page-login .form-label,
#page-forgot .form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--auth-text);
  margin-bottom: 6px;
  letter-spacing: 0;
  text-transform: none;
}

#page-signup input,
#page-login input,
#page-forgot input {
  background: var(--auth-bg);
  border: 1px solid var(--auth-border);
  border-radius: 9px;
  color: var(--auth-text);
  font-size: 13.5px;
  padding: 10px 13px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
#page-signup input::placeholder,
#page-login input::placeholder,
#page-forgot input::placeholder {
  color: var(--auth-dim);
}
#page-signup input:focus,
#page-login input:focus,
#page-forgot input:focus {
  border-color: var(--auth-accent);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  background: #fff;
  outline: none;
}

/* Password strength bar track */
#page-signup #signup-strength-bar {
  /* keep JS-controlled width/color, just fix the track color */
}
#page-signup [style*="background:#2a2d3e"] {
  background: var(--auth-border) !important;
}

/* Password hint text */
#page-signup [style*="font-size:11px;color:#666"] {
  color: var(--auth-dim) !important;
}

/* Store mode switcher */
#signup-store-mode-switcher {
  display: flex;
  gap: 8px;
}
#signup-mode-custom,
#signup-mode-woo {
  flex: 1;
  justify-content: center;
  border-radius: 9px !important;
  font-size: 13px !important;
  padding: 9px 12px !important;
  font-weight: 500 !important;
  border: 1.5px solid var(--auth-border) !important;
  background: var(--auth-surface) !important;
  color: var(--auth-muted) !important;
  transition: all 0.15s !important;
  display: flex;
  align-items: center;
  gap: 7px;
}
#signup-mode-custom.active-mode,
#signup-mode-woo.active-mode {
  border-color: var(--auth-accent) !important;
  background: var(--auth-accent-light) !important;
  color: var(--auth-accent) !important;
}

/* Primary button */
#page-signup .btn.btn-primary.btn-full,
#page-login .btn.btn-primary.btn-full,
#page-forgot .btn.btn-primary.btn-full {
  background: var(--auth-accent);
  color: #fff;
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 20px;
  width: 100%;
  margin-top: 4px;
  box-shadow: none;
  transition: background 0.15s, transform 0.12s;
  justify-content: center;
}
#page-signup .btn.btn-primary.btn-full:hover,
#page-login .btn.btn-primary.btn-full:hover,
#page-forgot .btn.btn-primary.btn-full:hover {
  background: var(--auth-accent-hover);
  transform: none;
  box-shadow: none;
}

/* Alert */
#page-signup .alert,
#page-login .alert,
#page-forgot .alert {
  margin-top: 12px;
  font-size: 13px;
  border-radius: 8px;
}
#page-signup .alert-error,
#page-login .alert-error,
#page-forgot .alert-error {
  background: var(--auth-danger-bg);
  color: var(--auth-danger);
  border-color: rgba(220, 38, 38, 0.2);
}

/* Auth switch link */
#page-signup .auth-switch,
#page-login .auth-switch,
#page-forgot .auth-switch {
  text-align: center;
  margin-top: 18px;
  font-size: 13px;
  color: var(--auth-muted);
}
#page-signup .auth-switch a,
#page-login .auth-switch a,
#page-forgot .auth-switch a {
  color: var(--auth-accent);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  border-bottom: none;
}
#page-signup .auth-switch a:hover,
#page-login .auth-switch a:hover,
#page-forgot .auth-switch a:hover {
  text-decoration: underline;
}

/* Forgot password link */
#page-login .forgot-link {
  display: block;
  text-align: right;
  font-size: 12px;
  color: var(--auth-accent);
  cursor: pointer;
  margin-top: -6px;
  margin-bottom: 14px;
}

/* Password toggle icon */
.pwd-toggle {
  color: var(--auth-dim);
  font-size: 14px;
}

/* Eye icon SVG inside pwd-toggle */
.pwd-toggle svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Remove old auth-meta trust badges entirely */
.auth-meta { display: none !important; }

/* Remove auth-tagline gold badge */
.auth-tagline { display: none !important; }

/* Remove auth-benefits chips */
.auth-benefits { display: none !important; }

/* Mobile */
@media (max-width: 480px) {
  #page-signup .auth-box,
  #page-login .auth-box,
  #page-forgot .auth-box {
    padding: 28px 22px 24px;
    border-radius: 14px;
  }
  .auth-back { top: 14px; left: 16px; }
  .auth-logo { top: 14px; left: 16px; }
}
________________________________________
Step 3 — Replace Auth Page HTML
Replace #page-signup HTML
Find the entire <div class="page" id="page-signup">...</div> block and replace it with:
<div class="page" id="page-signup">
  <!-- Back to home -->
  <div class="auth-back" onclick="showPage('landing')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    Back to home
  </div>

  <div class="auth-wrap">
    <div class="auth-box">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <div style="width:32px;height:32px;background:var(--auth-accent);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <span style="font-size:15px;font-weight:700;color:var(--auth-text);font-family:'Montserrat',sans-serif;">BuildBot</span>
      </div>

      <h2>Create your account</h2>
      <p>14-day free trial. No card required.</p>

      <!-- Google Sign-In -->
      <div id="g_id_onload" data-client_id="YOUR_GOOGLE_CLIENT_ID"
        data-context="signup" data-ux_mode="popup" data-callback="handleGoogleCredentialResponse"
        data-auto_prompt="false">
      </div>
      <div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="outline"
        data-text="signup_with" data-size="large" data-logo_alignment="left"></div>

      <div class="divider">or continue with email</div>

      <!-- Fields -->
      <div class="form-group">
        <label class="form-label">Store Name</label>
        <input type="text" id="signup-name" placeholder="e.g. TechZone Lahore" autocomplete="organization" />
      </div>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" id="signup-email" placeholder="you@yourstore.com" autocomplete="email" />
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <div class="pwd-wrap">
          <input type="password" id="signup-password" placeholder="Min 8 characters"
            oninput="checkSignupStrength(this.value)" autocomplete="new-password" />
          <span class="pwd-toggle" onclick="togglePassword('signup-password', this)">
            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
        </div>
        <div style="height:3px;border-radius:2px;background:var(--auth-border);margin:8px 0 6px;overflow:hidden;">
          <div id="signup-strength-bar" style="height:100%;border-radius:2px;transition:all .3s;width:0;"></div>
        </div>
        <div style="font-size:11px;color:var(--auth-dim);line-height:1.5;">Use uppercase, lowercase, number and special character.</div>
      </div>

      <!-- Store mode -->
      <div class="form-group">
        <label class="form-label">How do you manage products?</label>
        <div style="display:flex;gap:8px;" id="signup-store-mode-switcher">
          <button type="button" class="btn btn-sm" id="signup-mode-custom" onclick="setSignupStoreMode('custom')" style="flex:1;justify-content:center;border-radius:9px;border:1.5px solid var(--auth-accent);background:var(--auth-accent-light);color:var(--auth-accent);font-weight:600;font-size:13px;padding:9px 12px;display:flex;align-items:center;gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Manual / CSV
          </button>
          <button type="button" class="btn btn-sm" id="signup-mode-woo" onclick="setSignupStoreMode('woo')" style="flex:1;justify-content:center;border-radius:9px;border:1.5px solid var(--auth-border);background:var(--auth-surface);color:var(--auth-muted);font-weight:500;font-size:13px;padding:9px 12px;display:flex;align-items:center;gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            WooCommerce
          </button>
        </div>
        <div style="font-size:11px;color:var(--auth-dim);margin-top:7px;">You can change this later in settings.</div>
      </div>

      <button class="btn btn-primary btn-full" onclick="doSignup(this)">Create account</button>

      <div class="alert" id="signup-alert"></div>

      <div class="auth-switch">Already have an account? <a onclick="showPage('login')">Sign in</a></div>

    </div>
  </div>
</div>
________________________________________
Replace #page-login HTML
Find the entire <div class="page" id="page-login">...</div> block and replace it with:
<div class="page" id="page-login">
  <div class="auth-back" onclick="showPage('landing')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    Back to home
  </div>

  <div class="auth-wrap">
    <div class="auth-box">

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <div style="width:32px;height:32px;background:var(--auth-accent);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <span style="font-size:15px;font-weight:700;color:var(--auth-text);font-family:'Montserrat',sans-serif;">BuildBot</span>
      </div>

      <h2>Welcome back</h2>
      <p>Sign in to your store dashboard.</p>

      <div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="outline"
        data-text="signin_with" data-size="large" data-logo_alignment="left"></div>

      <div class="divider">or continue with email</div>

      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" id="login-email" placeholder="you@yourstore.com" autocomplete="email" />
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <div class="pwd-wrap">
          <input type="password" id="login-password" placeholder="Your password" autocomplete="current-password" />
          <span class="pwd-toggle" onclick="togglePassword('login-password', this)">
            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
        </div>
      </div>

      <div style="text-align:right;margin-top:-6px;margin-bottom:16px;">
        <span onclick="showPage('forgot')" style="font-size:12px;color:var(--auth-accent);cursor:pointer;font-weight:500;">Forgot password?</span>
      </div>

      <button class="btn btn-primary btn-full" onclick="doLogin(this)">Sign in</button>

      <div class="alert" id="login-alert"></div>

      <div class="auth-switch">Don't have an account? <a onclick="showPage('signup')">Start free trial</a></div>

    </div>
  </div>
</div>
________________________________________
Replace #page-forgot HTML
Find the entire <div class="page" id="page-forgot">...</div> block and replace it with:
<div class="page" id="page-forgot">
  <div class="auth-back" onclick="showPage('login')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    Back to sign in
  </div>

  <div class="auth-wrap">
    <div class="auth-box">

      <div style="width:44px;height:44px;background:var(--auth-accent-light);border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:18px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--auth-accent)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>

      <h2>Forgot your password?</h2>
      <p>Enter your email and we'll send you a reset link.</p>

      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" id="forgot-email" placeholder="you@yourstore.com" autocomplete="email" />
      </div>

      <button class="btn btn-primary btn-full" onclick="doForgot(this)">Send reset link</button>

      <div class="alert" id="forgot-alert"></div>

      <div class="auth-switch">
        <a onclick="showPage('login')">← Back to sign in</a>
      </div>

    </div>
  </div>
</div>
________________________________________
Step 4 — Update setSignupStoreMode() JS Function
Find the setSignupStoreMode function in the <script> block and replace its contents so it properly toggles the button styles for the new light theme:
function setSignupStoreMode(mode) {
  localStorage.setItem('bb_signup_store_mode', mode);
  const customBtn = document.getElementById('signup-mode-custom');
  const wooBtn = document.getElementById('signup-mode-woo');
  if (!customBtn || !wooBtn) return;

  const activeStyle = 'flex:1;justify-content:center;border-radius:9px;border:1.5px solid var(--auth-accent);background:var(--auth-accent-light);color:var(--auth-accent);font-weight:600;font-size:13px;padding:9px 12px;display:flex;align-items:center;gap:6px;';
  const inactiveStyle = 'flex:1;justify-content:center;border-radius:9px;border:1.5px solid var(--auth-border);background:var(--auth-surface);color:var(--auth-muted);font-weight:500;font-size:13px;padding:9px 12px;display:flex;align-items:center;gap:6px;';

  if (mode === 'custom') {
    customBtn.style.cssText = activeStyle;
    wooBtn.style.cssText = inactiveStyle;
  } else {
    wooBtn.style.cssText = activeStyle;
    customBtn.style.cssText = inactiveStyle;
  }
}
________________________________________
Step 5 — Update togglePassword() to remove emoji, use SVG
Find the togglePassword function and replace it with:
function togglePassword(inputId, toggleEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  toggleEl.innerHTML = isHidden
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
________________________________________
What Must NOT Change
•	All function names: doSignup, doLogin, doForgot, showPage, checkSignupStrength, handleGoogleCredentialResponse, setSignupStoreMode, togglePassword
•	All input IDs: signup-name, signup-email, signup-password, signup-strength-bar, login-email, login-password, forgot-email, signup-alert, login-alert, forgot-alert, signup-mode-custom, signup-mode-woo, g_id_onload
•	The landing page HTML, CSS, and JS — untouched
•	The nav HTML — untouched
•	config.js reference and accounts.google.com/gsi/client script tag — untouched

