File to edit: dashboard/admin.html only. Do not touch any file in server/. Do not create new files.
Goal: Redesign the admin panel to match the light theme, design system, and component quality of dashboard.html. Fix all critical bugs. Improve UX. Keep all API calls, function names, and element IDs identical unless a fix explicitly requires changing them.

PART 1 — Design System (Replace all CSS)
Delete the entire existing <style> block and replace with this design system that mirrors dashboard.html:
css<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
*, body, input, select, textarea, button { font-family: 'DM Sans', system-ui, sans-serif; }
h1, h2, h3, h4 { font-family: 'DM Sans', system-ui, sans-serif; font-weight: 700; }

:root {
  --bg: #f7f8fa;
  --surface: #ffffff;
  --surface-2: #f1f3f7;
  --surface-3: #e8ebf0;
  --border: #e4e7ed;
  --border-2: #cdd2db;
  --text: #111827;
  --text-2: #374151;
  --muted: #6b7280;
  --dim: #9ca3af;
  --accent: #4f46e5;
  --accent-hover: #4338ca;
  --accent-light: #eef2ff;
  --accent-border: rgba(79,70,229,0.2);
  --accent-text: #4338ca;
  --success: #059669;
  --success-bg: #ecfdf5;
  --success-border: rgba(5,150,105,0.2);
  --warning: #d97706;
  --warning-bg: #fffbeb;
  --warning-border: rgba(217,119,6,0.2);
  --danger: #dc2626;
  --danger-bg: #fef2f2;
  --danger-border: rgba(220,38,38,0.2);
  --shadow-sm: 0 1px 3px rgba(17,24,39,0.07), 0 1px 2px rgba(17,24,39,0.04);
  --shadow-md: 0 4px 12px rgba(17,24,39,0.08), 0 2px 4px rgba(17,24,39,0.04);
  --r-sm: 6px; --r-md: 8px; --r-lg: 12px; --r-xl: 16px;
}

body { background: var(--bg); color: var(--text); min-height: 100vh; }

/* ── LOGIN ── */
.login-wrap {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; padding: 20px;
  background: var(--bg);
}
.login-box {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; padding: 36px; width: 100%; max-width: 400px;
  box-shadow: var(--shadow-sm);
}
.login-logo {
  display: flex; align-items: center; gap: 9px; margin-bottom: 24px;
}
.login-logo-mark {
  width: 32px; height: 32px; background: var(--accent); border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.login-logo-mark svg { width: 16px; height: 16px; stroke: #fff; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.login-logo-text { font-size: 15px; font-weight: 700; color: var(--text); }
.login-logo-badge {
  font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-border);
  padding: 2px 7px; border-radius: 20px; margin-left: 4px;
}
.login-box h2 { font-size: 20px; color: var(--text); margin-bottom: 4px; }
.login-box > p { font-size: 13px; color: var(--muted); margin-bottom: 24px; }

/* ── NAV ── */
nav {
  background: var(--surface); border-bottom: 1px solid var(--border);
  padding: 0 24px; height: 52px; display: flex; align-items: center;
  justify-content: space-between; position: sticky; top: 0; z-index: 100;
}
.nav-logo {
  display: flex; align-items: center; gap: 9px;
  font-size: 15px; font-weight: 700; color: var(--text);
}
.nav-logo-mark {
  width: 26px; height: 26px; background: var(--accent); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.nav-logo-mark svg { width: 13px; height: 13px; stroke: #fff; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.nav-badge {
  background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-border);
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-left: 6px;
  animation: pulse-badge 2s infinite;
}
@keyframes pulse-badge { 0%,100%{opacity:1;} 50%{opacity:0.6;} }
.nav-right { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--muted); }
.nav-right a { color: var(--accent); cursor: pointer; font-weight: 500; text-decoration: none; }
.nav-right a:hover { color: var(--accent-hover); }

