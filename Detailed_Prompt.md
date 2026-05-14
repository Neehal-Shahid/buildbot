File to edit: dashboard/admin.html only. Make exactly the two changes below. Do not touch any other CSS, HTML, or JS.

Fix 1 — Smooth button expand without affecting row layout
The problem: When an .action-btn is hovered, width: auto and padding: 0 10px are applied directly, which physically expands the button and pushes neighboring cells and rows.
The fix: Remove width: auto and padding from the hover states. Instead use a wrapper approach where the button always has a fixed width: 28px but on hover a pill expands visually using min-width transition on a position: relative container, and the text appears via max-width animation. The table cell gets a fixed min-width so rows never shift.
Step 1 — Replace ALL action-btn CSS rules. Find every rule starting with .action-btn in the <style> block and replace the entire set with:
css/* ── ACTION BUTTONS — EXPAND ON HOVER ── */
.action-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  min-width: 28px;
  width: 28px;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  border: 1px solid transparent;
  overflow: hidden;
  white-space: nowrap;
  transition: min-width 0.2s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  padding: 0 7px;
  box-sizing: border-box;
}
.action-btn .ab-text {
  font-size: 11px;
  font-weight: 600;
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-width 0.2s ease, opacity 0.15s ease, margin-left 0.2s ease;
  margin-left: 0;
  display: inline-block;
  vertical-align: middle;
}
.action-btn:hover {
  min-width: 80px;
  width: auto;
}
.action-btn:hover .ab-text {
  max-width: 56px;
  opacity: 1;
  margin-left: 5px;
}
.action-btn svg { flex-shrink: 0; }

.action-btn.act-activate {
  background: var(--accent-light);
  color: var(--accent);
  border-color: var(--accent-border);
}
.action-btn.act-activate:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.action-btn.act-disable {
  background: var(--warning-bg);
  color: var(--warning);
  border-color: var(--warning-border);
}
.action-btn.act-disable:hover {
  background: var(--warning);
  color: #fff;
  border-color: var(--warning);
}
.action-btn.act-delete {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: var(--danger-border);
}
.action-btn.act-delete:hover {
  background: var(--danger);
  color: #fff;
  border-color: var(--danger);
}
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
Step 2 — Fix the actions <td> in renderStores to have a fixed min-width.
Find the <td> that wraps the four action buttons inside renderStores. Change its opening tag from:
js<td>
  <div style="display:flex;align-items:center;gap:5px;">
To:
js<td style="min-width:160px;white-space:nowrap;">
  <div style="display:flex;align-items:center;gap:5px;flex-wrap:nowrap;">
This reserves enough space for all 4 buttons even when expanded, so no other cell moves.

Fix 2 — Replace text search with a proper dropdown selector for specific store email
The problem: The current search requires typing and shows results as clickable cards. The ask is a proper dropdown — all stores visible and scrollable immediately, filterable by typing.
Step 1 — Replace the store search HTML in the Communications tab.
Find the entire <!-- Store search --> section inside the "Send to Specific Store" card. It starts with:
html<!-- Store search -->
<div style="display:flex;gap:10px;margin-bottom:16px;">
  <input type="text" id="single-store-search" ...
And ends at the closing </div> of <!-- Search results --> section (which contains id="single-store-list").
Replace everything from <!-- Store search --> through the closing </div> of id="single-store-results" with:
html<!-- Store dropdown selector -->
<div class="form-group" style="position:relative;">
  <label class="form-label">Select Store</label>
  <div style="position:relative;">
    <input
      type="text"
      id="single-store-search"
      placeholder="Search or select a store…"
      autocomplete="off"
      onfocus="openStoreDropdown()"
      oninput="filterStoreDropdown()"
      onblur="scheduleCloseDropdown()"
      style="width:100%;padding-right:36px;cursor:pointer;"
    />
    <div style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div
      id="single-store-dropdown"
      style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-md);box-shadow:var(--shadow-md);z-index:1000;max-height:240px;overflow-y:auto;"
    >
      <div id="single-store-dropdown-list"></div>
    </div>
  </div>
</div>
Step 2 — Replace the JS functions for store search.
Find these existing functions and replace all of them together:

searchStoresForEmail
selectStoreForEmail
clearSelectedStore
clearSingleStoreSearch

Replace with:
jslet _dropdownCloseTimer = null;

function openStoreDropdown() {
  if (_dropdownCloseTimer) { clearTimeout(_dropdownCloseTimer); _dropdownCloseTimer = null; }
  renderStoreDropdown(allStoresData);
  document.getElementById('single-store-dropdown').style.display = 'block';
}

function filterStoreDropdown() {
  const q = document.getElementById('single-store-search').value.toLowerCase().trim();
  const filtered = q.length === 0
    ? allStoresData
    : allStoresData.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      );
  renderStoreDropdown(filtered);
  document.getElementById('single-store-dropdown').style.display = 'block';
}

function renderStoreDropdown(stores) {
  const list = document.getElementById('single-store-dropdown-list');
  if (!stores.length) {
    list.innerHTML = `<div style="padding:12px 14px;font-size:13px;color:var(--dim);">No stores found.</div>`;
    return;
  }
  list.innerHTML = stores.map(s => `
    <div
      onmousedown="selectStoreForEmail('${safeText(s.store_id)}','${encodeURIComponent(s.name)}','${encodeURIComponent(s.email)}')"
      style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s;"
      onmouseover="this.style.background='var(--surface-2)'"
      onmouseout="this.style.background='transparent'"
    >
      <div style="font-size:13px;font-weight:600;color:var(--text);">${safeText(s.name)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;display:flex;align-items:center;gap:8px;">
        <span>${safeText(s.email)}</span>
        <span>·</span>
        ${planBadge(s.plan)}
      </div>
    </div>
  `).join('');
}

function scheduleCloseDropdown() {
  // Delay close so onmousedown on items fires first
  _dropdownCloseTimer = setTimeout(() => {
    const dd = document.getElementById('single-store-dropdown');
    if (dd) dd.style.display = 'none';
  }, 180);
}

function selectStoreForEmail(storeId, name, email) {
  if (_dropdownCloseTimer) { clearTimeout(_dropdownCloseTimer); _dropdownCloseTimer = null; }
  _selectedStoreId = storeId;
  _selectedStoreEmail = decodeURIComponent(email);
  const decodedName = decodeURIComponent(name);

  // Fill the input with the store name as a visual confirmation
  const input = document.getElementById('single-store-search');
  if (input) input.value = decodedName;

  // Close dropdown
  const dd = document.getElementById('single-store-dropdown');
  if (dd) dd.style.display = 'none';

  // Show selected badge
  document.getElementById('single-store-name').textContent = decodedName;
  document.getElementById('single-store-email-display').textContent = _selectedStoreEmail;
  document.getElementById('single-store-selected').style.display = 'block';
  document.getElementById('single-store-form').style.display = 'block';
}

function clearSelectedStore() {
  _selectedStoreId = null;
  _selectedStoreEmail = null;
  const input = document.getElementById('single-store-search');
  if (input) { input.value = ''; input.focus(); }
  document.getElementById('single-store-selected').style.display = 'none';
  document.getElementById('single-store-form').style.display = 'none';
  document.getElementById('single-store-dropdown').style.display = 'none';
}
Note: clearSingleStoreSearch is no longer needed — remove it and delete the "Clear" button from the HTML if it still exists.

Do not change anything else. Do not touch any server files, modals, or other tabs.
