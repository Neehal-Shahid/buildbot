

**Files to edit:** `dashboard/admin.html` and `dashboard/dashboard.html`
**Read both files completely before starting. Make changes in the exact order listed. Do not touch any server files. Do not modify any existing function unless explicitly told to.**

---

# PART A — `dashboard/admin.html`

---

## A1 — Store Inspector slide-over panel

**What it is:** Clicking any store row name opens a right-side slide-over panel showing that store's products, recent recommendations, widget settings, and payment history — without leaving the All Stores tab.

**Step 1 — Add slide-over CSS.** Inside the `<style>` block, before the closing `</style>` tag, add:

```css
/* ── STORE INSPECTOR SLIDE-OVER ── */
.inspector-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17,24,39,0.35);
  z-index: 5000;
  display: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.inspector-overlay.open { display: block; opacity: 1; }

.inspector-panel {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 520px;
  max-width: 95vw;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  z-index: 5001;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
}
.inspector-panel.open { transform: translateX(0); }

.inspector-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.inspector-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
.inspector-sub { font-size: 12px; color: var(--muted); }

.inspector-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
  flex-shrink: 0;
  gap: 0;
}
.inspector-tab {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.12s, border-color 0.12s;
  white-space: nowrap;
}
.inspector-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.inspector-tab:hover:not(.active) { color: var(--text-2); }

.inspector-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.inspector-body::-webkit-scrollbar { width: 3px; }
.inspector-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.inspector-section { margin-bottom: 20px; }
.inspector-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--dim);
  margin-bottom: 10px;
}
.inspector-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.inspector-row:last-child { border-bottom: none; }
.inspector-row-label { color: var(--muted); }
.inspector-row-val { color: var(--text); font-weight: 500; }
```

**Step 2 — Add slide-over HTML.** Add this block directly before the `<!-- TOAST CONTAINER -->` comment:

```html
<!-- STORE INSPECTOR -->
<div class="inspector-overlay" id="inspector-overlay" onclick="closeInspector()"></div>
<div class="inspector-panel" id="inspector-panel">
  <div class="inspector-header">
    <div>
      <div class="inspector-title" id="inspector-name">Store Name</div>
      <div class="inspector-sub" id="inspector-meta">loading…</div>
    </div>
    <button class="btn btn-sm" onclick="closeInspector()" style="flex-shrink:0;">✕ Close</button>
  </div>
  <div class="inspector-tabs">
    <div class="inspector-tab active" onclick="switchInspectorTab('overview',this)">Overview</div>
    <div class="inspector-tab" onclick="switchInspectorTab('products',this)">Products</div>
    <div class="inspector-tab" onclick="switchInspectorTab('recs',this)">Recent Recs</div>
    <div class="inspector-tab" onclick="switchInspectorTab('payments',this)">Payments</div>
  </div>
  <div class="inspector-body">
    <div id="inspector-tab-overview">
      <div class="inspector-section">
        <div class="inspector-section-label">Store Details</div>
        <div class="inspector-row"><span class="inspector-row-label">Plan</span><span class="inspector-row-val" id="isp-plan">—</span></div>
        <div class="inspector-row"><span class="inspector-row-label">Status</span><span class="inspector-row-val" id="isp-status">—</span></div>
        <div class="inspector-row"><span class="inspector-row-label">Email</span><span class="inspector-row-val" id="isp-email">—</span></div>
        <div class="inspector-row"><span class="inspector-row-label">Store ID</span><span class="inspector-row-val" id="isp-storeid" style="font-family:monospace;font-size:11px;">—</span></div>
        <div class="inspector-row"><span class="inspector-row-label">Joined</span><span class="inspector-row-val" id="isp-joined">—</span></div>
        <div class="inspector-row"><span class="inspector-row-label">Trial Ends</span><span class="inspector-row-val" id="isp-trial">—</span></div>
        <div class="inspector-row"><span class="inspector-row-label">Plan Ends</span><span class="inspector-row-val" id="isp-planends">—</span></div>
        <div class="inspector-row"><span class="inspector-row-label">Products</span><span class="inspector-row-val" id="isp-products">—</span></div>
        <div class="inspector-row"><span class="inspector-row-label">Total Recs</span><span class="inspector-row-val" id="isp-recs">—</span></div>
        <div class="inspector-row"><span class="inspector-row-label">WooCommerce</span><span class="inspector-row-val" id="isp-woo">—</span></div>
        <div class="inspector-row"><span class="inspector-row-label">Brand Color</span><span class="inspector-row-val" id="isp-color">—</span></div>
      </div>
      <div class="inspector-section" id="isp-notes-wrap">
        <div class="inspector-section-label">Internal Notes</div>
        <div id="isp-notes-display" style="font-size:13px;color:var(--muted);line-height:1.6;padding:10px 12px;background:var(--surface-2);border-radius:var(--r-md);"></div>
      </div>
    </div>
    <div id="inspector-tab-products" style="display:none;">
      <div class="inspector-section-label">Product Catalog</div>
      <div id="isp-products-list"></div>
    </div>
    <div id="inspector-tab-recs" style="display:none;">
      <div class="inspector-section-label">Last 10 Recommendations</div>
      <div id="isp-recs-list"></div>
    </div>
    <div id="inspector-tab-payments" style="display:none;">
      <div class="inspector-section-label">Payment History</div>
      <div id="isp-payments-list"></div>
    </div>
  </div>
</div>
```

