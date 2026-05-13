

**File to edit:** `dashboard/admin.html` only. Make exactly these changes. Read the full file before starting. Do not rename or replace any existing function.

---

**Change 1 — Add Communications sidebar tab**

Find the sidebar. After the DB Health `sb-item`, add:

```html
<div class="sb-item" onclick="showTab('comms')" id="atab-comms">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
  Communications
</div>
```

---

**Change 2 — Register comms in `showTab`**

Find:
```js
['overview','stores','payments','analytics','settings','dbhealth'].forEach(t => {
```
Replace with:
```js
['overview','stores','payments','analytics','settings','dbhealth','comms'].forEach(t => {
```

---

**Change 3 — Add Communications tab HTML inside `.main`**

Find the closing `</div>` of `#tab-dbhealth`. Add this new tab div directly after it, still inside `.main`:

```html
<!-- COMMUNICATIONS -->
<div id="tab-comms" style="display:none;">
  <div class="section-title">Communications</div>
  <div class="section-sub">Send emails to stores — broadcast announcements or trigger automated drip emails.</div>

  <div class="two-col">

    <div class="card">
      <div class="card-head">
        <div><h2>Broadcast Email</h2><div class="card-sub">Send a message to all or filtered stores</div></div>
      </div>
      <div class="form-group">
        <label class="form-label">Target Audience</label>
        <select id="broadcast-target-plan">
          <option value="">All active stores</option>
          <option value="trial">Trial only</option>
          <option value="starter">Starter only</option>
          <option value="growth">Growth only</option>
          <option value="pro">Pro only</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Subject</label>
        <input type="text" id="broadcast-subject" placeholder="Email subject line"/>
      </div>
      <div class="form-group">
        <label class="form-label">Message</label>
        <textarea id="broadcast-message" rows="6" placeholder="Your message…" style="width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-md);color:var(--text);font-size:13px;resize:vertical;font-family:inherit;outline:none;box-sizing:border-box;"></textarea>
      </div>
      <button class="btn btn-primary" id="broadcast-send-btn" onclick="confirmBroadcast()" style="display:inline-flex;align-items:center;gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        Send Broadcast
      </button>
      <div class="alert" id="comms-broadcast-alert" style="margin-top:12px;"></div>
    </div>

    <div class="card">
      <div class="card-head">
        <div><h2>Automated Drip</h2><div class="card-sub">Runs every hour automatically on the server</div></div>
      </div>
      <div style="padding:14px 16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);margin-bottom:14px;">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px;">Sends automatically when conditions are met:</div>
        <div style="font-size:12px;color:var(--muted);line-height:2.1;">
          <div>— Trial ending in 3 days → warning email</div>
          <div>— Trial ending tomorrow → urgent warning</div>
          <div>— Signed up 4 days ago, not live → setup nudge</div>
          <div>— Signed up 10 days ago → upgrade urgency</div>
          <div>— Plan lapsed 1, 3, or 7 days ago → dunning email</div>
          <div>— Payment pending 6+ hours → admin alert</div>
        </div>
      </div>
      <div style="padding:12px 14px;background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:var(--r-md);margin-bottom:16px;">
        <div style="font-size:12px;color:var(--warning);line-height:1.6;">Run manually only to catch up after downtime or to test the system.</div>
      </div>
      <button class="btn btn-warning" id="drip-run-btn" onclick="runDripNow(this)" style="display:inline-flex;align-items:center;gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        Run Drip Now
      </button>
      <div class="alert" id="comms-drip-alert" style="margin-top:12px;"></div>
    </div>

  </div>
</div>
```

---

**Change 4 — Add `runDripNow` function**

The existing `runDripEmails` / `executeRunDrip` functions work but are for the old per-row approach. Add this new function for the Communications tab button. Add it directly before the `closeModal` function:

```js
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
      showAlert('comms-drip-alert',
        `Done — Trial warnings: ${r.trialWarnings} · Onboarding: ${r.onboarding} · Dunning: ${r.dunning} · Stale alerts: ${r.stalePayments}`,
        'success');
    } else {
      showAlert('comms-drip-alert', data.error || 'Something went wrong', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('comms-drip-alert', 'Could not connect to server', 'error');
  }
}
```

Also update `confirmBroadcast` — after `closeModal()` on success, add:
```js
showAlert('comms-broadcast-alert', data.message || 'Broadcast sent.', 'success');
```
And after `closeModal()` the function currently shows a toast. Keep the toast but also show the inline alert so the user sees feedback on the page after the modal closes.

---

**Change 5 — Remove Broadcast button from Overview "Recently Joined" card-head**

Find in the overview tab HTML:
```html
<button class="btn btn-primary btn-sm" onclick="openBroadcastModal()">
  <svg ...>...</svg>
  Broadcast
</button>
```
Delete this button entirely. The card-head should only have the title and sub text.

---

**Change 6 — Remove Broadcast and Run Drip buttons from All Stores card-head**

Find in the stores tab card-head:
```html
<button class="btn btn-primary btn-sm" onclick="openBroadcastModal()">...</button>
<button class="btn btn-warning btn-sm" onclick="runDripEmails()">...</button>
```
Delete both. Keep only the search input.

---

**Change 7 — Fix the renderStores actions column**

Find the entire actions `<td>` in `renderStores` that currently has 5 buttons. Replace it with exactly 4 buttons — Activate, Disable, Delete, Manage — with correct SVGs and correct `onclick` calls matching the existing functions:

```js
<td>
  <div style="display:flex;align-items:center;gap:5px;">

    <button class="action-btn act-activate" data-tip="Activate"
      onclick="activateStore('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
      </svg>
    </button>

    <button class="action-btn act-disable" data-tip="Disable"
      onclick="openDisable('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    </button>

    <button class="action-btn act-delete" data-tip="Delete permanently"
      onclick="openDelete('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/>
        <path d="M9 6V4h6v2"/>
      </svg>
    </button>

    <button class="action-btn act-manage" data-tip="Manage store"
      onclick="openManageModal('${safeText(s.store_id)}','${encodeURIComponent(s.name)}','${encodeURIComponent(s.email)}','${safeText(s.plan)}','${safeText(s.plan_status)}','${encodeURIComponent(s.admin_notes||'')}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>

  </div>
</td>
```

---

**Change 8 — Add `act-manage` CSS**

In the `<style>` block, find `.action-btn.act-delete` CSS rule. Add this directly after it:

```css
.action-btn.act-manage {
  background: var(--surface-2);
  color: var(--muted);
  border-color: var(--border-2);
}
.action-btn.act-manage:hover {
  background: var(--text);
  color: #fff;
  border-color: var(--text);
}
```

---

**Change 9 — Add loading spinner to Overview tab**

Find `async function loadOverview()`. At the very top of the function body, before the `try {` block, add:

```js
document.getElementById('ov-stores-table').innerHTML =
  `<tr class="table-loading"><td colspan="5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:6px;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>Loading…</td></tr>`;
```

---

**Do not change anything else. Do not rename any function. Do not touch any modal HTML that is not mentioned. Do not touch any server files.**