/* ── LAYOUT ── */
.layout { display: flex; min-height: calc(100vh - 52px); }
.sidebar {
  width: 220px; background: var(--surface); border-right: 1px solid var(--border);
  padding: 16px 12px; flex-shrink: 0; display: flex; flex-direction: column;
  position: sticky; top: 52px; height: calc(100vh - 52px); overflow-y: auto;
}
.sb-sep {
  font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--dim); padding: 14px 10px 6px; user-select: none;
}
.sb-sep:first-child { padding-top: 4px; }
.sb-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: var(--r-md); cursor: pointer; font-size: 13.5px; font-weight: 500;
  color: var(--muted); transition: background 0.12s, color 0.12s; position: relative;
  text-decoration: none; margin-bottom: 2px;
}
.sb-item svg { width: 16px; height: 16px; flex-shrink: 0; stroke: currentColor; stroke-width: 1.75; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.sb-item:hover { background: var(--surface-2); color: var(--text-2); }
.sb-item.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.sb-item.active svg { stroke: var(--accent); }
.sb-badge {
  margin-left: auto; background: var(--danger); color: #fff;
  font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 20px; min-width: 18px; text-align: center;
}

.main { flex: 1; padding: 24px; overflow-y: auto; max-width: 100%; }

/* ── CARDS ── */
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: 24px; margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
}
.card-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px;
}
.card-head h2 { font-size: 15px; font-weight: 700; color: var(--text); }
.card-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* ── STATS ── */
.stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
.stat {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: 20px; box-shadow: var(--shadow-sm);
}
.stat-icon {
  width: 36px; height: 36px; border-radius: var(--r-md); background: var(--surface-2);
  display: flex; align-items: center; justify-content: center; margin-bottom: 14px; color: var(--muted);
}
.stat-icon svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.stat-val { font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 3px; letter-spacing: -0.02em; }
.stat-lbl { font-size: 12px; color: var(--muted); }

/* ── TABLE ── */
table { width: 100%; border-collapse: collapse; }
th {
  padding: 10px 14px; text-align: left; font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted);
  border-bottom: 1px solid var(--border); background: var(--surface-2);
}
td { padding: 11px 14px; font-size: 13px; color: var(--text-2); border-bottom: 1px solid var(--border); }
tbody tr:hover td { background: var(--surface-2); }
.table-empty { text-align: center; padding: 32px; color: var(--dim); font-size: 13px; }

/* ── BADGES ── */
.badge {
  display: inline-flex; align-items: center; font-size: 11px; font-weight: 600;
  padding: 3px 9px; border-radius: 20px; white-space: nowrap;
}
.badge-success { background: var(--success-bg); color: var(--success); }
.badge-warning { background: var(--warning-bg); color: var(--warning); }
.badge-danger  { background: var(--danger-bg);  color: var(--danger);  }
.badge-accent  { background: var(--accent-light); color: var(--accent); }
.badge-muted   { background: var(--surface-2); color: var(--muted); border: 1px solid var(--border); }

/* ── FORMS ── */
.form-group { margin-bottom: 16px; }
.form-label {
  font-size: 12px; color: var(--muted); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block;
}
input[type=text], input[type=email], input[type=password], select {
  width: 100%; padding: 9px 12px; background: var(--surface);
  border: 1px solid var(--border-2); border-radius: var(--r-md);
  color: var(--text); font-size: 13px; outline: none; transition: border 0.15s, box-shadow 0.15s;
}
input:focus, select:focus {
  border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light);
}
input::placeholder { color: var(--dim); }
.pwd-wrap { position: relative; display: flex; align-items: center; }
.pwd-toggle {
  position: absolute; right: 10px; cursor: pointer; color: var(--dim);
  display: flex; align-items: center; transition: color 0.15s;
}
.pwd-toggle:hover { color: var(--muted); }
.pwd-toggle svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }

/* ── BUTTONS ── */
.btn {
  padding: 9px 18px; border-radius: var(--r-md); font-size: 13px; font-weight: 500;
  cursor: pointer; border: 1px solid var(--border-2); background: var(--surface);
  color: var(--text); transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px;
}
.btn:hover { background: var(--surface-2); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.btn-success { background: var(--success-bg); color: var(--success); border-color: var(--success-border); }
.btn-success:hover { background: var(--success); color: #fff; }
.btn-danger  { background: var(--danger-bg);  color: var(--danger);  border-color: var(--danger-border); }
.btn-danger:hover  { background: var(--danger);  color: #fff; }
.btn-warning { background: var(--warning-bg); color: var(--warning); border-color: var(--warning-border); }
.btn-warning:hover { background: var(--warning); color: #fff; }
.btn-sm { padding: 5px 12px; font-size: 12px; }
.btn-full { width: 100%; justify-content: center; }
.btn.is-loading { position: relative; pointer-events: none; opacity: 0.8; }

/* ── ALERTS ── */
.alert { padding: 10px 14px; border-radius: var(--r-md); font-size: 13px; margin-top: 12px; display: none; border: 1px solid var(--border); background: var(--surface-2); color: var(--muted); }
.alert.show { display: block; }
.alert-success { background: var(--success-bg); color: var(--success); border-color: var(--success-border); }
.alert-error   { background: var(--danger-bg);  color: var(--danger);  border-color: var(--danger-border); }

/* ── SECTION ── */
.section-title { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.section-sub   { font-size: 13px; color: var(--muted); margin-bottom: 20px; line-height: 1.6; }

/* ── MODAL ── */
.modal-bg {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 9999;
  display: none; align-items: center; justify-content: center; padding: 20px;
}
.modal-bg.open { display: flex; }
.modal {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-xl); padding: 28px; width: 100%; max-width: 440px;
  box-shadow: var(--shadow-md); animation: modal-in 0.18s ease both;
}
@keyframes modal-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
.modal-icon {
  width: 44px; height: 44px; border-radius: var(--r-lg); display: flex;
  align-items: center; justify-content: center; margin-bottom: 16px;
}
.modal-icon svg { width: 22px; height: 22px; stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.modal h3 { font-size: 17px; color: var(--text); margin-bottom: 6px; }
.modal p  { font-size: 13px; color: var(--muted); margin-bottom: 16px; line-height: 1.6; }
.modal-detail {
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--r-md); padding: 14px; font-size: 13px; line-height: 1.9; margin-bottom: 4px;
}
.modal-detail strong { color: var(--text); }
.modal-btns { display: flex; gap: 10px; margin-top: 20px; }

/* ── TWO COL ── */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

/* ── PENDING DOT ── */
.pending-dot {
  width: 7px; height: 7px; background: var(--warning); border-radius: 50%;
  display: inline-block; margin-right: 6px; animation: blink 1.4s infinite;
  flex-shrink: 0;
}
@keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.2;} }

/* ── DB AUDIT ── */
.audit-out {
  font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; line-height: 1.7;
  background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-lg);
  padding: 16px; white-space: pre-wrap; word-break: break-word; min-height: 140px;
  color: var(--text-2);
}

/* ── TOAST ── */
.toast-wrap {
  position: fixed; right: 18px; bottom: 18px; z-index: 100000;
  display: flex; flex-direction: column; gap: 10px; max-width: 340px;
}
.toast {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
  box-shadow: var(--shadow-md); padding: 12px 14px; display: flex; gap: 10px;
  align-items: flex-start; animation: toastIn 0.18s ease-out both;
}
@keyframes toastIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
.toast.success { border-left: 3px solid var(--success); }
.toast.error   { border-left: 3px solid var(--danger); }
.toast.warning { border-left: 3px solid var(--warning); }
.toast-body { flex: 1; }
.toast-title { font-size: 13px; font-weight: 600; color: var(--text); }
.toast-msg   { font-size: 12px; color: var(--muted); margin-top: 2px; line-height: 1.4; }
.toast-x { background: transparent; border: none; color: var(--dim); cursor: pointer; font-size: 14px; padding: 2px; }

/* ── LOADING SKELETON ── */
.skeleton {
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
  background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 4px;
}
@keyframes shimmer { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }

@media(max-width: 768px) {
  .stats { grid-template-columns: repeat(2,1fr); }
  .two-col { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .main { padding: 16px; }
}
</style>
Also add this in <head> right after the existing <meta> tags — the Google Font link:
html<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

PART 2 — Replace Login HTML
Find the entire <div id="admin-login"> block and replace it:
html<div id="admin-login">
  <div class="login-wrap">

    <!-- LOGIN FORM -->
    <div class="login-box" id="login-form-box">
      <div class="login-logo">
        <div class="login-logo-mark">
          <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <span class="login-logo-text">BuildBot</span>
        <span class="login-logo-badge">Admin</span>
      </div>
      <h2>Admin Sign In</h2>
      <p>Restricted access. Authorised personnel only.</p>
      <div class="form-group" style="margin-top:20px;">
        <label class="form-label">Email</label>
        <input type="email" id="adm-email" placeholder="admin@buildbot.pk" autocomplete="email"/>
      </div>
      <div class="form-group">
        <label class="form-label" style="display:flex;justify-content:space-between;align-items:center;">
          Password
          <span onclick="toggleForgot()" style="font-size:12px;color:var(--accent);cursor:pointer;text-transform:none;letter-spacing:0;font-weight:500;">Forgot password?</span>
        </label>
        <div class="pwd-wrap">
          <input type="password" id="adm-password" placeholder="Admin password" autocomplete="current-password" style="padding-right:38px;"/>
          <span class="pwd-toggle" onclick="togglePassword('adm-password', this)">
            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
        </div>
      </div>
      <button class="btn btn-primary btn-full" onclick="adminLogin()">Sign in to Admin Panel</button>
      <div class="alert" id="adm-login-alert"></div>
    </div>

    <!-- FORGOT PASSWORD -->
    <div class="login-box" id="forgot-form-box" style="display:none;">
      <div class="login-logo">
        <div class="login-logo-mark">
          <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <span class="login-logo-text">BuildBot</span>
        <span class="login-logo-badge">Admin</span>
      </div>
      <h2>Reset Password</h2>
      <p>Enter your admin email and we'll send a reset link.</p>
      <div class="form-group" style="margin-top:20px;">
        <label class="form-label">Admin Email</label>
        <input type="email" id="forgot-email" placeholder="admin@buildbot.pk" autocomplete="email"/>
      </div>
      <button class="btn btn-primary btn-full" onclick="adminForgotPassword()">Send Reset Link</button>
      <div style="text-align:center;margin-top:16px;">
        <span onclick="toggleForgot()" style="font-size:13px;color:var(--accent);cursor:pointer;font-weight:500;">← Back to sign in</span>
      </div>
      <div class="alert" id="forgot-alert"></div>
    </div>

    <!-- RESET PASSWORD -->
    <div class="login-box" id="reset-form-box" style="display:none;">
      <div class="login-logo">
        <div class="login-logo-mark">
          <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <span class="login-logo-text">BuildBot</span>
        <span class="login-logo-badge">Admin</span>
      </div>
      <h2>Set New Password</h2>
      <p>Enter your new admin password below.</p>
      <div class="form-group" style="margin-top:20px;">
        <label class="form-label">New Password</label>
        <div class="pwd-wrap">
          <input type="password" id="reset-password" placeholder="Min 8 chars, uppercase, number, symbol" style="padding-right:38px;"/>
          <span class="pwd-toggle" onclick="togglePassword('reset-password', this)">
            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
        </div>
      </div>
      <button class="btn btn-primary btn-full" onclick="adminResetPassword()">Update Password</button>
      <div style="text-align:center;margin-top:16px;">
        <a href="admin.html" style="font-size:13px;color:var(--accent);font-weight:500;text-decoration:none;">← Back to sign in</a>
      </div>
      <div class="alert" id="reset-alert"></div>
    </div>

  </div>
</div>

PART 3 — Replace Nav HTML
Find the <nav> block and replace it:
html<nav>
  <div style="display:flex;align-items:center;">
    <div class="nav-logo">
      <div class="nav-logo-mark">
        <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      </div>
      BuildBot Admin
    </div>
    <span class="nav-badge" id="pending-badge" style="display:none;">0 pending</span>
  </div>
  <div class="nav-right">
    <span id="nav-admin-name" style="color:var(--text);font-weight:500;"></span>
    <a onclick="adminLogout()">Sign out</a>
  </div>
</nav>

PART 4 — Replace Sidebar HTML
Find the sidebar div and replace it:
html<div class="sidebar">
  <div class="sb-sep">Platform</div>
  <div class="sb-item active" onclick="showTab('overview')" id="atab-overview">
    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    Overview
  </div>
  <div class="sb-item" onclick="showTab('stores')" id="atab-stores">
    <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    All Stores
  </div>
  <div class="sb-item" onclick="showTab('payments')" id="atab-payments">
    <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    Payments
    <span class="sb-badge" id="sb-pending-count" style="display:none;">0</span>
  </div>
  <div class="sb-item" onclick="showTab('analytics')" id="atab-analytics">
    <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    Platform Stats
  </div>
  <div class="sb-sep">Admin</div>
  <div class="sb-item" onclick="showTab('settings')" id="atab-settings">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    Settings
  </div>
  <div class="sb-item" onclick="showTab('dbhealth')" id="atab-dbhealth">
    <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
    DB Health
  </div>
</div>

PART 5 — Replace Main Content HTML
Replace everything inside <div class="main"> with this. Make sure ALL tab divs are INSIDE .main — this fixes the critical layout bug where settings and dbhealth were outside the layout div:
html<div class="main">

  <!-- OVERVIEW -->
  <div id="tab-overview">
    <div class="section-title">Platform Overview</div>
    <div class="section-sub">Everything happening across BuildBot right now.</div>

    <div class="stats">
      <div class="stat">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
        <div class="stat-val" id="ov-stores">—</div>
        <div class="stat-lbl">Total Stores</div>
      </div>
      <div class="stat">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <div class="stat-val" id="ov-recs">—</div>
        <div class="stat-lbl">Total Recommendations</div>
      </div>
      <div class="stat">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="stat-val" id="ov-revenue">—</div>
        <div class="stat-lbl">Total Revenue (PKR)</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="background:var(--warning-bg);color:var(--warning);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="stat-val" id="ov-pending">—</div>
        <div class="stat-lbl">Pending Payments</div>
      </div>
    </div>

    <div class="card" id="pending-alert-card" style="display:none;border-color:var(--warning);border-left:3px solid var(--warning);">
      <div class="card-head">
        <div>
          <h2 style="display:flex;align-items:center;gap:6px;"><span class="pending-dot"></span>Payments Awaiting Approval</h2>
          <div class="card-sub">Action required — review and approve or reject below</div>
        </div>
        <button class="btn btn-warning btn-sm" onclick="showTab('payments')">Review all</button>
      </div>
      <table>
        <thead><tr><th>Store</th><th>Plan</th><th>Amount</th><th>Method</th><th>Ref</th><th>Action</th></tr></thead>
        <tbody id="ov-pending-table"></tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-head">
        <div><h2>Recently Joined Stores</h2><div class="card-sub">Newest store registrations</div></div>
      </div>
      <table>
        <thead><tr><th>Store</th><th>Email</th><th>Plan</th><th>Joined</th><th>Action</th></tr></thead>
        <tbody id="ov-stores-table"></tbody>
      </table>
    </div>
  </div>

  <!-- STORES -->
  <div id="tab-stores" style="display:none;">
    <div class="section-title">All Stores</div>
    <div class="section-sub">Every store registered on BuildBot.</div>
    <div class="card">
      <div class="card-head">
        <div><h2>Stores</h2><div class="card-sub" id="stores-count-sub">Loading…</div></div>
        <input type="text" id="store-search" placeholder="Search by name or email…"
          style="width:220px;" oninput="filterStores()"/>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr><th>Store</th><th>Email</th><th>Plan</th><th>Status</th><th>Products</th><th>Recs</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody id="stores-table"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- PAYMENTS -->
  <div id="tab-payments" style="display:none;">
    <div class="section-title">Payment Management</div>
    <div class="section-sub">Approve or reject JazzCash and EasyPaisa payment submissions.</div>

    <div class="card" id="pending-payments-card" style="border-left:3px solid var(--warning);">
      <div class="card-head">
        <div><h2 style="display:flex;align-items:center;gap:6px;"><span class="pending-dot"></span>Pending Payments</h2></div>
      </div>
      <table>
        <thead><tr><th>Store</th><th>Email</th><th>Plan</th><th>Amount</th><th>Method</th><th>Ref ID</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody id="pending-table"></tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-head"><div><h2>Payment History</h2><div class="card-sub">All approved and rejected payments</div></div></div>
      <table>
        <thead><tr><th>Store</th><th>Plan</th><th>Amount</th><th>Method</th><th>Ref</th><th>Status</th><th>Date</th></tr></thead>
        <tbody id="all-payments-table"></tbody>
      </table>
    </div>
  </div>

  <!-- ANALYTICS -->
  <div id="tab-analytics" style="display:none;">
    <div class="section-title">Platform Analytics</div>
    <div class="section-sub">Overall performance across all BuildBot stores.</div>
    <div class="stats">
      <div class="stat">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>
        <div class="stat-val" id="an-stores">—</div>
        <div class="stat-lbl">Active Stores</div>
      </div>
      <div class="stat">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="stat-val" id="an-trial">—</div>
        <div class="stat-lbl">On Trial</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="background:var(--success-bg);color:var(--success);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
        <div class="stat-val" id="an-paid">—</div>
        <div class="stat-lbl">Paid Stores</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="background:var(--success-bg);color:var(--success);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="stat-val" id="an-rev">—</div>
        <div class="stat-lbl">Total Revenue</div>
      </div>
    </div>
    <div class="two-col">
      <div class="card">
        <div class="card-head"><div><h2>Top Stores</h2><div class="card-sub">By recommendation count</div></div></div>
        <table>
          <thead><tr><th>Store</th><th>Recommendations</th><th>Plan</th></tr></thead>
          <tbody id="top-stores-table"></tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Plan Distribution</h2></div></div>
        <div id="plan-dist" style="margin-top:4px;"></div>
      </div>
    </div>
  </div>

  <!-- SETTINGS -->
  <div id="tab-settings" style="display:none;">
    <div class="section-title">Admin Settings</div>
    <div class="section-sub">Manage your admin profile and password.</div>
    <div class="two-col">
      <div class="card">
        <div class="card-head"><div><h2>Profile</h2></div></div>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" id="prof-name" placeholder="Your name"/>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="prof-email" placeholder="admin@buildbot.pk"/>
        </div>
        <button class="btn btn-primary" onclick="saveAdminProfile()">Save Profile</button>
        <div class="alert" id="prof-alert"></div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>Change Password</h2></div></div>
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <div class="pwd-wrap">
            <input type="password" id="cp-current" placeholder="Current password" style="padding-right:38px;"/>
            <span class="pwd-toggle" onclick="togglePassword('cp-current', this)">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <div class="pwd-wrap">
            <input type="password" id="cp-new" placeholder="Min 8 chars" style="padding-right:38px;"/>
            <span class="pwd-toggle" onclick="togglePassword('cp-new', this)">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
          </div>
        </div>
        <button class="btn btn-primary" onclick="saveAdminPassword()">Change Password</button>
        <div class="alert" id="cp-alert"></div>
      </div>
    </div>
  </div>

  <!-- DB HEALTH -->
  <div id="tab-dbhealth" style="display:none;">
    <div class="section-title">Database Health</div>
    <div class="section-sub">Integrity audit for Turso tables — orphaned rows, expired tokens, table totals.</div>
    <div class="card">
      <div class="card-head">
        <div><h2>Integrity Audit</h2><div class="card-sub" id="db-audit-meta">Click "Run audit" to generate report</div></div>
        <button class="btn btn-primary btn-sm" onclick="runDbAudit()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Run Audit
        </button>
      </div>
      <div class="audit-out" id="db-audit-out">Click "Run Audit" to generate a report.</div>
    </div>
  </div>

</div><!-- end .main -->

PART 6 — Replace Modals HTML
Replace all three modal divs (approve, disable, delete) with:
html<!-- APPROVE MODAL -->
<div class="modal-bg" id="approve-modal">
  <div class="modal">
    <div class="modal-icon" style="background:var(--success-bg);color:var(--success);">
      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h3>Approve Payment</h3>
    <p>This will immediately activate the store's selected plan and send them a confirmation email.</p>
    <div class="modal-detail" id="approve-details"></div>
    <div class="modal-btns">
      <button class="btn btn-success" onclick="confirmApprove()">Approve & Activate</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>
  </div>
</div>

<!-- DISABLE MODAL -->
<div class="modal-bg" id="disable-modal">
  <div class="modal">
    <div class="modal-icon" style="background:var(--warning-bg);color:var(--warning);">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
    </div>
    <h3>Disable Store</h3>
    <p>This will deactivate the store's widget. Their customers will see an error. You can re-enable at any time.</p>
    <div class="modal-detail" id="disable-details"></div>
    <div class="modal-btns">
      <button class="btn btn-warning" onclick="confirmDisable()">Disable Store</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>
  </div>
</div>

<!-- DELETE MODAL -->
<div class="modal-bg" id="delete-modal">
  <div class="modal">
    <div class="modal-icon" style="background:var(--danger-bg);color:var(--danger);">
      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
    </div>
    <h3>Delete Store Permanently</h3>
    <p>This will permanently delete the store and ALL their products, payments, recommendations and data. This cannot be undone.</p>
    <div class="modal-detail" id="delete-details"></div>
    <div class="modal-btns">
      <button class="btn btn-danger" onclick="confirmDelete()">Delete Permanently</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>
  </div>
</div>

<!-- TOAST CONTAINER -->
<div class="toast-wrap" id="toast-wrap"></div>

PART 7 — Fix and Replace JavaScript
In the <script> block, make these specific changes:
7a. Replace togglePassword function — remove emoji, use SVG:
jsfunction togglePassword(inputId, iconEl) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  iconEl.innerHTML = isHidden
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
7b. Add showToast function — replace showAlert as primary notification method for actions:
jsfunction showToast(title, msg, type = 'success') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const id = 'toast-' + Date.now();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.id = id;
  el.innerHTML = `<div class="toast-body"><div class="toast-title">${title}</div>${msg ? `<div class="toast-msg">${msg}</div>` : ''}</div><button class="toast-x" onclick="document.getElementById('${id}').remove()">✕</button>`;
  wrap.appendChild(el);
  setTimeout(() => { const t = document.getElementById(id); if (t) t.remove(); }, 4000);
}
7c. Fix rejectPayment — add missing storeId and plan parameters:
Replace the existing rejectPayment function with:
jsasync function rejectPayment(id, storeId, plan) {
  await fetch(`${API}/admin/reject-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ id, storeId, plan })
  });
  showToast('Payment rejected', 'The store has been notified.', 'warning');
  loadPayments();
}
7d. Add missing openDelete and confirmDelete functions:
jsfunction openDelete(storeId, name) {
  pendingAction = { storeId };
  const decodedName = decodeURIComponent(name || '');
  document.getElementById('delete-details').innerHTML =
    `<strong>Store:</strong> ${safeText(decodedName)}<br><strong>Store ID:</strong> ${safeText(storeId)}`;
  document.getElementById('delete-modal').classList.add('open');
}

async function confirmDelete() {
  if (!pendingAction) return;
  try {
    const res = await fetch(`${API}/admin/delete-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: pendingAction.storeId })
    });
    const data = await res.json();
    closeModal();
    if (data.success) {
      showToast('Store deleted', 'All store data has been permanently removed.', 'success');
      loadStores();
      loadOverview();
    } else {
      showToast('Delete failed', data.error || 'Something went wrong.', 'error');
    }
  } catch {
    showToast('Error', 'Could not connect to server.', 'error');
  }
}
7e. Fix filterStores — make search case-insensitive:
Find filterStores and change the filter condition to:
jsconst q = document.getElementById('store-search').value.toLowerCase();
const filtered = allStoresData.filter(s =>
  (s.name || '').toLowerCase().includes(q) ||
  (s.email || '').toLowerCase().includes(q)
);
7f. Update loadStores table render — remove Store ID column (too wide), add delete button, pass storeId and plan to rejectPayment in payments table, update stores count subtitle:
In the loadStores function, after allStoresData = stores, add:
jsconst sub = document.getElementById('stores-count-sub');
if (sub) sub.textContent = `${stores.length} store${stores.length !== 1 ? 's' : ''} registered`;
In the stores table row HTML, change the actions column buttons so delete calls openDelete:
js// Change the delete button in the stores table from:
onclick="openDelete(..."
// to ensure it passes name encoded:
onclick="openDelete('${safeText(s.store_id)}', '${encodeURIComponent(s.name || '')}')"
7g. Update pending payments table render — pass storeId and plan to rejectPayment:
In loadPayments, in the pending table row HTML, find the reject button and change:
jsonclick="rejectPayment(${p.id})"
// to:
onclick="rejectPayment(${p.id}, '${safeText(p.store_id)}', '${safeText(p.plan)}')"
7h. Update enterAdmin to show admin name in nav:
After the existing enterAdmin function body, add a fetch to populate the name:
jsfunction enterAdmin() {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-app').style.display = 'block';
  loadOverview();
  // Show admin name in nav
  fetch(`${API}/admin/me`, { headers: { 'Authorization': `Bearer ${adminToken}` } })
    .then(r => r.json())
    .then(d => {
      if (d.success && d.admin) {
        const el = document.getElementById('nav-admin-name');
        if (el) el.textContent = d.admin.name;
      }
    }).catch(() => {});
}
7i. Update loadOverview to update pending badge and sidebar count:
Inside loadOverview, after getting pending count, add:
jsconst pendingCount = pending || 0;
const badge = document.getElementById('pending-badge');
const sbCount = document.getElementById('sb-pending-count');
if (badge) {
  badge.textContent = `${pendingCount} pending`;
  badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
}
if (sbCount) {
  sbCount.textContent = pendingCount;
  sbCount.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
}
7j. Update confirmApprove to use toast:
After closeModal() in confirmApprove, add:
jsshowToast('Payment approved', 'Store plan activated and email sent.', 'success');
7k. Update confirmDisable to use toast:
After closeModal() in confirmDisable, add:
jsshowToast('Store disabled', 'The store widget has been deactivated.', 'warning');

PART 8 — Add Empty States to Tables
In the loadStores function, change the empty tbody fallback from nothing to:
js`<tr><td colspan="8" class="table-empty">No stores registered yet.</td></tr>`
In loadPayments pending table, change empty to:
js`<tr><td colspan="8" class="table-empty">No pending payments.</td></tr>`
In loadPayments all-payments table, change empty to:
js`<tr><td colspan="7" class="table-empty">No payment history yet.</td></tr>`

Do NOT Change

All function names: adminLogin, adminLogout, adminForgotPassword, adminResetPassword, toggleForgot, showTab, loadOverview, loadStores, loadPayments, loadPlatformAnalytics, loadAdminSettings, saveAdminProfile, saveAdminPassword, openApprove, confirmApprove, openDisable, confirmDisable, activateStore, closeModal, runDbAudit, planBadge, safeText, showAlert, filterStores, handleAdminAuthError
All element IDs used by existing JS
All API endpoint URLs
config.js script tag
Any fetch call logic — only add parameters where specified, never remove or change endpoint URLs
