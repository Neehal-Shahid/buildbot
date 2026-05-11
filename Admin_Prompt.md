File: dashboard/admin.html only. Make exactly these changes in order. Do not touch anything else.

Change 1 — Add a setBtnLoading helper function
This is a shared utility used by all buttons. Add it inside the <script> block, right before the showAlert function at the bottom:
jsfunction setBtnLoading(btn, loading, originalHTML) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.7s linear infinite;flex-shrink:0;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`;
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';
  } else {
    btn.innerHTML = originalHTML || btn.dataset.originalHtml || btn.innerHTML;
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
  }
}
Also add the spin keyframe CSS inside the <style> block, directly before the @media(max-width: 768px) rule:
css@keyframes spin { 100% { transform: rotate(360deg); } }

Change 2 — Add loading state to adminLogin
Replace the entire adminLogin function with:
jsasync function adminLogin() {
  const email    = document.getElementById('adm-email').value.trim();
  const password = document.getElementById('adm-password').value;
  const btn = document.querySelector('#login-form-box .btn-primary');
  setBtnLoading(btn, true);

  try {
    const res  = await fetch(`${API}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      adminToken = data.token;
      localStorage.setItem('bb_admin_token', adminToken);
      enterAdmin();
    } else {
      setBtnLoading(btn, false);
      showAlert('adm-login-alert', data.error, 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('adm-login-alert', 'Cannot connect to server.', 'error');
  }
}

Change 3 — Add loading state to adminForgotPassword
Replace the entire adminForgotPassword function with:
jsasync function adminForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) return showAlert('forgot-alert', 'Email is required', 'error');
  const btn = document.querySelector('#forgot-form-box .btn-primary');
  setBtnLoading(btn, true);

  try {
    const res = await fetch(`${API}/admin/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) showAlert('forgot-alert', data.message, 'success');
    else showAlert('forgot-alert', data.error, 'error');
  } catch {
    setBtnLoading(btn, false);
    showAlert('forgot-alert', 'Server error', 'error');
  }
}

Change 4 — Add loading state to adminResetPassword
Replace the entire adminResetPassword function with:
jsasync function adminResetPassword() {
  const password = document.getElementById('reset-password').value;
  if (!password) return showAlert('reset-alert', 'Password is required', 'error');
  const btn = document.querySelector('#reset-form-box .btn-primary');
  setBtnLoading(btn, true);

  try {
    const res = await fetch(`${API}/admin/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: window.resetTokenVal, password })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('reset-alert', 'Password reset! Redirecting to login…', 'success');
      setTimeout(() => window.location.href = 'admin.html', 2000);
    } else {
      showAlert('reset-alert', data.error, 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('reset-alert', 'Server error', 'error');
  }
}

