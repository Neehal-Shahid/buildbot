File to edit: dashboard/admin.html only. Do not touch any server files, CSS variables, HTML structure, or anything not explicitly listed. Make changes in the exact order below.

Fix 1 — Login spinner never resets on success
In adminLogin, find:
jsif (data.success) {
  adminToken = data.token;
  localStorage.setItem('bb_admin_token', adminToken);
  enterAdmin();
}
Replace with:
jsif (data.success) {
  adminToken = data.token;
  localStorage.setItem('bb_admin_token', adminToken);
  setBtnLoading(btn, false);
  enterAdmin();
}

Fix 2 — Add missing badge-primary CSS class
In the <style> block, find the badge CSS rules section. It has badge-success, badge-warning, badge-danger, badge-accent, badge-muted. Add this missing rule alongside them:
css.badge-primary { background: var(--accent-light); color: var(--accent); }

Fix 3 — Remove emojis from openApprove modal details
Find the entire openApprove function and replace only the approve-details innerHTML assignment:
jsdocument.getElementById('approve-details').innerHTML = `
  <div>🏪 Store: <strong>${safeText(decodedName)}</strong></div>
  <div>📋 Plan: <strong>${safeText(plan)}</strong></div>
  <div>💰 Amount: <strong>Rs ${Number(amount).toLocaleString()}</strong></div>
`;
Replace with:
jsdocument.getElementById('approve-details').innerHTML = `
  <div style="margin-bottom:8px;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:3px;">Store</div>
    <strong style="color:var(--text);font-size:14px;">${safeText(decodedName)}</strong>
  </div>
  <div style="margin-bottom:8px;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:3px;">Plan</div>
    <strong style="color:var(--text);font-size:14px;">${safeText(plan)}</strong>
  </div>
  <div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:3px;">Amount</div>
    <strong style="color:var(--text);font-size:14px;">Rs ${Number(amount).toLocaleString()}</strong>
  </div>
`;

Fix 4 — Remove emoji from openDisable modal details
Find inside openDisable:
jsdocument.getElementById('disable-details').innerHTML =
  `🏪 Store: <strong>${safeText(decodedName)}</strong> (${safeText(storeId)})`;
Replace with:
jsdocument.getElementById('disable-details').innerHTML = `
  <div style="margin-bottom:4px;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:3px;">Store</div>
    <strong style="color:var(--text);font-size:14px;">${safeText(decodedName)}</strong>
  </div>
  <div style="font-size:12px;color:var(--muted);margin-top:4px;">${safeText(storeId)}</div>
`;

Fix 5 — Replace emoji buttons in payments table (both pending tables)
There are two places where Approve and Reject buttons appear with emojis — one in loadOverview (the pending alert card) and one in loadPayments (the payments tab). Fix both.
In loadOverview, find the pending payments table rows. Find the Approve button:
js<button class="btn btn-success btn-sm"
  onclick="openApprove(${p.id},'${safeText(p.store_id)}','${safeText(p.plan)}','${encodeURIComponent(p.name)}',${p.amount})">
  ✅ Approve
</button>
Replace with:
js<button class="btn btn-success btn-sm" style="display:inline-flex;align-items:center;gap:5px;"
  onclick="openApprove(${p.id},'${safeText(p.store_id)}','${safeText(p.plan)}','${encodeURIComponent(p.name)}',${p.amount})">
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  Approve
</button>
In loadPayments, find the two buttons in the pending table rows:
js<button class="btn btn-success btn-sm"
  onclick="openApprove(${p.id},'${safeText(p.store_id)}','${safeText(p.plan)}','${encodeURIComponent(p.name)}',${p.amount})">
  ✅ Approve
</button>
<button class="btn btn-danger btn-sm"
  onclick="rejectPayment(${p.id}, '${safeText(p.store_id)}', '${safeText(p.plan)}')">
  ❌ Reject
</button>
Replace with:
js<button class="btn btn-success btn-sm" style="display:inline-flex;align-items:center;gap:5px;"
  onclick="openApprove(${p.id},'${safeText(p.store_id)}','${safeText(p.plan)}','${encodeURIComponent(p.name)}',${p.amount})">
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  Approve
</button>
<button class="btn btn-danger btn-sm" style="display:inline-flex;align-items:center;gap:5px;"
  onclick="rejectPayment(${p.id}, '${safeText(p.store_id)}', '${safeText(p.plan)}')">
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  Reject
</button>

