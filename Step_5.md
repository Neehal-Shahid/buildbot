## CHUNK 5 — `dashboard/admin.html`

**File to edit:** `dashboard/admin.html` only.

**Step 1 — Add a "Manage" button and "View Catalog" button to each store row in `renderStores`.**

In `renderStores`, find the actions `<td>` that contains the existing three `.action-btn` buttons (activate, disable, delete). Add these two new buttons inside the same `<div style="display:flex;...">`, after the existing three:

```js
<button class="action-btn" data-tip="View catalog"
  style="background:var(--surface-2);color:var(--muted);border-color:var(--border);"
  onmouseover="this.style.background='var(--text)';this.style.color='#fff';"
  onmouseout="this.style.background='var(--surface-2)';this.style.color='var(--muted)';"
  onclick="viewStoreProducts('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
</button>
<button class="action-btn" data-tip="Manage store"
  style="background:var(--accent-light);color:var(--accent);border-color:var(--accent-border);"
  onmouseover="this.style.background='var(--accent)';this.style.color='#fff';"
  onmouseout="this.style.background='var(--accent-light)';this.style.color='var(--accent)';"
  onclick="openManageStore('${safeText(s.store_id)}','${encodeURIComponent(s.name)}','${safeText(s.plan)}','${safeText(s.plan_status)}','${encodeURIComponent(s.admin_notes||'')}')">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
</button>
```

**Step 2 — Add "Broadcast" button to the overview tab.**

In the overview tab HTML, find the `card-head` of the "Recently Joined Stores" card. It has an `<h2>` and a `<div class="card-sub">`. Add a button in that `card-head` div alongside them:

```html
<button class="btn btn-sm" onclick="document.getElementById('broadcast-modal').classList.add('open')" style="display:inline-flex;align-items:center;gap:5px;">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
  Broadcast
</button>
```

**Step 3 — Add "Run Drip" button to the stores tab.**

In the stores tab HTML, find the `card-head` of the stores card (the one with the `#store-search` input). Add this button alongside the search input:

```html
<button class="btn btn-sm" onclick="runDripNow(this)" style="display:inline-flex;align-items:center;gap:5px;">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
  Run Drip
</button>
```

**Step 4 — Add all three new modals to the HTML.**

Add this HTML block directly before the `<!-- TOAST CONTAINER -->` comment. Do not replace any existing modals:

