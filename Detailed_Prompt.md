File to edit: dashboard/admin.html only. Make changes in the exact order listed. Read the entire file before starting. Do not rename or remove any existing function.

Fix 1 — Fix CSS nesting bug in .action-btn
Find this block:
css.action-btn {
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
  .main { padding: 16px; }
}
Remove the .main { padding: 16px; } line that is incorrectly nested inside it. The corrected rule should be:
css.action-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.18s ease;
  border: 1px solid transparent;
  overflow: hidden;
  white-space: nowrap;
}
Note overflow: hidden and white-space: nowrap are added — needed for the expand-on-hover text reveal effect.

Fix 2 — Replace all .action-btn variant CSS with the expand-on-hover system
Find and delete all these existing CSS rules:

.action-btn.act-delete { ... } and .action-btn.act-delete:hover { ... }
.action-btn.act-manage { ... } and .action-btn.act-manage:hover { ... }

Also remove any existing .action-btn.act-activate, .action-btn.act-disable rules if present.
Replace them all with this complete set:
css/* Action button expand-on-hover system */
.action-btn .ab-text {
  font-size: 11px;
  font-weight: 600;
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-width 0.22s ease, opacity 0.18s ease, margin-left 0.22s ease;
  margin-left: 0;
  display: inline-block;
  vertical-align: middle;
}
.action-btn:hover .ab-text {
  max-width: 60px;
  opacity: 1;
  margin-left: 5px;
}
.action-btn svg {
  flex-shrink: 0;
}

/* Activate — accent/indigo */
.action-btn.act-activate {
  background: var(--accent-light);
  color: var(--accent);
  border-color: var(--accent-border);
}
.action-btn.act-activate:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  padding: 0 10px;
  width: auto;
}

/* Disable — amber/warning */
.action-btn.act-disable {
  background: var(--warning-bg);
  color: var(--warning);
  border-color: var(--warning-border);
}
.action-btn.act-disable:hover {
  background: var(--warning);
  color: #fff;
  border-color: var(--warning);
  padding: 0 10px;
  width: auto;
}

/* Delete — red/danger */
.action-btn.act-delete {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: var(--danger-border);
}
.action-btn.act-delete:hover {
  background: var(--danger);
  color: #fff;
  border-color: var(--danger);
  padding: 0 10px;
  width: auto;
}

/* Manage — neutral */
.action-btn.act-manage {
  background: var(--surface-2);
  color: var(--muted);
  border-color: var(--border-2);
}
.action-btn.act-manage:hover {
  background: var(--text);
  color: #fff;
  border-color: var(--text);
  padding: 0 10px;
  width: auto;
}

Fix 3 — Update renderStores action buttons to include text labels
Find the actions <td> inside renderStores. Update each of the 4 buttons to include a <span class="ab-text"> inside them with the label text. Replace the entire actions <td> with:
js<td>
  <div style="display:flex;align-items:center;gap:5px;">

    <button class="action-btn act-activate" style="height:28px;"
      onclick="activateStore('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
      </svg>
      <span class="ab-text">Activate</span>
    </button>

    <button class="action-btn act-disable" style="height:28px;"
      onclick="openDisable('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
      <span class="ab-text">Disable</span>
    </button>

    <button class="action-btn act-delete" style="height:28px;"
      onclick="openDelete('${safeText(s.store_id)}','${encodeURIComponent(s.name)}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/>
        <path d="M9 6V4h6v2"/>
      </svg>
      <span class="ab-text">Delete</span>
    </button>

    <button class="action-btn act-manage" style="height:28px;"
      onclick="openManageModal('${safeText(s.store_id)}','${encodeURIComponent(s.name)}','${encodeURIComponent(s.email)}','${safeText(s.plan)}','${safeText(s.plan_status)}','${encodeURIComponent(s.admin_notes||'')}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <span class="ab-text">Manage</span>
    </button>

  </div>
</td>

Fix 4 — Fix duplicate element IDs between broadcast modal and communications tab
The broadcast modal (id=broadcast-modal) has id="broadcast-subject", id="broadcast-message", and id="broadcast-target-plan" — the same IDs as the Communications tab. This causes the wrong elements to be read when confirmBroadcast() runs.
Option A (recommended): Delete the broadcast-modal entirely since the Communications tab now serves this purpose. Find the entire <!-- BROADCAST MODAL --> block and delete it. Then find openBroadcastModal function — it opens broadcast-modal. Since no buttons call openBroadcastModal anymore, also delete the openBroadcastModal function. The confirmBroadcast function reads from the tab form elements — keep it as is.
If any button still calls openBroadcastModal, replace that call with showTab('comms') instead.

