# Cursor Task — BuildBot Dashboard IA Restructure
## File: dashboard.html
## Goal: Restructure navigation and tab layout only. Zero JS logic changes.

---

## CONTEXT — What and why

The dashboard has 3 structural problems to fix:

1. **Embed code is duplicated** — it appears on the Overview tab AND the "Go Live · Widget" tab
2. **WooCommerce setup is split** — it lives in Settings but WooCommerce mode is picked in Products, forcing users to bounce between tabs
3. **Settings is overloaded** — it mixes widget customization, store mode, WooCommerce setup, password change, and account deletion under one tab with sub-tabs

The fix: split Settings into two focused tabs, move WooCommerce inline into Products, remove the duplicate embed card from Overview.

---

## THE 6 CHANGES — Do them in this exact order

---

### CHANGE 1 — Remove the duplicate embed code card from Overview tab

**Find** this entire card block inside `id="tab-content-home"` (around line 1196):

```html
<div class="card" id="settings-security-card">
  <h2>Your Embed Code</h2>
  <p style="margin-bottom:16px;">Paste this before the &lt;/body&gt; tag on your website.</p>
  <div class="embed-box" id="embed-code-display"></div>
  <button class="btn btn-primary btn-sm" onclick="copyEmbed()">Copy Code</button>
  <div class="alert" id="embed-alert"></div>
</div>
```

**Delete it entirely.**

Then search the entire `<script>` block for any reference to `embed-code-display` (without the `-2` suffix) and `embed-alert` (without the `-2` suffix). The JS currently sets content on `embed-code-display` around line 2469:

```js
document.getElementById('embed-code-display').textContent = `<script ...>`;
```

Change that one line to target `embed-code-display-2` instead (which is the correct element in the Install Widget tab):

```js
document.getElementById('embed-code-display-2').textContent = `<script src="https://buildbot-production.up.railway.app/widget.js" data-store-id="${currentStore.storeId}"><\/script>`;
```

Also find any reference to `embed-alert` (the one without `-2`) and remove or redirect to `embed-alert-2`.

---

### CHANGE 2 — Move WooCommerce setup from Settings into Products tab

**Step A — Cut from Settings:**

Inside `id="tab-content-settings"`, find and **cut** (remove from here, paste in step B) this entire div:

```html
<div id="settings-panel-store" style="display:none;">
  <div class="card">
    <h2>Store</h2>
    ... store mode buttons (setStoreModePermanent) ...
  </div>
</div>
```

And also **cut** the entire `id="woo-section"` card (the WooCommerce Auto-Sync card with all 4 setup steps, woo-connected-view, woo-setup-view, generatePluginKey, etc). It currently sits inside `id="settings-panel-widget"` area, around line 1799.

**Step B — Paste into Products tab:**

Inside `id="tab-content-products"`, find `id="products-woo-view"`. It currently contains:

```html
<div id="products-woo-view" style="display:none;">
  <div style="...info banner...">WooCommerce mode. Your products sync automatically...</div>
  <div class="card">
    <h2>Connect WooCommerce</h2>
    <p>WooCommerce sync is configured in <b>Settings</b>. Once connected...</p>
    <button class="btn btn-primary btn-sm" onclick="showTab('settings')">Go to Settings</button>
  </div>
</div>
```

**Replace** the inner redirect card (the one with "Go to Settings" button) with the two blocks you cut from Settings:

```html
<div id="products-woo-view" style="display:none;">

  <!-- keep this info banner exactly as-is -->
  <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;margin-bottom:16px;font-size:12px;color:var(--muted);">
    <svg ...>...</svg>
    <span><strong style="color:var(--text);">WooCommerce mode.</strong> Your products sync automatically from WordPress. To add or edit products, use your WordPress admin panel.</span>
  </div>

  <!-- PASTE: Store mode card (was settings-panel-store) -->
  <div class="card" style="margin-bottom:16px;">
    <h2>Store Mode</h2>
    <p style="margin-bottom:12px;">Choose your primary store workflow.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn btn-sm" id="store-mode-custom-btn" onclick="setStoreModePermanent('custom')" ...>My Products (Manual / CSV)</button>
      <button class="btn btn-sm" id="store-mode-woo-btn" onclick="setStoreModePermanent('woo')" ...>WooCommerce</button>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:10px;">You can switch anytime. Irrelevant product UI stays hidden.</div>
  </div>

  <!-- PASTE: Full WooCommerce setup (was woo-section in settings) -->
  <div class="card" id="woo-section">
    ... entire woo-section content exactly as-is, all IDs preserved ...
  </div>

</div>
```

> **Critical:** All IDs must remain identical — `woo-section`, `woo-connected-view`, `woo-setup-view`, `woo-status-badge`, `woo-url-display`, `woo-count-display`, `woo-sync-display`, `plugin-secret-display`, `generate-key-btn`, `copy-key-btn`, `store-id-plugin-display`, `store-mode-custom-btn`, `store-mode-woo-btn`. Do not rename anything.

---

### CHANGE 3 — Clean up Settings tab (widget only)

After cutting the Store panel and woo-section in Change 2, the Settings tab should now only contain the widget customization. Make these cleanup edits inside `id="tab-content-settings"`:

**A — Remove the 3-button sub-tab bar** (`id="settings-subtabs"`):

Delete this entire div:
```html
<div style="..." id="settings-subtabs">
  <button onclick="switchSettingsTab('widget')" id="stab-widget" ...>🎨 Widget</button>
  <button onclick="switchSettingsTab('store')" id="stab-store" ...>🏪 Store</button>
  <button onclick="switchSettingsTab('account')" id="stab-account" ...>👤 Account</button>
</div>
```

**B — Remove the `style="display:none;"` from the widget panel** so it's always visible:

Change:
```html
<div id="settings-panel-widget">
```
to stay as-is (it should already not have display:none — verify and leave it visible).

**C — Remove `id="settings-panel-account"` div** (password change + danger zone). This entire block moves in Change 4.

**D — Update the help context box text** inside `id="help-settings"`:

Change the text from:
```
• Widget tab controls branding and text.
• Store tab changes mode and Woo setup.
• Account tab is for password/security actions.
```
To:
```
• Customize your widget's brand color, currency, title, and welcome message.
• Changes save instantly and apply to your live widget.
```

Also remove the inline `color:#a5b4fc` from the `<strong>` tag inside help-settings — replace with `color:var(--accent-text)`.

**E — Update section-sub** text under the Settings title:

Keep as-is: `"Customize how your widget looks and what it says."` — this is already correct.

---

### CHANGE 4 — Create new Account tab

**A — Add new tab content block:**

After the closing `</div>` of `id="tab-content-billing"` and before `id="tab-content-embed"`, insert:

```html
<!-- ── ACCOUNT TAB ── -->
<div id="tab-content-account" style="display:none;">
  <div class="section-title">Account</div>
  <div class="section-sub">Manage your password, security, and account settings.</div>

  <!-- PASTE HERE: the entire settings-panel-account div from Settings -->
  <!-- That div contains: settings-account-security-card (password change) -->
  <!-- Make it visible by default: remove style="display:none;" from settings-panel-account -->
  <div id="settings-panel-account">

    <div class="card" id="settings-account-security-card" style="margin-bottom:16px;">
      <h2>Security</h2>
      <p style="margin-bottom:20px;">Change your account password.</p>
      ... password fields (cp-current, cp-new, cp-confirm) exactly as-is ...
      <button class="btn btn-primary" onclick="changePassword(this)">Change Password</button>
      <div class="alert" id="cp-alert" ...></div>
    </div>

    <!-- PASTE HERE: settings-danger-card exactly as-is -->
    <div class="card" id="settings-danger-card" style="border-color:var(--danger-border);">
      <h2 style="color:var(--danger);">Danger Zone</h2>
      <p style="margin-bottom:20px;">Permanently delete your account and all associated data. This action cannot be undone.</p>
      <button class="btn btn-danger" onclick="deleteAccount(this)">Delete Account</button>
    </div>

  </div>
</div>
```

