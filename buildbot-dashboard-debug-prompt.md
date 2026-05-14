# BuildBot Store Owner Dashboard — Debug & Refactor Prompt
# For use in Zed IDE (paste as a single task prompt)

---

You are working on **BuildBot** — a SaaS platform for Pakistani e-commerce stores that serves AI-powered PC build recommendations via a floating widget. You have two files open:

- `dashboard/dashboard.html` — the single-page store owner dashboard (4070 lines, vanilla JS, no framework)
- `server/routes/plugin.js` — Express.js route file for WooCommerce plugin communication

Your job is to **fix all bugs and UX issues** listed below. You must:
- Make **only surgical, targeted changes** — do not rewrite, restructure, or rename anything that is not explicitly listed
- **Preserve every existing function name, ID, class name, API endpoint, and event handler** unless the fix explicitly requires renaming one specific thing
- **Do not add new dependencies** — vanilla JS only on the frontend, existing Node.js packages only on the backend
- After every change, verify nothing else in the file references the thing you changed

Below is the **complete, ordered list of bugs and fixes**, from critical to UX. Work through them in order.

---

## CONTEXT: HOW THE APP WORKS

**Auth flow:** On page load, `window.onload` reads `bb_token` and `bb_store` from `localStorage`. It calls `GET /api/me` to verify the session. If valid, it calls `enterApp()` which calls `GET /api/me` again to hydrate `currentStore`. Both calls happen on every load.

**Store modes:** The store owner chooses between two catalog modes — `custom` (manual CSV/product entry) and `woo` (WooCommerce sync). This choice is stored in `localStorage` key `bb_store_mode`. The server independently tracks `woo_connected` in the `stores` DB table. These two sources of truth can fall out of sync — that is a core bug.

**Tab system:** `showTab(name)` hides all `[id^="tab-content-"]` divs, shows `tab-content-{name}`, and adds `.active` to `#tab-{name}` in the sidebar. Tabs: `home`, `store`, `products`, `analytics`, `billing`, `settings`, `account`, `embed`, `help`.

**WooCommerce flow:** The WordPress plugin authenticates via `X-BuildBot-Store-ID` + `X-BuildBot-Secret` headers. Dashboard authenticates via JWT Bearer token. They are different auth mechanisms handled in separate route sections of `plugin.js`.