Fix 5 — Add "Send to Specific Store" section in Communications tab
Find the Communications tab HTML (#tab-comms). After the closing </div> of the two-col grid (which has Broadcast and Drip cards), add this new full-width card:
html<div class="card" style="margin-top:20px;">
  <div class="card-head">
    <div>
      <h2>Send to Specific Store</h2>
      <div class="card-sub">Search for a store and send them a custom email</div>
    </div>
  </div>

  <!-- Store search -->
  <div style="display:flex;gap:10px;margin-bottom:16px;">
    <input type="text" id="single-store-search" placeholder="Search by store name or email…"
      oninput="searchStoresForEmail()" style="flex:1;"/>
    <button class="btn btn-sm" onclick="clearSingleStoreSearch()" style="flex-shrink:0;">Clear</button>
  </div>

  <!-- Search results -->
  <div id="single-store-results" style="margin-bottom:16px;display:none;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:8px;">Select a store:</div>
    <div id="single-store-list" style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;"></div>
  </div>

  <!-- Selected store display -->
  <div id="single-store-selected" style="display:none;margin-bottom:16px;padding:12px 14px;background:var(--accent-light);border:1px solid var(--accent-border);border-radius:var(--r-md);">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--accent);margin-bottom:3px;">Sending to</div>
        <div id="single-store-name" style="font-size:14px;font-weight:600;color:var(--text);"></div>
        <div id="single-store-email-display" style="font-size:12px;color:var(--muted);"></div>
      </div>
      <button class="btn btn-sm" onclick="clearSelectedStore()">✕ Change</button>
    </div>
  </div>

  <!-- Email form — shown only after store selected -->
  <div id="single-store-form" style="display:none;">
    <div class="form-group">
      <label class="form-label">Subject</label>
      <input type="text" id="single-email-subject" placeholder="Email subject line"/>
    </div>
    <div class="form-group">
      <label class="form-label">Message</label>
      <textarea id="single-email-message" rows="5" placeholder="Your message to this store…" style="width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-md);color:var(--text);font-size:13px;resize:vertical;font-family:inherit;outline:none;box-sizing:border-box;"></textarea>
    </div>
    <button class="btn btn-primary" id="single-send-btn" onclick="sendToSingleStore()" style="display:inline-flex;align-items:center;gap:6px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      Send Email
    </button>
  </div>

  <div class="alert" id="single-send-alert" style="margin-top:12px;"></div>
</div>

Fix 6 — Add JS functions for the specific store search and send
Add these functions directly before the closeModal function:
js// ─── SINGLE STORE EMAIL ───────────────────────────────
let _selectedStoreId = null;
let _selectedStoreEmail = null;

function searchStoresForEmail() {
  const q = document.getElementById('single-store-search').value.toLowerCase().trim();
  const resultsEl = document.getElementById('single-store-results');
  const listEl = document.getElementById('single-store-list');

  if (!q || q.length < 2) {
    resultsEl.style.display = 'none';
    return;
  }

  const matches = allStoresData.filter(s =>
    (s.name || '').toLowerCase().includes(q) ||
    (s.email || '').toLowerCase().includes(q)
  ).slice(0, 8);

  if (matches.length === 0) {
    listEl.innerHTML = `<div style="font-size:13px;color:var(--muted);padding:10px 0;">No stores found.</div>`;
    resultsEl.style.display = 'block';
    return;
  }

  listEl.innerHTML = matches.map(s => `
    <div onclick="selectStoreForEmail('${safeText(s.store_id)}','${encodeURIComponent(s.name)}','${encodeURIComponent(s.email)}')"
      style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);cursor:pointer;transition:border-color 0.12s;"
      onmouseover="this.style.borderColor='var(--accent)'"
      onmouseout="this.style.borderColor='var(--border)'">
      <div style="font-size:13px;font-weight:600;color:var(--text);">${safeText(s.name)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">${safeText(s.email)} · ${planBadge(s.plan)}</div>
    </div>
  `).join('');

  resultsEl.style.display = 'block';
}

function selectStoreForEmail(storeId, name, email) {
  _selectedStoreId = storeId;
  _selectedStoreEmail = decodeURIComponent(email);
  const decodedName = decodeURIComponent(name);

  document.getElementById('single-store-name').textContent = decodedName;
  document.getElementById('single-store-email-display').textContent = _selectedStoreEmail;
  document.getElementById('single-store-selected').style.display = 'block';
  document.getElementById('single-store-form').style.display = 'block';
  document.getElementById('single-store-results').style.display = 'none';
  document.getElementById('single-store-search').value = '';
}

function clearSelectedStore() {
  _selectedStoreId = null;
  _selectedStoreEmail = null;
  document.getElementById('single-store-selected').style.display = 'none';
  document.getElementById('single-store-form').style.display = 'none';
  document.getElementById('single-store-search').value = '';
  document.getElementById('single-store-search').focus();
}

function clearSingleStoreSearch() {
  document.getElementById('single-store-search').value = '';
  document.getElementById('single-store-results').style.display = 'none';
}

async function sendToSingleStore() {
  if (!_selectedStoreId) return showAlert('single-send-alert', 'No store selected', 'error');
  const subject = document.getElementById('single-email-subject').value.trim();
  const message = document.getElementById('single-email-message').value.trim();
  if (!subject || !message) return showAlert('single-send-alert', 'Subject and message required', 'error');

  const btn = document.getElementById('single-send-btn');
  setBtnLoading(btn, true);
  try {
    const res = await fetch(`${API}/admin/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ storeId: _selectedStoreId, subject, message })
    });
    const data = await res.json();
    setBtnLoading(btn, false);
    if (data.success) {
      showAlert('single-send-alert', `Email sent to ${_selectedStoreEmail}`, 'success');
      document.getElementById('single-email-subject').value = '';
      document.getElementById('single-email-message').value = '';
      clearSelectedStore();
    } else {
      showAlert('single-send-alert', data.error || 'Failed to send', 'error');
    }
  } catch {
    setBtnLoading(btn, false);
    showAlert('single-send-alert', 'Server error', 'error');
  }
}

Fix 7 — Load stores data when Communications tab is opened
In showTab, find:
jsif (name === 'analytics') loadPlatformAnalytics();
Add after it:
jsif (name === 'comms' && allStoresData.length === 0) loadStores();
This ensures allStoresData is populated when the user opens Communications so the store search works.

Do not change anything else. Do not rename any function. Do not touch any server files. Do not modify any modal other than deleting the broadcast-modal as specified in Fix 4.