**Step 3 — Add inspector JS functions.** Add these inside the `<script>` block, before the closing `</script>` tag:

```js
// ─── STORE INSPECTOR ──────────────────────────────────────
let _inspectorStoreId = null;

function openInspector(storeId) {
  _inspectorStoreId = storeId;
  const store = allStoresData.find(s => s.store_id === storeId);
  if (!store) return;

  document.getElementById('inspector-name').textContent = store.name;
  document.getElementById('inspector-meta').textContent = `${store.email} · ${store.plan}`;
  document.getElementById('isp-plan').innerHTML = planBadge(store.plan);
  document.getElementById('isp-status').innerHTML = `<span class="badge ${store.plan_status === 'active' ? 'badge-success' : store.plan_status === 'disabled' ? 'badge-danger' : 'badge-warning'}">${store.plan_status || 'trial'}</span>`;
  document.getElementById('isp-email').textContent = store.email;
  document.getElementById('isp-storeid').textContent = store.store_id;
  document.getElementById('isp-joined').textContent = store.created_at ? new Date(store.created_at).toLocaleDateString() : '—';
  document.getElementById('isp-trial').textContent = store.trial_ends ? new Date(store.trial_ends).toLocaleDateString() : '—';
  document.getElementById('isp-planends').textContent = store.plan_ends ? new Date(store.plan_ends).toLocaleDateString() : '—';
  document.getElementById('isp-products').textContent = store.product_count || 0;
  document.getElementById('isp-recs').textContent = store.rec_count || 0;
  document.getElementById('isp-woo').textContent = store.woo_connected ? `Connected (${store.woo_url || ''})` : 'Not connected';
  const colorEl = document.getElementById('isp-color');
  colorEl.innerHTML = store.brand_color ? `<span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:14px;height:14px;border-radius:3px;background:${safeText(store.brand_color)};border:1px solid var(--border);flex-shrink:0;"></span>${safeText(store.brand_color)}</span>` : '—';
  document.getElementById('isp-notes-display').textContent = store.admin_notes || 'No notes.';

  // Reset to overview tab
  switchInspectorTab('overview', document.querySelector('.inspector-tab'));

  document.getElementById('inspector-overlay').classList.add('open');
  document.getElementById('inspector-panel').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Load products and recs in background
  loadInspectorProducts(storeId);
  loadInspectorRecs(storeId);
  loadInspectorPayments(storeId);
}