```html
<!-- MANAGE STORE MODAL -->
<div class="modal-bg" id="manage-modal">
  <div class="modal" style="max-width:520px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--muted);margin-bottom:4px;">Store Management</div>
        <h3 style="margin:0;" id="manage-store-title">Store</h3>
      </div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>

    <div style="margin-bottom:14px;padding:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Change Plan</div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <select id="manage-plan-select" style="flex:1;">
          <option value="trial">Trial</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
        </select>
        <select id="manage-status-select" style="flex:1;">
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      <button class="btn btn-primary btn-sm" id="manage-plan-btn" onclick="submitPlanChange()" style="width:100%;justify-content:center;">Save Plan</button>
    </div>

    <div style="margin-bottom:14px;padding:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Extend Trial</div>
      <div style="display:flex;gap:8px;">
        <select id="manage-trial-days" style="flex:1;">
          <option value="3">+ 3 days</option>
          <option value="7">+ 7 days</option>
          <option value="14">+ 14 days</option>
          <option value="30">+ 30 days</option>
        </select>
        <button class="btn btn-warning btn-sm" id="manage-trial-btn" onclick="submitTrialExtend()">Extend</button>
      </div>
    </div>

    <div style="margin-bottom:14px;padding:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Send Email to Store</div>
      <input type="text" id="manage-email-subject" placeholder="Subject line" style="margin-bottom:8px;"/>
      <textarea id="manage-email-body" placeholder="Message to store owner…" rows="3" style="width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-md);color:var(--text);font-size:13px;resize:vertical;font-family:inherit;outline:none;box-sizing:border-box;"></textarea>
      <button class="btn btn-primary btn-sm" id="manage-email-btn" onclick="submitManualEmail()" style="width:100%;justify-content:center;margin-top:8px;">Send Email</button>
    </div>

    <div style="padding:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">Internal Notes</div>
      <textarea id="manage-notes" placeholder="Private notes (not visible to store owner)…" rows="3" style="width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-md);color:var(--text);font-size:13px;resize:vertical;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:8px;"></textarea>
      <button class="btn btn-sm" id="manage-notes-btn" onclick="submitNotes()" style="width:100%;justify-content:center;">Save Notes</button>
    </div>

    <div class="alert" id="manage-alert" style="margin-top:12px;"></div>
  </div>
</div>

<!-- VIEW PRODUCTS MODAL -->
<div class="modal-bg" id="products-modal">
  <div class="modal" style="max-width:640px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 id="products-modal-title">Product Catalog</h3>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div style="overflow-x:auto;max-height:440px;overflow-y:auto;">
      <table>
        <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead>
        <tbody id="products-modal-table"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- BROADCAST MODAL -->
<div class="modal-bg" id="broadcast-modal">
  <div class="modal" style="max-width:520px;">
    <div class="modal-icon" style="background:var(--accent-light);color:var(--accent);">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
    </div>
    <h3>Broadcast Email</h3>
    <p>Send an email to all active stores or filter by plan.</p>
    <div class="form-group">
      <label class="form-label">Target Audience</label>
      <select id="broadcast-target">
        <option value="">All active stores</option>
        <option value="trial">Trial stores only</option>
        <option value="starter">Starter plan only</option>
        <option value="growth">Growth plan only</option>
        <option value="pro">Pro plan only</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Subject</label>
      <input type="text" id="broadcast-subject" placeholder="Email subject line"/>
    </div>
    <div class="form-group">
      <label class="form-label">Message</label>
      <textarea id="broadcast-body" rows="5" placeholder="Your message to stores…" style="width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-md);color:var(--text);font-size:13px;resize:vertical;font-family:inherit;outline:none;box-sizing:border-box;"></textarea>
    </div>
    <div class="modal-btns">
      <button class="btn btn-primary" id="broadcast-confirm-btn" onclick="submitBroadcast()">Send Broadcast</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>
    <div class="alert" id="broadcast-alert" style="margin-top:12px;"></div>
  </div>
</div>
```

**Step 5 — Add all new JavaScript functions.**

Add these functions inside the `<script>` block, directly before the closing `</script>` tag. Do not modify any existing function:

