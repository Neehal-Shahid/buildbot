Files to edit: dashboard/index.html and server/email.js only. Make exactly these changes. Nothing else.

Fix 1 — Remove the call to updateLastActivity which doesn't exist
In index.html, inside window.onload, find and delete this single line:
jsupdateLastActivity();
It appears right after if (isSessionExpired()) { block. Remove only that line. Do not change anything else in window.onload.

Fix 2 — Show dashboard link immediately from localStorage, before any async call
In index.html, inside window.onload, find this block:
jsif (token && currentStore) {
  // Check session expiry first
  if (isSessionExpired()) {
    clearSession();
    showPage(FORCE_DASHBOARD ? 'login' : 'landing');
    return;
  }

  // Show dashboard link immediately if token exists in storage
  const dashLink = document.getElementById('nav-dashboard-link');
  if (dashLink && token && currentStore) dashLink.style.display = 'inline-flex';
Move the dashboard link lines to run before the if (token && currentStore) check, so they run synchronously at page load without waiting for any async result:
js// Show dashboard link immediately — synchronous, no server round trip needed
const dashLink = document.getElementById('nav-dashboard-link');
if (dashLink && token && currentStore && !isSessionExpired()) {
  dashLink.style.display = 'inline-flex';
}

if (token && currentStore) {
  // Check session expiry first
  if (isSessionExpired()) {
    clearSession();
    showPage(FORCE_DASHBOARD ? 'login' : 'landing');
    return;
  }
Remove the original dashboard link lines from inside the if (token && currentStore) block.

Fix 3 — Handle Railway cold start gracefully: don't hide dashboard on server error
In index.html, inside window.onload, find the catch block of the /me fetch:
js} catch {
  // Server unreachable — show landing (or login if dashboard-only entry)
  showPage(FORCE_DASHBOARD ? 'login' : 'landing');
}
Replace it with:
js} catch {
  // Server unreachable (cold start etc) — if we have a valid local session, go to dashboard anyway
  // The dashboard itself will validate the token and kick the user out if truly invalid
  if (token && currentStore && !isSessionExpired()) {
    window.location.href = 'dashboard.html';
  } else {
    showPage(FORCE_DASHBOARD ? 'login' : 'landing');
  }
}

Fix 4 — Update email hrefs to go directly to dashboard.html
In server/email.js, find every href="${APP_URL}" that is used as a "Go to Dashboard", "Open Dashboard", "Upgrade Now", or "Resubmit Payment" button. These appear in welcomeEmail, paymentApprovedEmail, paymentRejectedEmail, and trialEndingEmail.
Change every one of these from:
jshref="${APP_URL}"
to:
jshref="${APP_URL}/dashboard.html"
Do NOT change:

href="${APP_URL}/verify.html?token=${token}" in emailVerificationEmail
href="${APP_URL}/reset-password.html?token=${token}" in passwordResetEmail
href="${APP_URL}/admin.html?reset_token=${token}" in adminPasswordResetEmail

Only change the four plain ${APP_URL} hrefs that point to the root.

Fix 5 — Make the "Login" and "Start Free Trial" nav links disappear when user is already logged in
In index.html, the nav has Login and Start Free Trial links that show even to logged-in users, which is confusing. Find the nav HTML:
html<div class="nav-link" onclick="showPage('login')">Login</div>
<div class="nav-link btn-primary btn" onclick="showPage('signup')">Start Free Trial</div>
Add IDs to both:
html<div class="nav-link" id="nav-login-link" onclick="showPage('login')">Login</div>
<div class="nav-link btn-primary btn" id="nav-signup-link" onclick="showPage('signup')">Start Free Trial</div>
Then in the synchronous dashboard link block you added in Fix 2, also add:
jsif (dashLink && token && currentStore && !isSessionExpired()) {
  dashLink.style.display = 'inline-flex';
  // Hide login/signup links for already-logged-in users
  const loginLink = document.getElementById('nav-login-link');
  const signupLink = document.getElementById('nav-signup-link');
  if (loginLink) loginLink.style.display = 'none';
  if (signupLink) signupLink.style.display = 'none';
}

Do not change anything else. No CSS, no other functions, no other HTML, no other files.