Change 5 — Add loading state to saveAdminProfile
Replace the entire saveAdminProfile function with:
jsasync function saveAdminProfile() {
  const name  = document.getElementById('prof-name').value.trim();
  const email = document.getElementById('prof-email').value.trim();
  const btn   = document.querySelector('#tab-settings .card:first-child .btn-primary');
  setBtnLoading(btn, true);

  try {
    const res = await fetch(`${API}/admin/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name, email })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) showAlert('prof-alert', 'Profile saved successfully!', 'success');
    else showAlert('prof-alert', data.error, 'error');
  } catch {
    setBtnLoading(btn, false);
    showAlert('prof-alert', 'Server error', 'error');
  }
}

Change 6 — Add loading state to saveAdminPassword
Replace the entire saveAdminPassword function with:
jsasync function saveAdminPassword() {
  const currentPassword = document.getElementById('cp-current').value;
  const newPassword     = document.getElementById('cp-new').value;
  const btn             = document.querySelector('#tab-settings .card:last-child .btn-primary');
  setBtnLoading(btn, true);

  try {
    const res = await fetch(`${API}/admin/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('cp-alert', 'Password changed successfully!', 'success');
      document.getElementById('cp-current').value = '';
      document.getElementById('cp-new').value     = '';
    } else {
      showAlert('cp-alert', data.error, 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('cp-alert', 'Server error', 'error');
  }
}

Change 7 — Add loading state to confirmApprove
The approve button is inside the modal HTML. First give it an ID — in the approve modal HTML, find the "Approve & Activate" button and add id="approve-confirm-btn" to it:
html<button class="btn btn-success" id="approve-confirm-btn" onclick="confirmApprove()">Approve & Activate</button>
Then replace the entire confirmApprove function with:
jsasync function confirmApprove() {
  if (!pendingAction) return;
  const btn = document.getElementById('approve-confirm-btn');
  setBtnLoading(btn, true);

  try {
    const res = await fetch(`${API}/admin/approve-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify(pendingAction)
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    closeModal();
    if (data.success) {
      showToast('Payment approved', 'Store plan activated and email sent.', 'success');
      loadOverview();
      loadPayments();
    } else {
      showToast('Approval failed', data.error || 'Something went wrong.', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showToast('Error', 'Could not connect to server.', 'error');
  }
}

Change 8 — Add loading state to confirmDisable
Give the disable confirm button an ID in the disable modal HTML:
html<button class="btn btn-warning" id="disable-confirm-btn" onclick="confirmDisable()">Disable Store</button>
Then replace the entire confirmDisable function with:
jsasync function confirmDisable() {
  if (!pendingAction) return;
  const btn = document.getElementById('disable-confirm-btn');
  setBtnLoading(btn, true);

  try {
    await fetch(`${API}/admin/disable-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: pendingAction.storeId })
    });
    setBtnLoading(btn, false);
    closeModal();
    showToast('Store disabled', 'The store widget has been deactivated.', 'warning');
    loadStores();
    loadOverview();
  } catch {
    setBtnLoading(btn, false);
    showToast('Error', 'Could not connect to server.', 'error');
  }
}

Change 9 — Add loading state to confirmDelete
Give the delete confirm button an ID in the delete modal HTML:
html<button class="btn btn-danger" id="delete-confirm-btn" onclick="confirmDelete()">Delete Permanently</button>
Then replace the entire confirmDelete function with:
jsasync function confirmDelete() {
  if (!pendingAction) return;
  const btn = document.getElementById('delete-confirm-btn');
  setBtnLoading(btn, true);

  try {
    const res = await fetch(`${API}/admin/delete-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: pendingAction.storeId })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    closeModal();
    if (data.success) {
      showToast('Store deleted', 'All store data has been permanently removed.', 'success');
      loadStores();
      loadOverview();
    } else {
      showToast('Delete failed', data.error || 'Something went wrong.', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showToast('Error', 'Could not connect to server.', 'error');
  }
}

Change 10 — Add loading state to activateStore
Replace the entire activateStore function with:
jsasync function activateStore(storeId, plan) {
  try {
    await fetch(`${API}/admin/activate-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId, plan })
    });
    showToast('Store activated', 'The store has been enabled.', 'success');
    loadStores();
    loadOverview();
  } catch {
    showToast('Error', 'Could not activate store.', 'error');
  }
}
Note: activateStore is called from an inline onclick on a dynamically rendered button — not a static button we can grab with getElementById. The table re-renders after the call anyway via loadStores(), so the loading state on this specific button is handled by the table refreshing. No setBtnLoading needed here.