```js
// ─── MANAGE STORE ──────────────────────────────────────────
let _managingStoreId = null;

function openManageStore(storeId, name, plan, planStatus, notes) {
  _managingStoreId = storeId;
  document.getElementById('manage-store-title').textContent = decodeURIComponent(name || '');
  document.getElementById('manage-plan-select').value = plan || 'trial';
  document.getElementById('manage-status-select').value = planStatus || 'active';
  document.getElementById('manage-notes').value = decodeURIComponent(notes || '');
  document.getElementById('manage-email-subject').value = '';
  document.getElementById('manage-email-body').value = '';
  const alertEl = document.getElementById('manage-alert');
  if (alertEl) alertEl.className = 'alert';
  document.getElementById('manage-modal').classList.add('open');
}

async function submitPlanChange() {
  if (!_managingStoreId) return;
  const plan = document.getElementById('manage-plan-select').value;
  const planStatus = document.getElementById('manage-status-select').value;
  const btn = document.getElementById('manage-plan-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/set-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: _managingStoreId, plan, planStatus })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('manage-alert', `Plan updated to ${plan} (${planStatus})`, 'success');
      loadStores();
      loadOverview();
    } else {
      showAlert('manage-alert', data.error || 'Failed to update plan', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('manage-alert', 'Server error', 'error');
  }
}

async function submitTrialExtend() {
  if (!_managingStoreId) return;
  const days = document.getElementById('manage-trial-days').value;
  const btn = document.getElementById('manage-trial-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/extend-trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: _managingStoreId, days: Number(days) })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('manage-alert', `Trial extended by ${days} days`, 'success');
      loadStores();
    } else {
      showAlert('manage-alert', data.error || 'Failed to extend trial', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('manage-alert', 'Server error', 'error');
  }
}

async function submitManualEmail() {
  if (!_managingStoreId) return;
  const subject = document.getElementById('manage-email-subject').value.trim();
  const message = document.getElementById('manage-email-body').value.trim();
  if (!subject || !message) return showAlert('manage-alert', 'Subject and message required', 'error');
  const btn = document.getElementById('manage-email-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: _managingStoreId, subject, message })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('manage-alert', 'Email sent successfully', 'success');
      document.getElementById('manage-email-subject').value = '';
      document.getElementById('manage-email-body').value = '';
    } else {
      showAlert('manage-alert', data.error || 'Failed to send email', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('manage-alert', 'Server error', 'error');
  }
}

async function submitNotes() {
  if (!_managingStoreId) return;
  const notes = document.getElementById('manage-notes').value.trim();
  const btn = document.getElementById('manage-notes-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/save-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: _managingStoreId, notes })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) showAlert('manage-alert', 'Notes saved', 'success');
    else showAlert('manage-alert', data.error || 'Failed to save notes', 'error');
  } catch {
    setBtnLoading(btn, false);
    showAlert('manage-alert', 'Server error', 'error');
  }
}

// ─── VIEW STORE PRODUCTS ───────────────────────────────────
async function viewStoreProducts(storeId, name) {
  document.getElementById('products-modal-title').textContent =
    `${decodeURIComponent(name || '')} — Catalog`;
  document.getElementById('products-modal-table').innerHTML =
    `<tr class="table-loading"><td colspan="4">Loading catalog…</td></tr>`;
  document.getElementById('products-modal').classList.add('open');
  try {
    const res = await fetch(`${API}/admin/store-products/${storeId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('products-modal-table').innerHTML =
        data.products.length > 0
        ? data.products.map(p => `
          <tr>
            <td>${safeText(p.name)}</td>
            <td><span class="badge badge-muted">${safeText(p.category)}</span></td>
            <td>Rs ${Number(p.price).toLocaleString()}</td>
            <td><span class="badge ${p.in_stock ? 'badge-success' : 'badge-danger'}">${p.in_stock ? 'In stock' : 'Out of stock'}</span></td>
          </tr>`).join('')
        : `<tr><td colspan="4" class="table-empty">No products in catalog yet.</td></tr>`;
    } else {
      document.getElementById('products-modal-table').innerHTML =
        `<tr><td colspan="4" class="table-empty">Failed to load catalog.</td></tr>`;
    }
  } catch {
    document.getElementById('products-modal-table').innerHTML =
      `<tr><td colspan="4" class="table-empty">Could not connect to server.</td></tr>`;
  }
}

// ─── BROADCAST ────────────────────────────────────────────
async function submitBroadcast() {
  const subject = document.getElementById('broadcast-subject').value.trim();
  const message = document.getElementById('broadcast-body').value.trim();
  const targetPlan = document.getElementById('broadcast-target').value;
  if (!subject || !message)
    return showAlert('broadcast-alert', 'Subject and message are required', 'error');
  const btn = document.getElementById('broadcast-confirm-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ subject, message, targetPlan: targetPlan || undefined })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('broadcast-alert', data.message, 'success');
      document.getElementById('broadcast-subject').value = '';
      document.getElementById('broadcast-body').value = '';
    } else {
      showAlert('broadcast-alert', data.error || 'Broadcast failed', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('broadcast-alert', 'Server error', 'error');
  }
}

// ─── RUN DRIP MANUALLY ────────────────────────────────────
async function runDripNow(btn) {
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/run-drip`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      const r = data.results;
      showToast(
        'Drip emails sent',
        `Trial warnings: ${r.trialWarnings} · Onboarding: ${r.onboarding} · Dunning: ${r.dunning} · Stale alerts: ${r.stalePayments}`,
        'success'
      );
    } else {
      showToast('Drip failed', data.error || 'Something went wrong', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showToast('Error', 'Could not connect to server', 'error');
  }
}
