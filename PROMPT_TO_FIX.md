Files to edit: dashboard/index.html AND dashboard/dashboard.html
Do not touch: any server files, CSS, HTML structure, or any function not explicitly mentioned below.

FILE 1 — dashboard/index.html

Change 1 — Fix the catch block in window.onload
Find this exact block inside window.onload:
 catch {
  // Server unreachable — show landing (or login if dashboard-only entry)
  showPage(FORCE_DASHBOARD ? 'login' : 'landing');
}
Replace it with:
 catch {
  // Server unreachable (Railway cold start).
  // If local session looks valid, trust it and redirect to dashboard.
  // Dashboard handles its own token verification independently.
  if (token && currentStore && !isSessionExpired()) {
    window.location.href = 'dashboard.html';
  } else {
    showPage(FORCE_DASHBOARD ? 'login' : 'landing');
  }
}

Change 2 — Fix Google auth: replace missing enterApp() call with redirect
Find inside handleGoogleCredentialResponse in index.html:
jssetTimeout(() => enterApp(), 1000);
Replace with:
jssetTimeout(() => { window.location.href = 'dashboard.html'; }, 800);

Change 3 — Show dashboard link and hide login/signup from nav immediately
Find the nav HTML — these two elements:
html<div class="nav-link" onclick="showPage('login')">Login</div>
<div class="nav-link btn-primary btn" onclick="showPage('signup')">Start Free Trial</div>
Add IDs to both — change to:
html<div class="nav-link" id="nav-login-link" onclick="showPage('login')">Login</div>
<div class="nav-link btn-primary btn" id="nav-signup-link" onclick="showPage('signup')">Start Free Trial</div>
Then find this block inside window.onload:
js// Show dashboard link immediately from localStorage, before any async call
const dashLink = document.getElementById('nav-dashboard-link');
if (dashLink && token && currentStore) dashLink.style.display = 'inline-flex';
Replace it with:
js// Show/hide nav links immediately from localStorage — no server call needed
const dashLink = document.getElementById('nav-dashboard-link');
const loginLink = document.getElementById('nav-login-link');
const signupLink = document.getElementById('nav-signup-link');
if (token && currentStore && !isSessionExpired()) {
  if (dashLink) dashLink.style.display = 'inline-flex';
  if (loginLink) loginLink.style.display = 'none';
  if (signupLink) signupLink.style.display = 'none';
}

FILE 2 — dashboard/dashboard.html

Change 4 — Fix the catch block in dashboard window.onload — this is the main bug
Find this exact block inside window.onload in dashboard.html:
 catch {
  localStorage.removeItem('bb_token');
  localStorage.removeItem('bb_store');
  window.location.href = 'index.html';
}
Replace it with:
 catch {
  // Server unreachable (Railway cold start or network issue).
  // Do NOT clear the session — the token is likely still valid.
  // Just enter the app using the locally stored session.
  // The next successful API call will confirm the token is valid.
  enterApp();
}

Change 5 — Fix the token expiry check at the top of dashboard.html script
Find these lines near the very top of the <script> block in dashboard.html:
jsconst token = localStorage.getItem('bb_token');
const tokenExpires = localStorage.getItem('bb_token_expires');
const isExpired = tokenExpires && Date.now() > Number(tokenExpires);
let currentStore = JSON.parse(localStorage.getItem('bb_store') || 'null');

if (!token || isExpired) {
  localStorage.removeItem('bb_token');
  localStorage.removeItem('bb_store');
  localStorage.removeItem('bb_token_expires');
  window.location.href = 'index.html';
}
Replace with:
jsconst token = localStorage.getItem('bb_token');
const tokenExpires = localStorage.getItem('bb_token_expires');
const isExpired = tokenExpires ? Date.now() > Number(tokenExpires) : false;
let currentStore = (() => {
  try { return JSON.parse(localStorage.getItem('bb_store') || 'null'); }
  catch { return null; }
})();

if (!token || !currentStore || isExpired) {
  localStorage.removeItem('bb_token');
  localStorage.removeItem('bb_store');
  localStorage.removeItem('bb_token_expires');
  window.location.href = 'index.html';
}
The key change: isExpired now returns false when there is no expiry timestamp (old sessions), instead of potentially mishandling it. Also added !currentStore as a guard and a safe JSON parse.

Change 6 — Fix logout in dashboard to also clear bb_token_expires
In dashboard.html, find the logout function. It will look something like:
jsfunction doLogout() {
  localStorage.removeItem('bb_token');
  localStorage.removeItem('bb_store');
  window.location.href = 'index.html';
}
Add the expires removal:
jsfunction doLogout() {
  localStorage.removeItem('bb_token');
  localStorage.removeItem('bb_store');
  localStorage.removeItem('bb_token_expires');
  window.location.href = 'index.html';
}
If logout is triggered differently (e.g. a button that directly removes items without a named function), find all places in dashboard.html where bb_token and bb_store are removed together and add localStorage.removeItem('bb_token_expires') alongside them. The deleteAccount function at line 3711 already does this partially — check it and add the expires removal there too if missing.

Change 7 — Fix bb_token_expires not being set when dashboard.html refreshes the session
In dashboard.html, the window.onload verify block calls enterApp() on success but never refreshes the expiry. Find inside window.onload:
jsif (data.success) {
  enterApp();
}
Replace with:
jsif (data.success) {
  // Refresh the 3-day expiry timestamp on every successful server verification
  localStorage.setItem('bb_token_expires', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
  enterApp();
}
This means every time the user opens the dashboard and the server confirms their token, the 3-day clock resets. Active users stay logged in. Only truly inactive users (gone for 3+ days) get logged out.

Do not change anything else. No CSS, no HTML structure, no other functions, no server files.