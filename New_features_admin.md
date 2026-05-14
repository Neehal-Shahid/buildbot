

## CHUNK 1 — `server/database.js`

**File:** `server/database.js` only.

**What to add:** A `platform_config` table and its DB methods. All changes are purely additive — nothing existing is modified.

---

**Step 1 — Add `platform_config` table to `initDB`.**

Find the `await client.batch([...], 'write')` call inside `initDB`. It ends with the `trial_emails_sent` table definition. Add this new table definition as the last item in the array, directly before the closing `], 'write')`:

```js
`CREATE TABLE IF NOT EXISTS platform_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
)`
```

---

**Step 2 — Add migration for `platform_config` to the migrations array.**

The migrations array already exists. Add these two entries at the end of the array, after the existing `ALTER TABLE stores ADD COLUMN admin_notes TEXT DEFAULT ''` line:

```js
`CREATE TABLE IF NOT EXISTS platform_config (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')`,
`INSERT OR IGNORE INTO platform_config (key, value) VALUES
  ('trial_days', '14'),
  ('trial_daily_limit', '10'),
  ('starter_price', '2999'),
  ('growth_price', '4999'),
  ('pro_price', '7999'),
  ('payment_number', ''),
  ('maintenance_mode', 'false')`
```

Note: These are in the migrations array which uses try/catch per item — if the table already exists from Step 1, the INSERT OR IGNORE safely skips existing rows. This is safe to run repeatedly.

---

**Step 3 — Add `configDB` object.**

Find the line near the bottom of the file:

```js
module.exports = { client, initDB, storeDB, productDB, analyticsDB, paymentDB, tokenDB, verifyDB, widgetDB, adminDB };
```

Add the `configDB` object directly BEFORE this `module.exports` line:

```js
// ─── PLATFORM CONFIG ──────────────────────────────────────
const configDB = {

  // Get all config keys as a flat key→value object
  getAll: async () => {
    const res = await client.execute('SELECT key, value FROM platform_config');
    const config = {};
    for (const row of res.rows) {
      config[row.key] = row.value;
    }
    return config;
  },

  // Set a single config key
  set: async (key, value) => {
    return await client.execute({
      sql:  'INSERT OR REPLACE INTO platform_config (key, value) VALUES (?, ?)',
      args: [key, String(value)]
    });
  },

  // Set multiple keys at once from a plain object
  setMany: async (configObj) => {
    for (const [key, value] of Object.entries(configObj)) {
      await client.execute({
        sql:  'INSERT OR REPLACE INTO platform_config (key, value) VALUES (?, ?)',
        args: [key, String(value)]
      });
    }
  },

  // Get a single key with optional default
  get: async (key, defaultValue = '') => {
    const res = await client.execute({
      sql:  'SELECT value FROM platform_config WHERE key = ?',
      args: [key]
    });
    return res.rows[0]?.value ?? defaultValue;
  }

};
```

Then update the `module.exports` line to include `configDB`:

```js
module.exports = { client, initDB, storeDB, productDB, analyticsDB, paymentDB, tokenDB, verifyDB, widgetDB, adminDB, configDB };
```

---

## CHUNK 2 — `server/routes/admin.js`

**File:** `server/routes/admin.js` only.

**What to add:** 3 new routes — platform config GET/POST, and DB cleanup POST. All are purely additive.

---

**Step 1 — Add `configDB` to the existing import line.**

Find line 6:
```js
const { storeDB, paymentDB, analyticsDB, productDB, client, adminDB, tokenDB } = require('../database');
```

Replace with:
```js
const { storeDB, paymentDB, analyticsDB, productDB, client, adminDB, tokenDB, configDB } = require('../database');
```

---

**Step 2 — Add 3 new routes.**

Add all three routes directly before the `async function runScheduledEmails()` declaration (which is around line 423). Do not modify any existing route.

```js
// ─── PLATFORM CONFIG ──────────────────────────────────────

// GET /admin/platform-config — return all config key/value pairs
router.get('/admin/platform-config', adminAuth, async (req, res) => {
  try {
    const config = await configDB.getAll();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/platform-config — save config key/value pairs
router.post('/admin/platform-config', adminAuth, async (req, res) => {
  const { config } = req.body;
  if (!config || typeof config !== 'object')
    return res.status(400).json({ error: 'config object required' });

  // Whitelist allowed keys — never allow arbitrary keys
  const allowedKeys = [
    'trial_days', 'trial_daily_limit',
    'starter_price', 'growth_price', 'pro_price',
    'payment_number', 'maintenance_mode'
  ];

  // Validate values
  const numericKeys = ['trial_days', 'trial_daily_limit', 'starter_price', 'growth_price', 'pro_price'];
  for (const key of numericKeys) {
    if (config[key] !== undefined) {
      const val = Number(config[key]);
      if (!Number.isFinite(val) || val < 0)
        return res.status(400).json({ error: `Invalid value for ${key}: must be a positive number` });
    }
  }

  try {
    const filtered = {};
    for (const key of allowedKeys) {
      if (config[key] !== undefined) filtered[key] = config[key];
    }
    await configDB.setMany(filtered);
    res.json({ success: true, message: 'Configuration saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DB CLEANUP ───────────────────────────────────────────

// POST /admin/db-cleanup — safe cleanup of expired tokens or orphaned records
router.post('/admin/db-cleanup', adminAuth, async (req, res) => {
  const { action } = req.body;
  if (!action) return res.status(400).json({ error: 'action required: tokens | orphans' });

  try {
    if (action === 'tokens') {
      // Delete expired tokens (past expires_at) and used tokens
      const expiredRes = await client.execute(
        "DELETE FROM tokens WHERE expires_at <= datetime('now') OR used = 1"
      );
      const deleted = expiredRes.rowsAffected || 0;
      res.json({ success: true, message: `Cleaned up ${deleted} expired/used token${deleted !== 1 ? 's' : ''}` });

    } else if (action === 'orphans') {
      // Delete records that reference store_ids that no longer exist
      const r1 = await client.execute(`
        DELETE FROM products WHERE store_id NOT IN (SELECT store_id FROM stores)
      `);
      const r2 = await client.execute(`
        DELETE FROM recommendations WHERE store_id NOT IN (SELECT store_id FROM stores)
      `);
      const r3 = await client.execute(`
        DELETE FROM payments WHERE store_id NOT IN (SELECT store_id FROM stores)
      `);
      const r4 = await client.execute(`
        DELETE FROM trial_emails_sent WHERE store_id NOT IN (SELECT store_id FROM stores)
      `);
      const total = (r1.rowsAffected || 0) + (r2.rowsAffected || 0) + (r3.rowsAffected || 0) + (r4.rowsAffected || 0);
      res.json({
        success: true,
        message: `Removed ${total} orphaned record${total !== 1 ? 's' : ''} (products: ${r1.rowsAffected || 0}, recommendations: ${r2.rowsAffected || 0}, payments: ${r3.rowsAffected || 0}, trial emails: ${r4.rowsAffected || 0})`
      });

    } else {
      res.status(400).json({ error: 'Invalid action. Use: tokens | orphans' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## CHUNK 3 — `dashboard/admin.html`

**File:** `dashboard/admin.html` only. Make changes in the exact order listed. Read the full file before starting. Do not modify any existing function, modal, or tab unless explicitly told to.

---

### Change 1 — Add `revenue`, `activity` to `showTab` array

Find:
```js
['overview','stores','payments','analytics','settings','dbhealth','comms'].forEach(t => {
```
Replace with:
```js
['overview','stores','payments','analytics','settings','dbhealth','comms','revenue','activity'].forEach(t => {
```

Also find the `if (name === 'analytics')` block inside `showTab` and add after it:
```js
if (name === 'settings') loadPlatformConfig();
if (name === 'revenue')  { if (allStoresData.length === 0) loadStores().then(() => loadRevenueTab()); else loadRevenueTab(); }
if (name === 'activity') renderActivityLog();
if (name === 'comms' && allStoresData.length === 0) loadStores();
```

---

### Change 2 — Add Revenue and Activity sidebar items

Find the DB Health sidebar item:
```html
<div class="sb-item" onclick="showTab('dbhealth')" id="atab-dbhealth">
```

After its closing `</div>`, add:

```html
<div class="sb-item" onclick="showTab('revenue')" id="atab-revenue">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  Revenue
</div>
<div class="sb-item" onclick="showTab('activity')" id="atab-activity">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  Activity Log
</div>
```

---

### Change 3 — Add Platform Configuration card to Settings tab

Find in `#tab-settings`, the closing `</div>` of the `.two-col` grid (which contains Profile and Change Password cards). Add this new full-width card directly after that closing `</div>`, still inside `#tab-settings`:

```html
<div class="card" style="margin-top:20px;">
  <div class="card-head">
    <div>
      <h2>Platform Configuration</h2>
      <div class="card-sub">Control platform defaults without redeploying code</div>
    </div>
    <button class="btn btn-primary btn-sm" id="cfg-save-btn" onclick="savePlatformConfig()" style="display:inline-flex;align-items:center;gap:5px;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Save
    </button>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;">
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Trial Period (days)</label>
      <input type="number" id="cfg-trial-days" min="1" max="90" placeholder="14"/>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Trial Daily Rec Limit</label>
      <input type="number" id="cfg-trial-daily-limit" min="1" max="100" placeholder="10"/>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Payment Number (JazzCash/EasyPaisa)</label>
      <input type="text" id="cfg-payment-number" placeholder="03xxxxxxxxx"/>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;">
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Starter Plan Price (PKR)</label>
      <input type="number" id="cfg-starter-price" min="0" placeholder="2999"/>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Growth Plan Price (PKR)</label>
      <input type="number" id="cfg-growth-price" min="0" placeholder="4999"/>
    </div>
    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Pro Plan Price (PKR)</label>
      <input type="number" id="cfg-pro-price" min="0" placeholder="7999"/>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:var(--r-md);">
    <div style="flex:1;">
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px;">Maintenance Mode</div>
      <div style="font-size:12px;color:var(--muted);">When enabled, all store widgets will stop working and show a maintenance message.</div>
    </div>
    <label style="position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;">
      <input type="checkbox" id="cfg-maintenance-mode" style="opacity:0;width:0;height:0;position:absolute;">
      <span onclick="document.getElementById('cfg-maintenance-mode').click()" style="position:absolute;cursor:pointer;inset:0;background:var(--border-2);border-radius:24px;transition:0.2s;" id="cfg-maintenance-toggle"></span>
    </label>
  </div>
  <style>
    #cfg-maintenance-mode:checked + #cfg-maintenance-toggle,
    #cfg-maintenance-mode:checked ~ #cfg-maintenance-toggle { background: var(--danger) !important; }
    #cfg-maintenance-toggle::after { content:'';position:absolute;left:3px;top:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:0.2s; }
    #cfg-maintenance-mode:checked + #cfg-maintenance-toggle::after,
    #cfg-maintenance-mode:checked ~ #cfg-maintenance-toggle::after { left:calc(100% - 21px); }
  </style>
  <div class="alert" id="cfg-alert" style="margin-top:14px;"></div>
</div>
```

---

### Change 4 — Add DB Cleanup card to DB Health tab

Find in `#tab-dbhealth`, the closing `</div>` of the existing audit card. Add this new card directly after it, still inside `#tab-dbhealth`:

```html
<div class="card" style="margin-top:20px;">
  <div class="card-head">
    <div>
      <h2>Cleanup Actions</h2>
      <div class="card-sub">Safe operations — no customer or store data is removed</div>
    </div>
  </div>
  <div style="padding:12px 14px;background:var(--accent-light);border:1px solid var(--accent-border);border-radius:var(--r-md);margin-bottom:16px;">
    <div style="font-size:12px;color:var(--accent-text, var(--accent));line-height:1.6;">These operations are safe. Expired tokens and orphaned records are never needed by the application and can be removed at any time without affecting stores or customers.</div>
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="btn btn-sm" id="cleanup-tokens-btn" onclick="dbCleanup('tokens')" style="display:inline-flex;align-items:center;gap:5px;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      Clean Expired Tokens
    </button>
    <button class="btn btn-sm" id="cleanup-orphans-btn" onclick="dbCleanup('orphans')" style="display:inline-flex;align-items:center;gap:5px;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Remove Orphaned Records
    </button>
  </div>
  <div class="alert" id="cleanup-alert" style="margin-top:12px;"></div>
</div>
```

---

### Change 5 — Add Revenue tab HTML inside `.main`

Find the closing `</div>` of `#tab-comms`. Add this Revenue tab directly after it, still inside `.main`:

```html
<!-- REVENUE -->
<div id="tab-revenue" style="display:none;">
  <div class="section-title">Revenue</div>
  <div class="section-sub">Monthly recurring revenue, plan breakdown, and at-risk stores.</div>

  <div class="stats" style="margin-bottom:24px;">
    <div class="stat">
      <div class="stat-icon" style="background:var(--success-bg);color:var(--success);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <div class="stat-val" id="rev-mrr">—</div>
      <div class="stat-lbl">Monthly Revenue (MRR)</div>
    </div>
    <div class="stat">
      <div class="stat-icon" style="background:var(--accent-light);color:var(--accent);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      </div>
      <div class="stat-val" id="rev-paid">—</div>
      <div class="stat-lbl">Active Paid Stores</div>
    </div>
    <div class="stat">
      <div class="stat-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <div class="stat-val" id="rev-trial">—</div>
      <div class="stat-lbl">Trial Stores</div>
    </div>
    <div class="stat">
      <div class="stat-icon" style="background:var(--danger-bg);color:var(--danger);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div class="stat-val" id="rev-risk">—</div>
      <div class="stat-lbl">Churn Risk This Week</div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <div class="card-head"><div><h2>Revenue by Plan</h2><div class="card-sub">Monthly contribution per plan tier</div></div></div>
      <div id="rev-plan-breakdown" style="margin-top:4px;min-height:60px;"></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>At-Risk Stores</h2><div class="card-sub">Paid subscriptions expiring within 7 days</div></div></div>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>Store</th><th>Plan</th><th>Expires</th><th>Time Left</th><th>Action</th></tr></thead>
          <tbody id="rev-risk-table"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- ACTIVITY LOG -->
<div id="tab-activity" style="display:none;">
  <div class="section-title">Activity Log</div>
  <div class="section-sub">A local record of admin actions taken in this browser. Stored in localStorage — not sent to the server.</div>
  <div class="card">
    <div class="card-head">
      <div><h2>Recent Actions</h2><div class="card-sub" id="activity-count-sub">—</div></div>
      <button class="btn btn-sm btn-danger" onclick="clearActivityLog()" style="display:inline-flex;align-items:center;gap:5px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        Clear Log
      </button>
    </div>
    <table>
      <thead><tr><th>Time</th><th>Action</th><th>Detail</th></tr></thead>
      <tbody id="activity-log-table"></tbody>
    </table>
  </div>
</div>
```

---

### Change 6 — Add all new JS functions

Add these functions inside the `<script>` block, directly before the closing `</script>` tag. Do not modify any existing function.

```js
// ─── PLATFORM CONFIG ──────────────────────────────────────
async function loadPlatformConfig() {
  try {
    const res = await fetch(`${API}/admin/platform-config`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.success) return;
    const c = data.config;
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    set('cfg-trial-days', c.trial_days);
    set('cfg-trial-daily-limit', c.trial_daily_limit);
    set('cfg-starter-price', c.starter_price);
    set('cfg-growth-price', c.growth_price);
    set('cfg-pro-price', c.pro_price);
    set('cfg-payment-number', c.payment_number);
    const toggle = document.getElementById('cfg-maintenance-mode');
    if (toggle) toggle.checked = (c.maintenance_mode === 'true');
  } catch (e) {
    console.error('Failed to load platform config:', e);
  }
}

async function savePlatformConfig() {
  const btn = document.getElementById('cfg-save-btn');
  setBtnLoading(btn, true);
  const get = id => document.getElementById(id)?.value?.trim() || '';
  const config = {
    trial_days:        get('cfg-trial-days'),
    trial_daily_limit: get('cfg-trial-daily-limit'),
    starter_price:     get('cfg-starter-price'),
    growth_price:      get('cfg-growth-price'),
    pro_price:         get('cfg-pro-price'),
    payment_number:    get('cfg-payment-number'),
    maintenance_mode:  String(document.getElementById('cfg-maintenance-mode')?.checked || false)
  };
  try {
    const res = await fetch(`${API}/admin/platform-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ config })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('cfg-alert', 'Configuration saved successfully', 'success');
      logActivity('Config saved', Object.keys(config).join(', '));
    } else {
      showAlert('cfg-alert', data.error || 'Failed to save', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('cfg-alert', 'Server error', 'error');
  }
}

// ─── DB CLEANUP ───────────────────────────────────────────
async function dbCleanup(action) {
  const btnId = action === 'tokens' ? 'cleanup-tokens-btn' : 'cleanup-orphans-btn';
  const btn = document.getElementById(btnId);
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/db-cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('cleanup-alert', data.message, 'success');
      logActivity('DB cleanup', action + ': ' + data.message);
    } else {
      showAlert('cleanup-alert', data.error || 'Cleanup failed', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('cleanup-alert', 'Server error', 'error');
  }
}

// ─── REVENUE TAB ──────────────────────────────────────────
function loadRevenueTab() {
  const planPrices = {
    trial:   0,
    starter: parseInt(document.getElementById('cfg-starter-price')?.value || '2999'),
    growth:  parseInt(document.getElementById('cfg-growth-price')?.value  || '4999'),
    pro:     parseInt(document.getElementById('cfg-pro-price')?.value     || '7999'),
  };

  const active     = allStoresData.filter(s => s.plan_status === 'active');
  const paidStores = active.filter(s => s.plan !== 'trial');
  const trialStores = active.filter(s => s.plan === 'trial');
  const mrr = paidStores.reduce((sum, s) => sum + (planPrices[s.plan] || 0), 0);

  // Churn risk — plan_ends within 7 days from today
  const now = new Date();
  const atRisk = paidStores.filter(s => {
    if (!s.plan_ends) return false;
    const ends = new Date(s.plan_ends);
    const daysLeft = Math.ceil((ends - now) / 86400000);
    return daysLeft >= 0 && daysLeft <= 7;
  });

  // Stats
  document.getElementById('rev-mrr').textContent   = mrr > 0 ? 'Rs ' + mrr.toLocaleString() : 'Rs 0';
  document.getElementById('rev-paid').textContent   = paidStores.length;
  document.getElementById('rev-trial').textContent  = trialStores.length;
  document.getElementById('rev-risk').textContent   = atRisk.length;

  // Revenue breakdown by plan
  const planCounts = {};
  paidStores.forEach(s => { planCounts[s.plan] = (planCounts[s.plan] || 0) + 1; });
  const revenues = Object.entries(planCounts).map(([p, c]) => ({ plan: p, count: c, revenue: c * (planPrices[p] || 0) }));
  const maxRev = Math.max(...revenues.map(r => r.revenue), 1);
  const palette = { starter: 'var(--accent)', growth: 'var(--accent)', pro: 'var(--success)' };

  document.getElementById('rev-plan-breakdown').innerHTML = revenues.length === 0
    ? '<div style="font-size:13px;color:var(--dim);padding:16px 0;">No paid stores yet.</div>'
    : revenues.map(({ plan, count, revenue }) => `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:65px;font-size:12px;font-weight:500;color:var(--text-2);text-transform:capitalize;flex-shrink:0;">${plan}</div>
          <div style="flex:1;background:var(--surface-2);border-radius:6px;height:10px;overflow:hidden;">
            <div style="height:100%;background:${palette[plan]||'var(--accent)'};border-radius:6px;width:${Math.round(revenue/maxRev*100)}%;transition:width 0.6s ease;"></div>
          </div>
          <div style="font-size:12px;color:var(--muted);width:18px;text-align:center;">${count}</div>
          <div style="font-size:12px;font-weight:700;color:var(--text);width:100px;text-align:right;flex-shrink:0;">Rs ${revenue.toLocaleString()}</div>
        </div>`).join('');

  // Churn risk table
  document.getElementById('rev-risk-table').innerHTML = atRisk.length === 0
    ? '<tr><td colspan="5" class="table-empty">No stores at risk this week.</td></tr>'
    : atRisk.map(s => {
        const ends = new Date(s.plan_ends);
        const daysLeft = Math.ceil((ends - now) / 86400000);
        return `<tr>
          <td><strong>${safeText(s.name)}</strong><br><span style="font-size:11px;color:var(--muted);">${safeText(s.email)}</span></td>
          <td>${planBadge(s.plan)}</td>
          <td>${ends.toLocaleDateString()}</td>
          <td><span class="badge ${daysLeft <= 2 ? 'badge-danger' : 'badge-warning'}">${daysLeft}d left</span></td>
          <td>
            <button class="btn btn-sm btn-warning" onclick="sendRenewalReminder('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')" style="display:inline-flex;align-items:center;gap:4px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              Remind
            </button>
          </td>
        </tr>`;
      }).join('');
}

async function sendRenewalReminder(storeId, name) {
  const decodedName = decodeURIComponent(name);
  try {
    const res = await fetch(`${API}/admin/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        storeId,
        subject: 'Your BuildBot subscription is expiring soon',
        message: `Hi ${decodedName},\n\nYour BuildBot subscription is expiring within the next few days. To keep your widget running and serving customers, please renew your subscription from your dashboard.\n\nIf you have any questions or need help with payment, just reply to this email.\n\nThank you,\nBuildBot Team`
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Reminder sent', `Email sent to ${decodedName}`, 'success');
      logActivity('Renewal reminder', decodedName);
    } else {
      showToast('Failed', data.error || 'Could not send email', 'error');
    }
  } catch {
    showToast('Error', 'Server error', 'error');
  }
}

// ─── ACTIVITY LOG ─────────────────────────────────────────
function logActivity(action, detail) {
  try {
    const logs = JSON.parse(localStorage.getItem('bb_admin_log') || '[]');
    logs.unshift({ ts: new Date().toISOString(), action, detail: detail || '' });
    if (logs.length > 100) logs.splice(100);
    localStorage.setItem('bb_admin_log', JSON.stringify(logs));
    // Re-render if activity tab is currently visible
    const tab = document.getElementById('tab-activity');
    if (tab && tab.style.display !== 'none') renderActivityLog();
  } catch {}
}

function renderActivityLog() {
  try {
    const logs = JSON.parse(localStorage.getItem('bb_admin_log') || '[]');
    const sub = document.getElementById('activity-count-sub');
    if (sub) sub.textContent = `${logs.length} action${logs.length !== 1 ? 's' : ''} recorded`;
    const tbody = document.getElementById('activity-log-table');
    if (!tbody) return;
    tbody.innerHTML = logs.length === 0
      ? '<tr><td colspan="3" class="table-empty">No activity recorded yet. Actions like approving payments, disabling stores, and sending emails will appear here.</td></tr>'
      : logs.map(l => `
          <tr>
            <td style="white-space:nowrap;color:var(--muted);font-size:12px;">${new Date(l.ts).toLocaleString()}</td>
            <td style="font-weight:600;color:var(--text);font-size:13px;">${safeText(l.action)}</td>
            <td style="color:var(--muted);font-size:13px;">${safeText(l.detail)}</td>
          </tr>`).join('');
  } catch {}
}

function clearActivityLog() {
  localStorage.removeItem('bb_admin_log');
  renderActivityLog();
  showToast('Log cleared', 'Activity log has been cleared', 'success');
}
```

---

### Change 7 — Wire `logActivity` into existing action functions

Find each of these existing functions and add the `logActivity` call after a **successful** action. Add only the `logActivity` line — do not change anything else in these functions.

**In `confirmApprove`**, after `closeModal()` on success, add:
```js
logActivity('Payment approved', decodedName + ' — ' + pendingAction.plan);
```

**In `confirmDisable`**, after `closeModal()` on success, add:
```js
logActivity('Store disabled', pendingAction.storeId);
```

**In `confirmDelete`**, after `closeModal()` on success, add:
```js
logActivity('Store deleted', pendingAction.storeId);
```

**In `confirmActivate`**, after `closeModal()` on success, add:
```js
logActivity('Store activated', pendingAction.storeId);
```

**In `confirmManageStore` (or whatever function saves plan override)**, after success, add:
```js
logActivity('Plan overridden', _managingStoreId + ' → ' + document.getElementById('manage-plan')?.value);
```

**In `submitBroadcast` or `confirmBroadcast`**, after success, add:
```js
const target = document.getElementById('broadcast-target-plan')?.value || 'all stores';
logActivity('Broadcast sent', target);
```

**In `sendToSingleStore`**, after success, add:
```js
logActivity('Email sent', _selectedStoreEmail);
```

**In `runDripNow`**, after success, add:
```js
logActivity('Drip emails triggered', 'manual run');
```

---

### Change 8 — Call `loadPlatformConfig` on `enterAdmin`

Find the `enterAdmin` function. At the end of the function body, before its closing `}`, add:
```js
loadPlatformConfig();
```

---

**That is all. Do not add anything else. Do not modify any existing route, DB method, modal, or function not listed above.**