> **Critical:** Keep all IDs: `settings-panel-account`, `settings-account-security-card`, `cp-current`, `cp-new`, `cp-confirm`, `cp-alert`, `settings-danger-card`. Do not rename.

**B — Remove `style="display:none;"` from `id="settings-panel-account"`** since it's now a standalone tab, not a hidden sub-panel.

**C — Remove `style="display:none;"` from `id="settings-account-security-card"`** — same reason.

---

### CHANGE 5 — Update sidebar navigation

**Replace the entire `<nav class="sidebar-nav">` block** with this:

```html
<nav class="sidebar-nav">

  <div class="sidebar-item active" onclick="showTab('home')" id="tab-home">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    Overview
  </div>

  <div class="sidebar-item" onclick="showTab('products')" id="tab-products">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
    Products
  </div>

  <div class="sidebar-item" onclick="showTab('analytics')" id="tab-analytics">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    Analytics
  </div>

  <div class="sidebar-item" onclick="showTab('embed')" id="tab-embed">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M20.07 4.93a10 10 0 0 1 0 14.14"/><path d="M3.93 19.07a10 10 0 0 1 0-14.14"/></svg>
    Install Widget
    <span class="sidebar-status-dot" id="embed-status-dot"></span>
  </div>

  <div class="sidebar-divider"></div>

  <div class="sidebar-item" onclick="showTab('billing')" id="tab-billing">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    Billing
  </div>

  <div class="sidebar-item" onclick="showTab('account')" id="tab-account">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    Account
  </div>

  <div class="sidebar-item" onclick="showTab('settings')" id="tab-settings">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    Widget Settings
  </div>

  <div class="sidebar-item" onclick="showTab('help')" id="tab-help">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>
    Help & Docs
  </div>

</nav>
```

Also add this CSS rule in the `<style>` block (anywhere near the other sidebar rules):

```css
.sidebar-divider {
  height: 1px;
  background: var(--border);
  margin: 8px 10px;
}
```

---

### CHANGE 6 — Update JS showTab() and mobile tabs

**A — In the `showTab(name)` function** (around line 2513), find this line:

```js
if (name === 'settings') {
  loadWidgetSettings();
  loadWooStatus();
  const preferredMode = localStorage.getItem('bb_store_mode') || 'custom';
  switchSettingsTab(preferredMode === 'woo' ? 'store' : 'widget');
}
```

Replace with:

```js
if (name === 'settings') {
  loadWidgetSettings();
}
if (name === 'account') {
  loadWooStatus();
  const secCard = document.getElementById('settings-account-security-card');
  if (secCard) secCard.style.display = 'block';
}
if (name === 'products') {
  loadWooStatus();
}
```

> Note: `loadWooStatus()` now runs when entering Products (to show connection status in the woo setup panel) and Account. It no longer runs only on Settings.

**B — Also in `showTab()`**, find this line:

```js
if (name === 'home' || name === 'products' || name === 'embed' || name === 'settings') {
  setTimeout(updateOnboardingJourney, 100);
}
```

Add `'account'` is not needed here. Leave this line exactly as-is.

**C — Mobile tabs** — replace the entire `<div class="mobile-tabs">` block (at the very bottom of the file, after `</script>`) with:

```html
<div class="mobile-tabs">
  <button class="mobile-tab" onclick="showTab('home')">
    <svg class="mobile-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    Overview
  </button>
  <button class="mobile-tab" onclick="showTab('products')">
    <svg class="mobile-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
    Products
  </button>
  <button class="mobile-tab" onclick="showTab('analytics')">
    <svg class="mobile-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    Analytics
  </button>
  <button class="mobile-tab" onclick="showTab('embed')">
    <svg class="mobile-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M20.07 4.93a10 10 0 0 1 0 14.14"/><path d="M3.93 19.07a10 10 0 0 1 0-14.14"/></svg>
    Install
  </button>
  <button class="mobile-tab" onclick="showTab('account')">
    <svg class="mobile-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    Account
  </button>
</div>
```

**D — Update the mobileMap object** inside `showTab()`:

Find:
```js
var mobileMap = { home: 0, embed: 1, products: 2, analytics: 3, settings: 4 };
```

Replace with:
```js
var mobileMap = { home: 0, products: 1, analytics: 2, embed: 3, account: 4 };
```

---

## DO NOT TOUCH — These must remain exactly as-is

- Every JS function body: `doLogout`, `saveProduct`, `loadProducts`, `copyEmbed`, `generatePluginKey`, `copyPluginKey`, `disconnectWoo`, `downloadPlugin`, `copyStoreId`, `updateOnboardingJourney`, `renderAnalyticsLine`, `loadAnalytics`, `saveSettings`, `saveWidgetSettings`, `resetWidgetDefaults`, `loadWidgetSettings`, `updateWidgetPreview`, `loadWooStatus`, `setStoreModePermanent`, `switchProductView`, `updateSidebarStoreModeUI`, `applyStoreModeLayout`, `filterProducts`, `openAddProduct`, `closeProductModal`, `saveProduct`, `submitPayment`, `loadPaymentHistory`, `deleteAccount`, `changePassword`, `updateActivationUI`, `updateBillingTrialNote`, `updateTrialChip`, `switchSettingsTab` (can be left as dead code or removed — it's no longer called)
- All API fetch calls and URLs
- All modal HTML blocks
- All toast system HTML and JS
- All CSS variables and `:root` block
- Analytics tab content — no changes
- Billing tab content — no changes
- Help tab content — no changes
- The `id="embed-code-display-2"` element in the Install Widget tab
- The `id="trial-banner"` block
- The `id="overview-prelive-state"` and `id="overview-live-state"` blocks in Overview

---

## FINAL VERIFICATION — Check before saving

- [ ] `showTab('account')` shows `id="tab-content-account"` and no JS error
- [ ] `showTab('settings')` shows only widget customization — no store mode buttons, no password fields
- [ ] `showTab('products')` in WooCommerce mode shows the full 4-step WooCommerce setup inline — no "Go to Settings" redirect button
- [ ] Embed code appears only in the Install Widget tab — not on Overview
- [ ] Sidebar has 8 items: Overview, Products, Analytics, Install Widget, [divider], Billing, Account, Widget Settings, Help & Docs
- [ ] Mobile tab bar has 5 buttons: Overview, Products, Analytics, Install, Account
- [ ] `mobileMap` object matches the new mobile tab order
- [ ] These IDs still exist in the DOM (grep to confirm): `woo-section`, `woo-connected-view`, `woo-setup-view`, `woo-status-badge`, `plugin-secret-display`, `generate-key-btn`, `copy-key-btn`, `store-id-plugin-display`, `store-mode-custom-btn`, `store-mode-woo-btn`, `settings-danger-card`, `cp-current`, `cp-new`, `cp-confirm`, `cp-alert`, `settings-account-security-card`, `embed-code-display-2`, `embed-alert-2`
- [ ] `id="embed-code-display"` (without `-2`) no longer exists in the DOM
- [ ] `id="settings-security-card"` (the old duplicate embed card) no longer exists in the DOM
- [ ] No orphaned `switchSettingsTab` calls remain that reference `'store'` or `'account'` sub-tabs
- [ ] The JS line that sets embed code content targets `embed-code-display-2` not `embed-code-display`