function closeInspector() {
  document.getElementById('inspector-overlay').classList.remove('open');
  document.getElementById('inspector-panel').classList.remove('open');
  document.body.style.overflow = '';
  _inspectorStoreId = null;
}

function switchInspectorTab(name, el) {
  ['overview','products','recs','payments'].forEach(t => {
    const tab = document.getElementById(`inspector-tab-${t}`);
    if (tab) tab.style.display = t === name ? 'block' : 'none';
  });
  document.querySelectorAll('.inspector-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
}

async function loadInspectorProducts(storeId) {
  const el = document.getElementById('isp-products-list');
  el.innerHTML = '<div style="color:var(--dim);font-size:13px;padding:8px 0;">Loading…</div>';
  try {
    const res = await fetch(`${API}/admin/store-products/${storeId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.success || !data.products.length) {
      el.innerHTML = '<div style="color:var(--dim);font-size:13px;padding:8px 0;">No products in catalog.</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Category</th><th>Price</th></tr></thead>
        <tbody>
          ${data.products.map(p => `
            <tr>
              <td style="font-size:12px;">${safeText(p.name)}</td>
              <td><span class="badge badge-muted" style="font-size:10px;">${safeText(p.category)}</span></td>
              <td style="font-size:12px;font-weight:600;">Rs ${Number(p.price).toLocaleString()}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch {
    el.innerHTML = '<div style="color:var(--danger);font-size:13px;">Could not load products.</div>';
  }
}

async function loadInspectorRecs(storeId) {
  const el = document.getElementById('isp-recs-list');
  el.innerHTML = '<div style="color:var(--dim);font-size:13px;padding:8px 0;">Loading…</div>';
  try {
    const res = await fetch(`${API}/admin/store-recs/${storeId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.success || !data.recs.length) {
      el.innerHTML = '<div style="color:var(--dim);font-size:13px;padding:8px 0;">No recommendations yet.</div>';
      return;
    }
    el.innerHTML = data.recs.map(r => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:13px;font-weight:600;color:var(--text);">${safeText(r.purpose)}</span>
          <span style="font-size:11px;color:var(--muted);">${new Date(r.created_at).toLocaleDateString()}</span>
        </div>
        <div style="font-size:12px;color:var(--muted);">Budget: Rs ${Number(r.budget).toLocaleString()}${r.extras ? ` · Extras: ${safeText(r.extras)}` : ''}</div>
      </div>`).join('');
  } catch {
    el.innerHTML = '<div style="color:var(--danger);font-size:13px;">Could not load recommendations.</div>';
  }
}

async function loadInspectorPayments(storeId) {
  const el = document.getElementById('isp-payments-list');
  el.innerHTML = '<div style="color:var(--dim);font-size:13px;padding:8px 0;">Loading…</div>';
  try {
    const res = await fetch(`${API}/admin/store-payments/${storeId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.success || !data.payments.length) {
      el.innerHTML = '<div style="color:var(--dim);font-size:13px;padding:8px 0;">No payment history.</div>';
      return;
    }
    el.innerHTML = data.payments.map(p => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:13px;font-weight:600;color:var(--text);">${safeText(p.plan)} — Rs ${Number(p.amount).toLocaleString()}</span>
          <span class="badge ${p.status === 'approved' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-danger'}" style="font-size:10px;">${p.status}</span>
        </div>
        <div style="font-size:12px;color:var(--muted);">${safeText(p.method)} · Ref: ${safeText(p.transaction_ref)} · ${new Date(p.created_at).toLocaleDateString()}</div>
      </div>`).join('');
  } catch {
    el.innerHTML = '<div style="color:var(--danger);font-size:13px;">Could not load payments.</div>';
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _inspectorStoreId) closeInspector();
});
```

**Step 4 — Make store name in table clickable to open inspector.**

In `renderStores`, find the first `<td>` that renders the store name. It currently shows:
```js
<td><strong>${safeText(s.name)}</strong></td>
```
Replace with:
```js
<td>
  <div style="font-weight:600;color:var(--accent);cursor:pointer;" onclick="openInspector('${safeText(s.store_id)}')" title="Inspect store">${safeText(s.name)}</div>
  <div style="font-size:11px;color:var(--muted);margin-top:2px;">${safeText(s.email)}</div>
</td>
```
Remove the separate `<td>` that showed email, since it's now inside the name cell. Update the table `<thead>` in the stores tab to remove the Email column and update colspan accordingly.

**Step 5 — Add 2 new backend routes to `server/routes/admin.js`.**

Add these two routes directly before `runScheduledEmails`:

```js
// Get store recent recommendations (for inspector)
router.get('/admin/store-recs/:storeId', adminAuth, async (req, res) => {
  try {
    const result = await client.execute({
      sql: `SELECT purpose, budget, extras, created_at FROM recommendations
            WHERE store_id = ? ORDER BY created_at DESC LIMIT 10`,
      args: [req.params.storeId]
    });
    res.json({ success: true, recs: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get store payment history (for inspector)
router.get('/admin/store-payments/:storeId', adminAuth, async (req, res) => {
  try {
    const payments = await paymentDB.getByStore(req.params.storeId);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## A2 — Quick Filters on All Stores tab

**Step 1 — Add filter buttons HTML.** In the stores tab, find the `card-head` of the stores card. After the `<div><h2>Stores</h2>...` block and before the search input, add:

```html
<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
  <button class="btn btn-sm store-filter-btn active" onclick="setStoreFilter('all',this)">All</button>
  <button class="btn btn-sm store-filter-btn" onclick="setStoreFilter('trial',this)">Trial</button>
  <button class="btn btn-sm store-filter-btn" onclick="setStoreFilter('paid',this)">Paid</button>
  <button class="btn btn-sm store-filter-btn" onclick="setStoreFilter('disabled',this)">Disabled</button>
  <button class="btn btn-sm store-filter-btn" onclick="setStoreFilter('woo',this)">WooCommerce</button>
  <button class="btn btn-sm store-filter-btn" onclick="setStoreFilter('noproducts',this)">No Products</button>
</div>
```

**Step 2 — Add filter CSS** inside `<style>`:
```css
.store-filter-btn.active {
  background: var(--accent-light);
  color: var(--accent);
  border-color: var(--accent-border);
}
```

**Step 3 — Add `setStoreFilter` JS function** and update `filterStores`:

Add this variable at the top of the script alongside `allStoresData`:
```js
let _activeStoreFilter = 'all';
```

Add this function before `closeModal`:
```js
function setStoreFilter(filter, btn) {
  _activeStoreFilter = filter;
  document.querySelectorAll('.store-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  filterStores();
}
```

Update the existing `filterStores` function — find the line where it filters by search query and add the filter condition:

```js
function filterStores() {
  const q = document.getElementById('store-search').value.toLowerCase().trim();
  let filtered = allStoresData.filter(s =>
    (s.name || '').toLowerCase().includes(q) ||
    (s.email || '').toLowerCase().includes(q)
  );
  // Apply quick filter
  if (_activeStoreFilter === 'trial')      filtered = filtered.filter(s => s.plan === 'trial');
  if (_activeStoreFilter === 'paid')       filtered = filtered.filter(s => s.plan !== 'trial' && s.plan_status === 'active');
  if (_activeStoreFilter === 'disabled')   filtered = filtered.filter(s => s.plan_status === 'disabled');
  if (_activeStoreFilter === 'woo')        filtered = filtered.filter(s => s.woo_connected == 1);
  if (_activeStoreFilter === 'noproducts') filtered = filtered.filter(s => !s.product_count || s.product_count === 0);
  renderStores(filtered);
}
```

---

## A3 — Export Stores to CSV

**Step 1 — Add Export button** in the stores tab card-head, alongside the search input:

```html
<button class="btn btn-sm" onclick="exportStoresCSV()" style="display:inline-flex;align-items:center;gap:5px;flex-shrink:0;">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  Export CSV
</button>
```

**Step 2 — Add `exportStoresCSV` function** before `closeModal`:

```js
function exportStoresCSV() {
  if (!allStoresData.length) return showToast('No data', 'Load stores first', 'warning');
  const headers = ['Name','Email','Plan','Status','Products','Recs','Joined','Trial Ends','Plan Ends','WooCommerce'];
  const rows = allStoresData.map(s => [
    `"${(s.name||'').replace(/"/g,'""')}"`,
    `"${(s.email||'').replace(/"/g,'""')}"`,
    s.plan || '',
    s.plan_status || '',
    s.product_count || 0,
    s.rec_count || 0,
    s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
    s.trial_ends ? new Date(s.trial_ends).toLocaleDateString() : '',
    s.plan_ends ? new Date(s.plan_ends).toLocaleDateString() : '',
    s.woo_connected ? 'Yes' : 'No'
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `buildbot-stores-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  logActivity('Exported stores CSV', `${allStoresData.length} stores`);
}
```

---

## A4 — Pending Payment Timer

In `loadPayments`, in the pending table rows, find where the `Date` column is rendered. Change the date cell from:

```js
<td>${new Date(p.created_at).toLocaleDateString()}</td>
```

to:

```js
<td>
  <div style="font-size:12px;color:var(--text);">${new Date(p.created_at).toLocaleDateString()}</div>
  <div style="font-size:11px;margin-top:2px;font-weight:600;color:${getPaymentAge(p.created_at) >= 6 ? 'var(--danger)' : getPaymentAge(p.created_at) >= 2 ? 'var(--warning)' : 'var(--muted)'};">
    ${getPaymentAge(p.created_at)}h waiting
  </div>
</td>
```

Add `getPaymentAge` helper function before `closeModal`:
```js
function getPaymentAge(createdAt) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000);
}
```

---

## A5 — Maintenance Mode Banner in nav

Find the `<nav>` HTML. After the `<span id="pending-badge">` span, add:

```html
<div id="maintenance-banner" style="display:none;background:var(--danger);color:#fff;font-size:12px;font-weight:600;padding:4px 12px;border-radius:6px;margin-left:12px;display:none;align-items:center;gap:6px;">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  MAINTENANCE MODE ON
</div>
```

In `loadPlatformConfig`, after setting the maintenance toggle value, add:
```js
const banner = document.getElementById('maintenance-banner');
if (banner) banner.style.display = (c.maintenance_mode === 'true') ? 'inline-flex' : 'none';
```

In `savePlatformConfig`, after a successful save, add:
```js
const banner = document.getElementById('maintenance-banner');
if (banner) banner.style.display = (config.maintenance_mode === 'true') ? 'inline-flex' : 'none';
```

---

# PART B — `dashboard/dashboard.html`

---

## B1 — Sidebar Redesign

**What's wrong with the current sidebar:**
- The top `<nav>` bar duplicates the logo that's already in the sidebar header — shows "BuildBot" twice
- The top nav `Logout` button and the sidebar footer logout link both exist — confusing
- `tab-billing` and `tab-account` and `tab-help` use `id="tab-X"` for the sidebar item but the content divs use `id="tab-content-X"` — the `showTab` function calls `document.getElementById('tab-'+name)` to add `active` class. This means the sidebar item AND content div share the same prefix but the content lookup uses `tab-content-`. This is fine but the Help tab uses `id="tab-help"` — verify it exists and has a matching `id="tab-content-help"`.
- No section labels grouping items visually
- Sidebar item active state not obvious enough
- No recommendation history tab

**Step 1 — Replace the sidebar CSS rules.** Find all these existing rules and replace them entirely:

```css
/* ── SIDEBAR ── */
.sidebar {
  width: 220px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: calc(100vh - 52px);
  position: sticky;
  top: 52px;
  overflow-y: auto;
}
.sidebar-header {
  padding: 16px 14px 10px;
  display: flex;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.sidebar-logo-mark {
  width: 26px;
  height: 26px;
  background: var(--accent);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sidebar-logo-mark svg {
  width: 13px;
  height: 13px;
  stroke: #fff;
  fill: none;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.sidebar-logo-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.2px;
}
.sidebar-nav {
  flex: 1;
  padding: 10px 10px 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sidebar-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dim);
  padding: 12px 8px 5px;
  user-select: none;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: var(--r-md);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  position: relative;
  text-decoration: none;
}
.sidebar-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.sidebar-item:hover {
  background: var(--surface-2);
  color: var(--text-2);
}
.sidebar-item.active {
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}
.sidebar-item.active svg { stroke: var(--accent); }
.sidebar-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warning);
  margin-left: auto;
  flex-shrink: 0;
  animation: blink 1.4s infinite;
}
@keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
.sidebar-divider {
  height: 1px;
  background: var(--border);
  margin: 8px 8px;
}
.sidebar-footer {
  padding: 10px 10px 14px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.sidebar-user {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  margin-bottom: 2px;
}
.sidebar-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sidebar-user-email {
  font-size: 11px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
```

**Step 2 — Add "Recommendation History" sidebar item.** Find the sidebar nav items. After the Analytics item and before the sidebar-divider, add:

```html
<div
  class="sidebar-item"
  onclick="showTab('history')"
  id="tab-history"
>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
  Rec History
</div>
```

**Step 3 — Add Recommendation History tab content HTML.** Find the closing `</div>` of `#tab-content-analytics`. Add this new tab div directly after it:

```html
<!-- ── REC HISTORY TAB ── -->
<div id="tab-content-history" style="display:none;">
  <div class="section-title">Recommendation History</div>
  <div class="section-sub">All AI PC builds generated for your customers. Paginated — newest first.</div>
  <div class="card" style="margin-bottom:16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;gap:8px;">
        <input type="text" id="rec-history-search" placeholder="Filter by purpose…" style="width:200px;" oninput="filterRecHistory()"/>
      </div>
      <span style="font-size:12px;color:var(--muted);" id="rec-history-count">—</span>
    </div>
    <div style="overflow-x:auto;">
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Budget (PKR)</th>
            <th>Extras</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody id="rec-history-table">
          <tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">Loading…</td></tr>
        </tbody>
      </table>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;flex-wrap:wrap;gap:10px;">
      <button class="btn btn-sm" id="rec-history-prev" onclick="recHistoryPage(-1)" disabled>← Previous</button>
      <span style="font-size:12px;color:var(--muted);" id="rec-history-page-info">Page 1</span>
      <button class="btn btn-sm" id="rec-history-next" onclick="recHistoryPage(1)">Next →</button>
    </div>
  </div>
</div>
```

**Step 4 — Add Rec History JS.** Add these before the closing `</script>` tag in `dashboard.html`:

```js
// ─── REC HISTORY ──────────────────────────────────────────
let _allRecs = [];
let _filteredRecs = [];
let _recPage = 1;
const REC_PAGE_SIZE = 20;

async function loadRecHistory() {
  const tbody = document.getElementById('rec-history-table');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">Loading…</td></tr>';
  try {
    const res = await fetch(`${API}/analytics`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    _allRecs = (data.stats?.recent || []);
    // For full history, use a dedicated endpoint if available — fallback to recent
    _filteredRecs = [..._allRecs];
    _recPage = 1;
    renderRecHistory();
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--danger);padding:24px;">Could not load history.</td></tr>';
  }
}

function filterRecHistory() {
  const q = (document.getElementById('rec-history-search')?.value || '').toLowerCase().trim();
  _filteredRecs = q ? _allRecs.filter(r => (r.purpose || '').toLowerCase().includes(q)) : [..._allRecs];
  _recPage = 1;
  renderRecHistory();
}

function recHistoryPage(dir) {
  const totalPages = Math.ceil(_filteredRecs.length / REC_PAGE_SIZE);
  _recPage = Math.max(1, Math.min(totalPages, _recPage + dir));
  renderRecHistory();
}

function renderRecHistory() {
  const tbody = document.getElementById('rec-history-table');
  const countEl = document.getElementById('rec-history-count');
  const pageEl = document.getElementById('rec-history-page-info');
  const prevBtn = document.getElementById('rec-history-prev');
  const nextBtn = document.getElementById('rec-history-next');
  if (!tbody) return;

  const totalPages = Math.max(1, Math.ceil(_filteredRecs.length / REC_PAGE_SIZE));
  const start = (_recPage - 1) * REC_PAGE_SIZE;
  const page = _filteredRecs.slice(start, start + REC_PAGE_SIZE);

  if (countEl) countEl.textContent = `${_filteredRecs.length} recommendation${_filteredRecs.length !== 1 ? 's' : ''}`;
  if (pageEl) pageEl.textContent = `Page ${_recPage} of ${totalPages}`;
  if (prevBtn) prevBtn.disabled = _recPage === 1;
  if (nextBtn) nextBtn.disabled = _recPage >= totalPages;

  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">No recommendations yet.</td></tr>';
    return;
  }
  tbody.innerHTML = page.map(r => `
    <tr>
      <td style="font-weight:500;">${escHtml(r.purpose || '—')}</td>
      <td>Rs ${Number(r.budget).toLocaleString()}</td>
      <td style="color:var(--muted);font-size:12px;">${escHtml(r.extras || '—')}</td>
      <td style="white-space:nowrap;font-size:12px;color:var(--muted);">${new Date(r.created_at).toLocaleDateString()}</td>
    </tr>`).join('');
}
```

**Step 5 — Wire `showTab` for history.** In `showTab`, find:
```js
if (name === "analytics") loadAnalytics();
```
Add after it:
```js
if (name === "history") loadRecHistory();
```

Also add `'history'` to the tabs array used in `showTab` if there is one, so `tab-content-history` gets hidden when switching away.

---

## B2 — Analytics Date Range Filter (wire the buttons)

The buttons already exist (`analytics-range-7`, `analytics-range-30`, `analytics-range-all`) and call `setAnalyticsRange`. The `setAnalyticsRange` function already exists and works. The variable `currentAnalyticsDays` is used in `loadAnalytics`. **This is already wired and working.**

The only fix needed: the "Last 7 days" button doesn't start with the `range-btn-active` class visually. Find:
```html
<button class="btn btn-sm analytics-range-btn" id="analytics-range-7" onclick="setAnalyticsRange(7, this)">Last 7 days</button>
```
Change to:
```html
<button class="btn btn-sm analytics-range-btn range-btn-active" id="analytics-range-7" onclick="setAnalyticsRange(7, this)">Last 7 days</button>
```

---

## B3 — Plan Expiry Countdown on Billing tab

Find in `#tab-content-billing` the existing "Trial countdown" card. It has `id="billing-trial-note"`. Update `updateBillingTrialNote` function — find it and add expiry display for paid plans:

```js
function updateBillingTrialNote() {
  const el = document.getElementById('billing-trial-note');
  if (!el || !currentStore) return;

  const plan = currentStore.plan;
  const planStatus = currentStore.planStatus;
  const trialEnds = currentStore.trialEnds || currentStore.trial_ends;
  const planEnds = currentStore.planEnds || currentStore.plan_ends;

  if (plan === 'trial') {
    const ends = new Date(trialEnds);
    const daysLeft = Math.ceil((ends - new Date()) / 86400000);
    if (daysLeft > 0) {
      el.innerHTML = `Your free trial ends in <strong style="color:var(--warning);">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on <strong>${ends.toLocaleDateString()}</strong>. Upgrade to keep your widget running.`;
    } else {
      el.innerHTML = `<span style="color:var(--danger);font-weight:600;">Your trial has expired.</span> Upgrade now to reactivate your widget.`;
    }
  } else if (planEnds) {
    const ends = new Date(planEnds);
    const daysLeft = Math.ceil((ends - new Date()) / 86400000);
    if (daysLeft > 0) {
      const urgency = daysLeft <= 7 ? 'var(--danger)' : daysLeft <= 14 ? 'var(--warning)' : 'var(--success)';
      el.innerHTML = `Your <strong>${plan}</strong> plan renews/expires in <strong style="color:${urgency};">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on <strong>${ends.toLocaleDateString()}</strong>.`;
    } else {
      el.innerHTML = `<span style="color:var(--danger);font-weight:600;">Your ${plan} plan has lapsed.</span> Resubmit payment to restore access.`;
    }
  } else {
    el.textContent = `You are on the ${plan} plan.`;
  }
}
```

Also update the trial chip in the top nav. Find where `trial-chip-top` is set and add days countdown:

In the `enterApp` or `window.onload` section where store data is populated, find where `trial-chip-top` is set. Change it to:

```js
const chipEl = document.getElementById('trial-chip-top');
if (chipEl && currentStore) {
  const plan = currentStore.plan;
  if (plan === 'trial') {
    const ends = new Date(currentStore.trialEnds || currentStore.trial_ends);
    const daysLeft = Math.ceil((ends - new Date()) / 86400000);
    chipEl.textContent = daysLeft > 0 ? `Trial: ${daysLeft}d left` : 'Trial expired';
    chipEl.style.background = daysLeft <= 3 ? 'var(--danger)' : 'var(--warning-bg)';
    chipEl.style.color = daysLeft <= 3 ? '#fff' : 'var(--warning)';
    chipEl.style.display = 'inline-block';
  } else {
    chipEl.style.display = 'none';
  }
}
```

---

## B4 — Widget Preview — Real-time color update on input change

The widget settings tab already has a `#widget-preview-btn` div and a `updateWidgetPreview` function. The color input is `#brand-color-hex`. Wire real-time preview:

Find the brand color input (`id="brand-color-hex"`). It likely has an `onchange` or `oninput` handler. If it doesn't have `oninput`, add it:

```html
oninput="updateWidgetPreview()"
```

Find `updateWidgetPreview` function. Ensure it updates the preview button color:

```js
function updateWidgetPreview() {
  const colorInput = document.getElementById('brand-color-hex');
  const titleInput = document.getElementById('widget-title-input');
  const previewBtn = document.getElementById('widget-preview-btn');
  const previewTitle = document.getElementById('preview-title');
  if (colorInput && previewBtn) {
    previewBtn.style.background = colorInput.value || 'var(--accent)';
    previewBtn.style.boxShadow = `0 4px 16px ${colorInput.value || '#7c6af7'}40`;
  }
  if (titleInput && previewTitle) {
    previewTitle.textContent = titleInput.value || 'BuildBot';
  }
}
```

Also add `oninput="updateWidgetPreview()"` to `#widget-title-input` so the preview title updates live too.

---

**After making all changes, verify:**
1. No duplicate element IDs have been introduced
2. The `showTab` function in `dashboard.html` properly hides `tab-content-history` when switching away — this works because `querySelectorAll('[id^="tab-content-"]')` hides all content divs including the new one
3. The `escHtml` function is used in `dashboard.html` (confirmed — it exists) — use it in all new HTML rendering
4. In `admin.html`, the inspector overlay close button and ESC key both work
5. The `badge-muted` class is used in the inspector products list — verify it exists in admin.html CSS (`badge-muted { background: var(--surface-2); color: var(--muted); border: 1px solid var(--border); }`) — add it if missing

**Do not change any existing server routes, DB methods, CSS variables, or anything not explicitly listed above.**