**Key variables:**
- `const API = window.BB_API` — set by `config.js`
- `const token` — JWT from localStorage (THIS IS A BUG — see Fix #3)
- `let currentStore` — object with `{ storeId, name, email, plan, planStatus, trialEnds, brandColor, currency }`
- `let pluginSecretKey` — WooCommerce secret, loaded by `loadWooStatus()`
- `let allProducts` — array populated by `loadProducts()`
- `let selectedPlan` — billing plan selection, default `'starter'`

---

## FIX #1 — CRITICAL: `disconnectWoo()` does not actually disable the widget on WordPress

**File:** `dashboard.html`
**Function:** `disconnectWoo()` (around line 3641)
**Problem:** After calling `POST /api/plugin/disconnect` and getting `{ success: true }`, the function only calls `loadWooStatus()` to refresh the UI. It does NOT:
1. Reset `localStorage.setItem('bb_store_mode', 'custom')`
2. Call `applyStoreModeLayout('custom')`
3. Call `switchProductView('custom')`
4. Update the catalog source button highlight in the Store & sync tab

So after disconnect, the server knows WooCommerce is off, but the dashboard UI still shows WooCommerce mode. On next page load `loadWooStatus()` will correctly show `woo_connected=false`, but during the current session the UI stays wrong.

**Fix — inside `disconnectWoo()`, after the `toast.success(...)` line and before `await loadWooStatus()`:**

Add these four lines:
```js
localStorage.setItem('bb_store_mode', 'custom');
applyStoreModeLayout('custom');
switchProductView('custom');
setStoreModePermanent.__skipToast = true; // sentinel so the next call is silent
```

Then replace `await loadWooStatus()` with:
```js
await loadWooStatus();
updateOnboardingJourney();
```

Do NOT change the `uiConfirm` call, the fetch call, or the error handling.

**File:** `server/routes/plugin.js`
**Problem:** The `POST /plugin/disconnect` route (which already exists and is correct) sets `woo_connected = 0` in the DB but does NOT also set `widget_enabled = 0`. This means the WordPress plugin's next call to `GET /plugin/widget-config/:storeId` still returns `widgetEnabled: true`, so the widget keeps showing on the WordPress site.

**Fix — in the existing `POST /plugin/disconnect` route**, change the SQL from:
```sql
UPDATE stores
SET woo_connected = 0, woo_url = '', woo_last_sync = '', woo_product_count = 0
WHERE store_id = ?
```
To:
```sql
UPDATE stores
SET woo_connected = 0, woo_url = '', woo_last_sync = '', woo_product_count = 0, widget_enabled = 0
WHERE store_id = ?
```

Do not change anything else in this route.

---

## FIX #2 — CRITICAL: Switching from WooCommerce to Manual mode reverts on page refresh

**File:** `dashboard.html`
**Function:** `setStoreModePermanent(mode)` (around line 3878)
**Problem:** When a user clicks "My Products (Manual / CSV)" while WooCommerce is connected (`woo_connected=1` in DB), the function only saves to `localStorage`. On next page load, `loadWooStatus()` runs, sees `woo_connected=1` from the server, and overwrites localStorage back to `'woo'`. The user's switch is silently lost.

**Fix — at the top of `setStoreModePermanent(mode)`**, before the existing `localStorage.setItem` line, add this guard:

```js
// If switching away from woo while woo is still connected on server, warn the user
if (mode === 'custom') {
  const statusRes = await fetch(`${API}/plugin/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const statusData = await statusRes.json();
  if (statusData.success && statusData.wooConnected) {
    const ok = await uiConfirm({
      title: 'WooCommerce is still connected',
      desc: 'Switching to Manual mode will disconnect WooCommerce and disable the widget on your WordPress site. Your synced products will remain in BuildBot.',
      okText: 'Disconnect & Switch',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;
    // Disconnect on server first
    await fetch(`${API}/plugin/disconnect`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
}
```

Because you added `async` logic, change the function signature from:
```js
function setStoreModePermanent(mode) {
```
To:
```js
async function setStoreModePermanent(mode) {
```

Keep everything else in the function exactly as-is. Do not remove the existing `toast.success(...)` call at the bottom of the function unless `setStoreModePermanent.__skipToast` is set (from Fix #1 — check for it and clear it):

After the existing `toast.success(...)` line, add:
```js
if (setStoreModePermanent.__skipToast) {
  delete setStoreModePermanent.__skipToast;
}
```

---

## FIX #3 — CRITICAL: `token` declared as `const` but reassigned in three functions

**File:** `dashboard.html`
**Location:** Around line 2277 — the very first line of the `<script>` block inside `<body>`

**Current code:**
```js
const token = localStorage.getItem('bb_token');
```

**Fix:** Change only this one word `const` to `let`:
```js
let token = localStorage.getItem('bb_token');
```

**Why:** `doLogin()`, `doSignup()`, and `handleGoogleCredentialResponse()` all do `token = data.token` which is a const reassignment — this silently fails in strict contexts and causes stale token bugs after login. No other change needed; `token` is already used correctly throughout.

---

## FIX #4 — HIGH: Analytics range buttons (7d / 30d / all) change the label but not the data

**File:** `dashboard.html`
**Function:** `setAnalyticsRange(days, btn)` (around line 3809) and `loadAnalytics()` (around line 2776)

**Problem:** `setAnalyticsRange` calls `loadAnalytics()` but `loadAnalytics()` always fetches `GET /api/analytics` with no query parameters — the `days` value is never passed to the server.

**Fix step 1 — add a module-level variable** near the top of the script block (right after `let selectedPlan = 'starter'`):
```js
let currentAnalyticsDays = 7;
```

**Fix step 2 — update `setAnalyticsRange`:**
Change:
```js
function setAnalyticsRange(days, btn) {
  document.querySelectorAll('.analytics-range-btn').forEach(b => b.classList.remove('range-btn-active'));
  if (btn) btn.classList.add('range-btn-active');
  var lbl = document.getElementById('analytics-range-label');
  if (lbl) lbl.textContent = days === 0 ? 'Showing: all time' : 'Showing: last ' + days + ' days';
  loadAnalytics();
}
```
To:
```js
function setAnalyticsRange(days, btn) {
  currentAnalyticsDays = days;
  document.querySelectorAll('.analytics-range-btn').forEach(b => b.classList.remove('range-btn-active'));
  if (btn) btn.classList.add('range-btn-active');
  var lbl = document.getElementById('analytics-range-label');
  if (lbl) lbl.textContent = days === 0 ? 'Showing: all time' : 'Showing: last ' + days + ' days';
  loadAnalytics();
}
```

**Fix step 3 — update the fetch inside `loadAnalytics()`:**
Find the line inside `loadAnalytics()`:
```js
const res = await fetch(`${API}/analytics`, {
```
Replace with:
```js
const queryParam = currentAnalyticsDays > 0 ? `?days=${currentAnalyticsDays}` : '';
const res = await fetch(`${API}/analytics${queryParam}`, {
```

Do not change any other part of `loadAnalytics()`.

---

## FIX #5 — HIGH: Plugin download flow is broken when no key exists yet

**File:** `dashboard.html`
**Function:** `downloadPlugin()` (around line 3664)

**Problem:** When `pluginSecretKey` is empty, the function calls `generatePluginKey()` and then immediately `return`s — so the user never gets the download. They only see the key generated with no explanation.

**Fix:** Replace the entire `downloadPlugin()` function body with:
```js
async function downloadPlugin() {
  if (!pluginSecretKey) {
    const btn = document.getElementById('generate-key-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Generating...';
    }
    try {
      const res = await fetch(`${API}/plugin/generate-key`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        pluginSecretKey = data.secret;
        document.getElementById('plugin-secret-display').textContent = data.secret;
        document.getElementById('copy-key-btn').style.display = 'inline-block';
        if (btn) btn.textContent = 'Regenerate';
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  // Now download regardless of whether key was just generated or already existed
  window.open(
    'https://buildbot-production.up.railway.app/buildbot-woocommerce.zip',
    '_blank'
  );
}
```

Also change the function signature from `function downloadPlugin()` to `async function downloadPlugin()` — this is already done in the replacement above. The existing `generatePluginKey()` function is left completely untouched.

---

## FIX #6 — HIGH: Double `/api/me` call on every page load (performance bug)

**File:** `dashboard.html`
**Location:** `window.onload` (around line 2377) and `enterApp()` (around line 2619)

**Problem:** `window.onload` calls `GET /api/me` to verify the session (line ~2394), then calls `enterApp()` which calls `GET /api/me` again (line ~2626) to hydrate `currentStore`. Two identical authenticated calls happen every time the page loads.

**Fix — in `window.onload`**, find this block:
```js
try {
  const res = await fetch(`${API}/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.success) {
    // Refresh 3-day expiry timestamp on every successful server verification
    localStorage.setItem('bb_token_expires', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    enterApp();
  } else {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_store');
    window.location.href = 'index.html';
  }
} catch {
  // Server unreachable (Railway cold start or network issue).
  // Do NOT clear the session — the token is likely still valid.
  // Just enter the app using the locally stored session.
  // The next successful API call will confirm the token is valid.
  enterApp();
}
```

Replace with:
```js
try {
  const res = await fetch(`${API}/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem('bb_token_expires', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    enterApp(data); // pass pre-fetched data to avoid second /api/me call
  } else {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_store');
    window.location.href = 'index.html';
  }
} catch {
  enterApp(null); // null = server unreachable, use cached store
}
```

**Fix — in `enterApp()`**, change the function signature from:
```js
async function enterApp() {
```
To:
```js
async function enterApp(prefetchedData) {
```

Then find the existing internal `fetch` for `/api/me`:
```js
try {
  const res = await fetch(`${API}/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (!data.success || !data.store) {
    throw new Error(data.error || 'Session invalid');
  }
```

Replace with:
```js
try {
  let data = prefetchedData;
  if (!data) {
    const res = await fetch(`${API}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await res.json();
  }
  if (!data.success || !data.store) {
    throw new Error(data.error || 'Session invalid');
  }
```

Everything else inside `enterApp()` stays exactly the same.

---

## FIX #7 — HIGH: `updateSidebarStoreModeUI` is an empty stub — sidebar never reflects mode

**File:** `dashboard.html`
**Location:** Around line 3876

**Current code:**
```js
function updateSidebarStoreModeUI() {}
```

**Fix:** Replace with a real implementation that visually marks the active mode on the Store & sync tab's source buttons. The two buttons have IDs `store-mode-custom-btn` and `store-mode-woo-btn`:

```js
function updateSidebarStoreModeUI(mode) {
  var customBtn = document.getElementById('store-mode-custom-btn');
  var wooBtn = document.getElementById('store-mode-woo-btn');
  if (!customBtn || !wooBtn) return;
  if (mode === 'woo') {
    wooBtn.style.background = 'var(--accent-bg)';
    wooBtn.style.color = 'var(--accent-text)';
    wooBtn.style.borderColor = 'rgba(79,70,229,0.4)';
    customBtn.style.background = '';
    customBtn.style.color = '';
    customBtn.style.borderColor = '';
  } else {
    customBtn.style.background = 'var(--accent-bg)';
    customBtn.style.color = 'var(--accent-text)';
    customBtn.style.borderColor = 'rgba(79,70,229,0.4)';
    wooBtn.style.background = '';
    wooBtn.style.color = '';
    wooBtn.style.borderColor = '';
  }
}
```

Do not change any of the many call sites — they already pass the correct `mode` argument.

---

## FIX #8 — HIGH: First-time users land on empty Overview — catalog mode choice is buried

**File:** `dashboard.html`
**Function:** `enterApp()` — near the end of the function, right before the closing `} catch` block

**Problem:** New store owners who just signed up land on the Overview tab (`showTab('home')`) which shows zero stats and no clear call to action. The catalog source choice (Manual vs WooCommerce) is hidden in "Store & sync" in the sidebar.

**Fix:** After the existing `showTab('home')` call inside `enterApp()`, add this redirect logic:

```js
// First-time onboarding: if no mode has been explicitly set and no products exist, go to Store & sync
const isFirstTime = !localStorage.getItem('bb_store_mode_confirmed');
const hasProducts = currentStore && Number(document.getElementById('stat-products')?.textContent || 0) > 0;
if (isFirstTime && !hasProducts) {
  localStorage.setItem('bb_store_mode_confirmed', '1');
  setTimeout(() => showTab('store'), 350); // slight delay so the app finishes rendering
}
```

This only fires once per browser session (the key `bb_store_mode_confirmed` is set immediately). After that, the user always lands on Overview. If they clear localStorage, they see onboarding again — which is acceptable.

---

## FIX #9 — HIGH: `switchSettingsTab` defined as empty stub

**File:** `dashboard.html`
**Location:** Around line 3807

**Current code:**
```js
function switchSettingsTab(name) {}
```

**Fix:** Since there are no sub-tabs in the settings section and nothing in the HTML calls this function with meaningful intent, remove the function entirely. Search the entire file for any `onclick` or direct JS call to `switchSettingsTab(` — if none are found, delete the function. If any calls exist, replace their handlers to call `showTab()` instead. Do not leave an empty function stub.

---

## FIX #10 — MEDIUM: Duplicate logout button — remove from Account tab

**File:** `dashboard.html`
**Location:** Inside `<div id="tab-content-account">` — the Account tab HTML

**Problem:** There is a "Logout" button in the top navigation bar (`<button class="btn btn-sm" onclick="doLogout()">Logout</button>`) AND another logout-triggering element somewhere inside the Account tab. Having logout in two places is confusing and unnecessary.

**Fix:** Search inside `<div id="tab-content-account">` (the Account tab, around lines 1920–1972) for any button or link that calls `doLogout()`. Remove that element entirely. Keep the nav logout button untouched. Keep the `doLogout()` function itself untouched.

---

## FIX #11 — MEDIUM: `go-live` banner driven by `localStorage` only — never auto-detects

**File:** `dashboard.html`
**Function:** `loadAnalytics()` (around line 2776)

**Problem:** The `go-live` banner and `embed-status-dot` check `localStorage.getItem('bb_widget_live')`. This is never written by the server. If the store owner's widget is actually live and serving recommendations, the banner still says "pending" until they manually click "Mark as Live".

**Fix:** Inside `loadAnalytics()`, after the line:
```js
const { stats, productCount } = data;
```
Add:
```js
// Auto-detect live status from server data
if (!localStorage.getItem('bb_widget_live')) {
  const hasRecs = stats.total && Number(stats.total.count) > 0;
  if (hasRecs) {
    localStorage.setItem('bb_widget_live', '1');
    if (typeof updateEmbedStatusDot === 'function') updateEmbedStatusDot();
    if (typeof updateActivationUI === 'function') updateActivationUI();
  }
}
```

Do not change anything else in `loadAnalytics()`.

---

## FIX #12 — UX: Sidebar naming confusion — "Widget Settings" tab vs "Account" tab

**File:** `dashboard.html`

**Problem:** The sidebar item labeled "Widget Settings" calls `showTab('settings')`, which opens `tab-content-settings` — which contains brand color, currency, widget title, and welcome message. The sidebar item labeled "Account" calls `showTab('account')`, which opens `tab-content-account` — which contains change password, forgot password, and delete account.

A store owner clicking "Widget Settings" expects branding and widget content — this is correct.
A store owner clicking "Account" expects their account/profile — this is correct.

The confusion is that the `<div class="section-title">` inside `tab-content-settings` says "Widget Settings" — this is fine and should stay.

**The actual UX bug:** The sidebar item for Widget Settings has `id="tab-settings"` which makes `showTab('settings')` correctly activate it. BUT: when `showTab` adds the `.active` class, it looks for `id="tab-settings"` — this element is the sidebar nav item. Confirm these IDs match:
- Sidebar item for Widget Settings: `id="tab-settings"` ✓
- Tab content div: `id="tab-content-settings"` ✓
- Sidebar item for Account: `id="tab-account"` ✓
- Tab content div: `id="tab-content-account"` ✓

If any of these IDs are mismatched or missing, fix them so `showTab()` correctly activates the right sidebar item. Do not rename any IDs that are already correct.

**Additional UX fix:** In the top nav bar, the user's email appears in `id="nav-user-email-top"`. In the sidebar, the user's email also appears in `id="nav-user-email"`. Having email in two places is redundant. In the sidebar, replace the email display with the user's **name** from `currentStore.name`:

Find the line in `enterApp()`:
```js
if (emailEl) emailEl.textContent = currentStore.email || '';
```
Change to:
```js
if (emailEl) emailEl.textContent = currentStore.name || currentStore.email || '';
```

The `emailElTop` (nav bar) line stays unchanged — that one should still show the email.

---

## FIX #13 — UX: `loadWooStatus` sets `bb_store_mode` to `'woo'` on connect, but never resets it on non-connect

**File:** `dashboard.html`
**Function:** `loadWooStatus()` (around line 3543)

**Problem:** When `data.wooConnected === true`, the function does `localStorage.setItem('bb_store_mode', 'woo')` — good. But when `data.wooConnected === false`, it reads from `localStorage` and trusts whatever is there, even if `localStorage` still says `'woo'` from a previous session. This means a store that disconnected on another device or browser stays stuck in woo mode on the current browser.

**Fix:** Inside the `else` branch of `if (data.wooConnected)` in `loadWooStatus()`:

Find:
```js
} else {
  const selectedMode = localStorage.getItem('bb_store_mode') || 'custom';
  updateSidebarStoreModeUI(selectedMode, false);
  applyStoreModeLayout(selectedMode);
```

Replace with:
```js
} else {
  // Server says not connected — always reset to custom regardless of localStorage
  localStorage.setItem('bb_store_mode', 'custom');
  const selectedMode = 'custom';
  updateSidebarStoreModeUI(selectedMode, false);
  applyStoreModeLayout(selectedMode);
```

Keep the rest of the `else` block (the `connectedView`/`setupView` show/hide logic) exactly as-is.

---

## VERIFICATION CHECKLIST

After making all changes, verify the following manually or by code review:

1. `token` is declared with `let` at line ~2277 — not `const`
2. `setStoreModePermanent` is declared `async function`
3. `downloadPlugin` is declared `async function`
4. `enterApp` accepts one parameter `prefetchedData`
5. `window.onload` passes `data` to `enterApp(data)` on success, `null` on catch
6. `POST /plugin/disconnect` SQL now includes `widget_enabled = 0`
7. `disconnectWoo()` sets `localStorage.bb_store_mode` to `'custom'` after success
8. `loadWooStatus()` `else` branch now force-sets `localStorage.bb_store_mode` to `'custom'`
9. `currentAnalyticsDays` variable exists and is used in the analytics fetch URL
10. `updateSidebarStoreModeUI` has a real implementation (not empty `{}`)
11. `switchSettingsTab` is removed or properly implemented
12. Account tab has no `doLogout()` call
13. Sidebar shows `currentStore.name` not email in `#nav-user-email`
14. No existing function names, API endpoint paths, HTML IDs, or CSS class names were changed (except those explicitly listed above)

---

## WHAT NOT TO TOUCH

- Do not change any route paths in `plugin.js` — the WordPress plugin hardcodes these URLs
- Do not change `authenticatePlugin()` — it's used by the WooCommerce plugin auth, not the dashboard
- Do not change `mapCategory()`, `mapCategoryFromName()`, or `mapProduct()` — these are WooCommerce data mappers
- Do not change `doLogin()`, `doSignup()`, `doLogout()`, `handleGoogleCredentialResponse()` beyond Fix #3
- Do not change any CSS variables, class names, or HTML structure of the sidebar beyond Fix #12
- Do not change `loadProducts()`, `renderProducts()`, `saveProduct()`, or any product CRUD logic
- Do not change `submitPayment()`, `loadPaymentHistory()`, or billing logic
- Do not change `showToast()`, `uiConfirm()`, `setBtnLoading()`, `escHtml()`, or any utility functions
- Do not change `renderAnalyticsLine()`, `renderAnalyticsInsights()`, or chart rendering logic
- Do not change `updateOnboardingJourney()` or `updateTrialChip()`
- Do not change any modal HTML (`#product-modal`, `#delete-product-modal`, `#ui-confirm-modal`)
- Do not change `config.js` — it handles API URL selection
- Do not add `console.log` statements
- Do not add comments beyond what's shown in the fix blocks above