Change 11 — Add loading state to rejectPayment
Replace the entire rejectPayment function with:
jsasync function rejectPayment(id, storeId, plan) {
  try {
    await fetch(`${API}/admin/reject-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ id, storeId, plan })
    });
    showToast('Payment rejected', 'The store has been notified.', 'warning');
    loadPayments();
  } catch {
    showToast('Error', 'Could not reject payment.', 'error');
  }
}
Note: Same as activateStore — this button is dynamically rendered in the payments table. The table refreshes via loadPayments() immediately after, so no setBtnLoading needed.

Change 12 — Tooltip CSS + action buttons + Activate icon (all three from before)
Inside the <style> block, find the @keyframes spin rule you just added in Change 1 and add this immediately after it, still before the @media rule:
css/* ── ACTION BUTTON TOOLTIPS ── */
.action-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
  border: 1px solid transparent;
}
.action-btn::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--text);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 5px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 200;
}
.action-btn::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 1px);
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--text);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 200;
}
.action-btn:hover::after,
.action-btn:hover::before { opacity: 1; }
.action-btn.act-activate {
  background: var(--accent-light);
  color: var(--accent);
  border-color: var(--accent-border);
}
.action-btn.act-activate:hover { background: var(--accent); color: #fff; border-color: var(--accent); }
.action-btn.act-disable {
  background: var(--warning-bg);
  color: var(--warning);
  border-color: var(--warning-border);
}
.action-btn.act-disable:hover { background: var(--warning); color: #fff; border-color: var(--warning); }
.action-btn.act-delete {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: var(--danger-border);
}
.action-btn.act-delete:hover { background: var(--danger); color: #fff; border-color: var(--danger); }
In the renderStores function, replace the entire actions <td> with:
js<td>
  <div style="display:flex;align-items:center;gap:5px;">
    <button class="action-btn act-activate" data-tip="Activate"
      onclick="activateStore('${safeText(s.store_id)}','${safeText(s.plan)}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
      </svg>
    </button>
    <button class="action-btn act-disable" data-tip="Disable"
      onclick="openDisable('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    </button>
    <button class="action-btn act-delete" data-tip="Delete permanently"
      onclick="openDelete('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/>
        <path d="M14 11v6"/>
        <path d="M9 6V4h6v2"/>
      </svg>
    </button>
  </div>
</td>

Change 13 — Fix Overview tab: Status column instead of Action
In loadOverview, replace the stores.slice(0, 8).map(s => ...) block with:
jsdocument.getElementById('ov-stores-table').innerHTML =
  stores.length > 0
  ? stores.slice(0, 8).map(s => `
    <tr>
      <td><strong>${safeText(s.name)}</strong></td>
      <td>${safeText(s.email)}</td>
      <td>${planBadge(s.plan)}</td>
      <td><span class="badge ${
        s.plan_status === 'active'   ? 'badge-success' :
        s.plan_status === 'disabled' ? 'badge-danger'  : 'badge-warning'
      }">${s.plan_status || 'trial'}</span></td>
      <td>${new Date(s.created_at).toLocaleDateString()}</td>
    </tr>`).join('')
  : `<tr><td colspan="5" class="table-empty">No stores registered yet.</td></tr>`;
Also in the overview tab HTML, find the <thead> of the recent stores table and change it to:
html<thead><tr><th>Store</th><th>Email</th><th>Plan</th><th>Status</th><th>Joined</th></tr></thead>

Change 14 — Fix Plan distribution colors
In loadPlatformAnalytics, replace the entire plan-dist innerHTML assignment with:
jsdocument.getElementById('plan-dist').innerHTML =
  Object.entries(planCounts).length === 0
  ? '<div style="text-align:center;padding:24px;color:var(--dim);font-size:13px;">No store data yet.</div>'
  : Object.entries(planCounts).map(([plan, count]) => {
      const pct = Math.round((count / maxPlan) * 100);
      const palette = {
        trial:   { bar: 'var(--warning)',  track: 'var(--warning-bg)'   },
        starter: { bar: 'var(--accent)',   track: 'var(--accent-light)' },
        growth:  { bar: 'var(--accent)',   track: 'var(--accent-light)' },
        pro:     { bar: 'var(--success)',  track: 'var(--success-bg)'   },
      };
      const c = palette[plan] || { bar: 'var(--accent)', track: 'var(--accent-light)' };
      return `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:60px;font-size:12px;font-weight:500;color:var(--text-2);text-transform:capitalize;flex-shrink:0;">${plan}</div>
          <div style="flex:1;background:${c.track};border-radius:6px;height:10px;overflow:hidden;">
            <div style="height:100%;background:${c.bar};border-radius:6px;width:${pct}%;transition:width 0.6s ease;"></div>
          </div>
          <div style="font-size:12px;font-weight:600;color:var(--text);width:20px;text-align:right;flex-shrink:0;">${count}</div>
        </div>`;
    }).join('');

Do not change anything else. No other functions, no other CSS, no other HTML.