Fix 6 — Remove emoji from empty state in payments table
In loadPayments, find:
js`<tr><td colspan="8" class="table-empty">No pending payments 🎉</td></tr>`
Replace with:
js`<tr><td colspan="8" class="table-empty">No pending payments — all clear.</td></tr>`

Fix 7 — Add confirmation modal before activateStore
Currently activateStore fires immediately on button click with no confirmation. Replace the entire activateStore function with:
jsfunction activateStore(storeId, name) {
  pendingAction = { storeId };
  const decodedName = decodeURIComponent(name || '');
  document.getElementById('activate-details').innerHTML = `
    <div style="margin-bottom:4px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:3px;">Store</div>
      <strong style="color:var(--text);font-size:14px;">${safeText(decodedName)}</strong>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:4px;">${safeText(storeId)}</div>
  `;
  document.getElementById('activate-modal').classList.add('open');
}

async function confirmActivate() {
  if (!pendingAction) return;
  const btn = document.getElementById('activate-confirm-btn');
  setBtnLoading(btn, true);
  try {
    await fetch(`${API}/admin/activate-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: pendingAction.storeId })
    });
    setBtnLoading(btn, false);
    closeModal();
    showToast('Store activated', 'The store widget has been re-enabled.', 'success');
    loadStores();
    loadOverview();
  } catch {
    setBtnLoading(btn, false);
    showToast('Error', 'Could not activate store.', 'error');
  }
}
Also update the Activate button in renderStores — change the onclick from:
jsonclick="activateStore('${safeText(s.store_id)}','${safeText(s.plan)}')"
to:
jsonclick="activateStore('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')"
Then add the activate modal HTML directly after the disable modal closing </div> in the HTML, before the delete modal:
html<!-- ACTIVATE MODAL -->
<div class="modal-bg" id="activate-modal">
  <div class="modal">
    <div class="modal-icon" style="background:var(--accent-light);color:var(--accent);">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
    </div>
    <h3>Activate Store</h3>
    <p>This will re-enable the store's widget. Their customers will be able to get recommendations again.</p>
    <div class="modal-detail" id="activate-details"></div>
    <div class="modal-btns">
      <button class="btn btn-primary" id="activate-confirm-btn" onclick="confirmActivate()">Activate Store</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>
  </div>
</div>

Fix 8 — Add table loading states
Add this CSS inside the <style> block, before the @media rule:
css.table-loading td {
  color: var(--dim);
  font-size: 13px;
  text-align: center;
  padding: 28px;
}
.skeleton-row td {
  padding: 12px 14px;
}
.skeleton-cell {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
In loadStores, add a loading row before the fetch:
jsasync function loadStores() {
  document.getElementById('stores-table').innerHTML =
    `<tr class="table-loading"><td colspan="8">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:6px;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
      Loading stores…
    </td></tr>`;
  try {
    // ... rest of existing function unchanged
In loadPayments, add the same pattern before the fetch:
jsasync function loadPayments() {
  document.getElementById('pending-table').innerHTML =
    `<tr class="table-loading"><td colspan="8">Loading payments…</td></tr>`;
  document.getElementById('all-payments-table').innerHTML =
    `<tr class="table-loading"><td colspan="7">Loading payment history…</td></tr>`;
  try {
    // ... rest of existing function unchanged

Fix 9 — Cache overview data to avoid double API call
At the top of the <script> block, after let pendingAction = null;, add:
jslet _overviewCache = null;
Replace loadPlatformAnalytics so it uses cached data when available instead of calling /admin/overview again:
jsasync function loadPlatformAnalytics() {
  try {
    // Use cached overview data if available, otherwise fetch
    let data = _overviewCache;
    if (!data) {
      const res = await fetch(`${API}/admin/overview`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      data = await res.json();
      _overviewCache = data;
    }
    if (!data.success && handleAdminAuthError(data)) return;
    if (!data.success) return;
    // ... rest of existing function body unchanged
In loadOverview, after const data = await res.json(); and before if (!data.success...:
js_overviewCache = data; // cache for analytics tab
Also clear the cache on logout so stale data doesn't persist across sessions. In adminLogout, add:
js_overviewCache = null;

Do not change anything else. No other CSS, no other functions, no HTML outside what is explicitly specified above. Read the entire file before starting. Make changes one at a time and verify each one compiles before moving to the next.