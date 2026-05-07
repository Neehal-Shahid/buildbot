# Cursor Prompt — BuildBot Dashboard Redesign
### File: `index.html` (single file, all-in-one)

---

## ABSOLUTE RULES — READ BEFORE TOUCHING ANYTHING

1. **DO NOT touch** any CSS or HTML outside of `#page-app` and its children.
2. **DO NOT touch** `#page-landing`, `#page-signup`, `#page-login`, `#page-forgot`.
3. **DO NOT touch** `#main-nav` or any nav CSS that applies to the landing page.
4. **DO NOT touch** any JavaScript functions — not a single function, variable, event listener, or API call.
5. **DO NOT rename** any `id` attribute anywhere. JS depends on every single ID.
6. **DO NOT remove** any HTML element. You may only add new wrapper elements, new CSS classes, or restyle existing elements.
7. **DO NOT change** any `onclick`, `oninput`, `onchange`, or any other event attribute.
8. **DO NOT move** the hidden `#trial-banner` div — JS reads `#trial-end-date` inside it.
9. The existing CSS variables `--bg`, `--surface`, `--border`, `--primary`, `--primary-dark`, `--text`, `--muted`, `--success`, `--danger` must remain declared in `:root` as-is because JS and existing CSS still reference them. You will ADD new dashboard-scoped variables, not replace.
10. Test mentally: after every change, ask "does any JS function still find its target element by ID?" If no — revert.

---

## PART 1 — DASHBOARD COLOR THEME

Add a new CSS block **immediately after the comment `/* ═══════════════════════════════ DASHBOARD REDESIGN — v2 ═══════════════════════════════ */`** (around line 2550). Do not replace existing CSS — add this block before it:

```css
/* ═══════════════════════════════
   DASHBOARD THEME OVERRIDE
   Applies ONLY inside #page-app
   Does not affect landing/auth pages
═══════════════════════════════ */
#page-app {
  --dash-bg:        #0d0e12;
  --dash-surface:   #13151c;
  --dash-surface2:  #181a23;
  --dash-border:    rgba(255,255,255,0.07);
  --dash-border2:   rgba(255,255,255,0.12);
  --dash-text:      #e8e8f0;
  --dash-muted:     #6b6d82;
  --dash-accent:    #6366f1;
  --dash-accent-bg: rgba(99,102,241,0.10);
  --dash-success:   #10b981;
  --dash-warning:   #f59e0b;
  --dash-danger:    #ef4444;
  --dash-info-bg:   rgba(99,102,241,0.08);
  --dash-info-text: #818cf8;
}

/* Re-map the original variables to new theme inside dashboard only */
#page-app { background: var(--dash-bg); }

#page-app .sidebar,
#page-app .dash-topbar,
#page-app .card,
#page-app .stat-card,
#page-app .quick-action-btn,
#page-app .cl-item,
#page-app .help-card,
#page-app .stc,
#page-app .store-type-switcher {
  background: var(--dash-surface);
}

#page-app .sidebar,
#page-app .dash-topbar,
#page-app .sidebar-logo,
#page-app .sidebar-bottom,
#page-app .card,
#page-app .store-health-bar,
#page-app .cl-item,
#page-app .quick-action-btn,
#page-app .modal,
#page-app .embed-box {
  border-color: var(--dash-border);
}

#page-app .sidebar-item { color: var(--dash-muted); }
#page-app .sidebar-item:hover { background: rgba(255,255,255,0.04); color: var(--dash-text); }
#page-app .sidebar-item.active { background: var(--dash-accent-bg); color: var(--dash-info-text); }
#page-app .sidebar-sep { color: rgba(255,255,255,0.22); }

#page-app .card h2,
#page-app .section-title,
#page-app .sb-user-name,
#page-app .stat-value,
#page-app .dash-breadcrumb b,
#page-app .cl-label,
#page-app .woo-status-name { color: var(--dash-text); }

#page-app .card p,
#page-app .stat-label,
#page-app .section-sub,
#page-app .dash-breadcrumb,
#page-app .health-item,
#page-app .qa-label,
#page-app .cl-sub,
#page-app .woo-status-sub,
#page-app .sb-user-plan { color: var(--dash-muted); }

#page-app .sidebar-item.active,
#page-app .cl-check-active,
#page-app .cl-action,
#page-app .sb-pill { color: var(--dash-info-text); }

#page-app .sb-pill { background: var(--dash-accent-bg); }
#page-app .sb-store-dot { background: var(--dash-success); }
#page-app .sb-store-type { border-color: var(--dash-border); color: var(--dash-muted); background: rgba(255,255,255,0.02); }
#page-app .sb-store-type:hover { border-color: rgba(99,102,241,0.4); }

#page-app .store-health-bar { background: rgba(255,255,255,0.02); }
#page-app .health-sep { background: var(--dash-border); }
#page-app .h-dot-ok  { background: var(--dash-success); }
#page-app .h-dot-warn { background: var(--dash-warning); }
#page-app .h-dot-off  { background: var(--dash-danger); }

#page-app .checklist-progress { background: var(--dash-border); }
#page-app .checklist-progress-fill,
#page-app .cl-check-active { background: var(--dash-accent-bg); border-color: var(--dash-accent); }
#page-app .cl-check-done { background: var(--dash-success); border-color: var(--dash-success); }
#page-app .cl-item { background: var(--dash-surface); border-color: var(--dash-border); }
#page-app .cl-item:hover { border-color: rgba(99,102,241,0.4); }

#page-app .quick-action-btn { border-color: var(--dash-border); }
#page-app .quick-action-btn:hover { border-color: rgba(99,102,241,0.45); background: var(--dash-accent-bg); }

#page-app .sts-btn { color: var(--dash-muted); }
#page-app .sts-btn.sts-active { background: var(--dash-surface2); color: var(--dash-text); border-color: var(--dash-border2); }
#page-app .store-type-switcher { background: rgba(255,255,255,0.03); }

#page-app table th { background: var(--dash-bg); color: var(--dash-muted); border-color: var(--dash-border); }
#page-app table td { border-color: rgba(255,255,255,0.04); color: #b0b2c8; }
#page-app table tr:hover td { background: rgba(255,255,255,0.03); }

#page-app .modal { background: var(--dash-surface); border-color: var(--dash-border); }
#page-app .embed-box { background: var(--dash-bg); border-color: var(--dash-border); }

#page-app input[type=text],
#page-app input[type=email],
#page-app input[type=password],
#page-app input[type=number],
#page-app select,
#page-app textarea {
  background: var(--dash-bg);
  border-color: var(--dash-border2);
  color: var(--dash-text);
}
#page-app input:focus,
#page-app select:focus,
#page-app textarea:focus { border-color: var(--dash-accent); }

#page-app .btn { color: var(--dash-text); }
#page-app .btn-primary { background: var(--dash-accent); color: #fff; }
#page-app .btn-primary:hover { background: #4f52d6; }
#page-app .btn-outline { color: var(--dash-accent); border-color: var(--dash-accent); }
#page-app .btn-outline:hover { background: var(--dash-accent); color: #fff; }
#page-app .btn:not(.btn-primary):not(.btn-outline):not(.btn-danger) {
  background: var(--dash-surface2);
  border: 1px solid var(--dash-border2);
  color: var(--dash-muted);
}
#page-app .btn:not(.btn-primary):not(.btn-outline):not(.btn-danger):hover {
  color: var(--dash-text);
  border-color: var(--dash-border2);
}

#page-app .badge-primary { background: var(--dash-accent-bg); color: var(--dash-info-text); }
#page-app .badge-success { background: rgba(16,185,129,0.12); color: var(--dash-success); }
#page-app .badge-warning { background: rgba(245,158,11,0.12); color: var(--dash-warning); }
#page-app .badge-danger  { background: rgba(239,68,68,0.12);  color: var(--dash-danger); }

#page-app .stc { border-color: var(--dash-border); }
#page-app .stc:hover { border-color: rgba(99,102,241,0.5); }
#page-app .stc.stc-selected { border-color: var(--dash-accent); background: var(--dash-accent-bg); }
#page-app .stc-name { color: var(--dash-text); }
#page-app .stc-desc { color: var(--dash-muted); }

#page-app .help-card { background: var(--dash-surface); border-color: var(--dash-border); }
#page-app .help-card:hover { border-color: rgba(99,102,241,0.5); }
#page-app .help-title { color: var(--dash-text); }
#page-app .help-sub { color: var(--dash-muted); }

#page-app .plan-opt { border-color: var(--dash-border); }
#page-app .plan-opt:hover { border-color: var(--dash-accent); }
#page-app .plan-opt.selected { border-color: var(--dash-accent); background: var(--dash-accent-bg); }
#page-app .plan-opt .po-name { color: var(--dash-text); }
#page-app .plan-opt .po-price { color: var(--dash-info-text); }

#page-app .notice-ok   { background: rgba(16,185,129,0.07);  border-color: rgba(16,185,129,0.25); color: var(--dash-success); }
#page-app .notice-warn { background: rgba(245,158,11,0.07);  border-color: rgba(245,158,11,0.25); color: var(--dash-warning); }
#page-app .notice-info { background: var(--dash-info-bg);    border-color: rgba(99,102,241,0.30); color: var(--dash-info-text); }

#page-app .woo-status-bar { background: rgba(16,185,129,0.05); border-color: rgba(16,185,129,0.18); }

#page-app .trial-banner {
  background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.05));
  border-color: rgba(99,102,241,0.3);
}
#page-app .trial-chip-inline { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.3); color: var(--dash-warning); }
#page-app .trial-chip-inline:hover { background: rgba(245,158,11,0.18); }

#page-app .sb-avatar { background: var(--dash-accent-bg); color: var(--dash-info-text); }
#page-app .sidebar-logo-ic { background: var(--dash-accent-bg); }

#page-app .chart-bar-bg { background: var(--dash-bg); }
#page-app .chart-bar-fill { background: linear-gradient(90deg, var(--dash-accent), #4f52d6); }
#page-app .chart-label { color: var(--dash-muted); }
#page-app .chart-count { color: var(--dash-muted); }

#page-app .danger-zone-card { border-color: rgba(239,68,68,0.28) !important; }
#page-app .danger-zone-card h2 { color: var(--dash-danger) !important; }

#page-app .upload-area { border-color: var(--dash-border2); }
#page-app .upload-area:hover { border-color: var(--dash-accent); background: rgba(99,102,241,0.04); }
#page-app .upload-area p { color: var(--dash-muted); }

#page-app .modal-bg { background: rgba(0,0,0,0.75); }

/* Sidebar Go-Live button — glowing green CTA until widget is confirmed live */
#page-app #tab-embed.sidebar-item {
  background: rgba(16,185,129,0.10);
  border: 1px solid rgba(16,185,129,0.28);
  color: var(--dash-success);
  font-weight: 600;
}
#page-app #tab-embed.sidebar-item:hover {
  background: rgba(16,185,129,0.18);
}
#page-app #tab-embed.sidebar-item.active {
  background: rgba(16,185,129,0.18);
  border-color: rgba(16,185,129,0.45);
  color: var(--dash-success);
}
```

---

## PART 2 — SIDEBAR: ADD VISUAL GROUPING & "GO LIVE" EMPHASIS

**Target:** The `<div class="sidebar">` inside `#page-app` (around line 3702).

### 2a. Change the sidebar separator labels

Find these three `<div class="sidebar-sep">` elements and change their text content only:

- `Workspace` → keep as `Workspace`  
- `Account` → keep as `Account`  
- Add a new separator **before** the Overview item (after the store type chip) with the text `Get started`

The final sidebar separator order must be:
1. `Get started` (new — before Overview)
2. `Workspace` (existing — before Analytics or Products)
3. `Account` (existing — before Billing)

### 2b. Restructure the sidebar items

The current sidebar HTML order inside `.sidebar` is:

```
sidebar-logo
sb-store-type chip
sidebar-sep "Workspace"
  tab-home (Overview)
  tab-products (Products)
  tab-analytics (Analytics)
  tab-embed (Embed & Widget)
sidebar-sep "Account"
  tab-billing (Billing)
  tab-settings (Settings)
  tab-help (Help & Docs)
flex spacer
sidebar-bottom (user row + logout)
```

Change the order to this. **Do not change any id, onclick, or any attribute — only reorder the HTML blocks:**

```
sidebar-logo
sb-store-type chip
sidebar-sep "Get started"
  tab-home (Overview)       ← same onclick="showTab('home')" id="tab-home"
  tab-embed (Embed & Widget) ← same onclick, id — MOVE this up here
sidebar-sep "Workspace"
  tab-products (Products)   ← same onclick, id
  tab-analytics (Analytics) ← same onclick, id
sidebar-sep "Account"
  tab-billing (Billing)     ← same onclick, id
  tab-settings (Settings)   ← same onclick, id
  tab-help (Help & Docs)    ← same onclick, id
flex spacer
sidebar-bottom (user row + logout)
```

The only change here is moving `tab-embed` from the Workspace group to the Get started group, right after `tab-home`. **No ID changes, no JS changes.**

### 2c. Update the "Embed & Widget" sidebar item label

Find the sidebar item with `id="tab-embed"`. Change its inner text from:
```
🔗 Embed & Widget
```
to:
```
🔗 Go Live · Widget
```

Keep the `<span class="sb-pill" ...>` or `<span class="sb-dot-warn" ...>` children exactly as-is if present.

---

## PART 3 — SIDEBAR STORE TYPE CHIP: IMPROVE STYLING

Find the `<div class="sb-store-type" id="sb-store-type-chip" onclick="showTab('settings')">` element. 

Add a second line of sub-text to communicate more context. Replace the inner HTML with:

```html
<div class="sb-store-dot"></div>
<div style="flex:1;min-width:0;">
  <div class="sb-store-label" id="sb-store-type-label">Loading...</div>
  <div style="font-size:9px;color:rgba(255,255,255,0.28);margin-top:1px;" id="sb-store-type-sub">change in settings</div>
</div>
```

**Important:** The `id="sb-store-type-label"` must be preserved exactly — JS writes to it.

Add CSS for the chip to match the new theme:

```css
#page-app .sb-store-type {
  background: rgba(16,185,129,0.06);
  border-color: rgba(16,185,129,0.22);
}
#page-app .sb-store-dot {
  background: var(--dash-success);
}
#page-app #sb-store-type-label {
  color: #a7f3d0;
  font-size: 11px;
  font-weight: 500;
}
```

---

## PART 4 — OVERVIEW TAB: ADD "GO LIVE" PERSISTENT BANNER

**Target:** `<div id="tab-content-home">` — add a new HTML block immediately after the `<div class="store-health-bar">` section and before the `<div class="onboarding-checklist">`.

Insert this HTML (it is purely visual — no new JS, uses existing `showTab` and `copyEmbed` functions):

```html
<!-- Go Live Banner — shown until widget is confirmed live -->
<div id="go-live-banner" style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.25);border-radius:12px;margin-bottom:20px;">
  <div style="font-size:22px;flex-shrink:0;">🚀</div>
  <div style="flex:1;">
    <div style="font-size:13px;font-weight:600;color:#a7f3d0;margin-bottom:2px;">Your widget is ready — paste it on your store to go live</div>
    <div style="font-size:12px;color:rgba(167,243,208,0.65);">One line of code. Copy the script tag and paste it before &lt;/body&gt; on your website.</div>
  </div>
  <button class="btn btn-sm" onclick="copyEmbed()" style="background:rgba(16,185,129,0.18);color:#a7f3d0;border:1px solid rgba(16,185,129,0.35);white-space:nowrap;flex-shrink:0;">📋 Copy embed code</button>
  <button class="btn btn-sm" onclick="showTab('embed')" style="background:transparent;color:rgba(167,243,208,0.7);border:1px solid rgba(16,185,129,0.2);white-space:nowrap;flex-shrink:0;">Full setup →</button>
</div>
```

Then add this small JS block **at the very bottom of the last `<script>` tag** (the one that ends the file, before `</body>`). This hides the banner once the user has verified the widget is live:

```javascript
// Hide go-live banner when widget is confirmed live
(function() {
  function refreshGoLiveBanner() {
    var banner = document.getElementById('go-live-banner');
    if (!banner) return;
    var live = localStorage.getItem('bb_widget_live') === '1';
    banner.style.display = live ? 'none' : 'flex';
  }
  document.addEventListener('DOMContentLoaded', refreshGoLiveBanner);
  // Re-check whenever checklist updates (copyEmbed sets bb_embed_copied)
  var _origUpdateChecklist = window.updateChecklist;
  if (typeof _origUpdateChecklist === 'function') {
    window.updateChecklist = function(count) {
      _origUpdateChecklist(count);
      refreshGoLiveBanner();
    };
  }
})();
```

---

## PART 5 — PRODUCTS TAB: IMPROVE WOO / CUSTOM SEPARATION CLARITY

### 5a. Improve the store type switcher text

Find the two `<button>` elements inside `.store-type-switcher`:

Button 1 (id="sts-woo"): Change label text from `🔌 WooCommerce store` to `🔌 WooCommerce`  
Button 2 (id="sts-custom"): Change label text from `📋 Manual / custom store` to `📋 Manual / CSV`

**Keep all onclick attributes unchanged.**

### 5b. Add a context banner for each view

Inside `<div id="products-woo-view">`, immediately after the opening div tag, add:

```html
<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.2);border-radius:10px;margin-bottom:16px;font-size:12px;color:#818cf8;">
  <span style="font-size:16px;flex-shrink:0;">🔌</span>
  <span><strong style="color:#a5b4fc;">WooCommerce mode.</strong> Your products sync automatically from WordPress. To add or edit products, use your WordPress admin panel.</span>
</div>
```

Find `<div id="products-custom-view">` (the manual/CSV section). Immediately after its opening tag, add:

```html
<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;margin-bottom:16px;font-size:12px;color:#6ee7b7;">
  <span style="font-size:16px;flex-shrink:0;">📋</span>
  <span><strong style="color:#a7f3d0;">Manual mode.</strong> Add products one by one or upload a CSV file. You manage everything from here.</span>
</div>
```

---

## PART 6 — SETTINGS TAB: ADD SUB-TAB NAVIGATION

**Target:** `<div id="tab-content-settings">` — add a visual sub-tab switcher at the top to group the settings cards.

### 6a. Add the sub-tab switcher HTML

Immediately after `<div class="section-sub">Manage your account and platform preferences.</div>` inside the settings tab, insert:

```html
<!-- Settings sub-tabs (visual only — all cards stay in DOM, JS toggles display) -->
<div style="display:flex;gap:4px;background:rgba(255,255,255,0.04);border-radius:10px;padding:4px;width:fit-content;margin-bottom:22px;" id="settings-subtabs">
  <button onclick="switchSettingsTab('widget')"  id="stab-widget"  class="sts-btn sts-active" style="font-size:12px;padding:6px 16px;">🎨 Widget</button>
  <button onclick="switchSettingsTab('store')"   id="stab-store"   class="sts-btn"            style="font-size:12px;padding:6px 16px;">🏪 Store</button>
  <button onclick="switchSettingsTab('account')" id="stab-account" class="sts-btn"            style="font-size:12px;padding:6px 16px;">👤 Account</button>
</div>
```

### 6b. Wrap the existing settings cards into groups

The settings tab currently has these cards (do not change their HTML content, only wrap them):

**Widget group** = the brand color card + currency card + widget preview (anything related to how the widget looks)  
**Store group** = the store type selector card  
**Account group** = Profile card + Security card + Danger Zone card  

Wrap each group in a div:

```html
<div id="settings-panel-widget">
  <!-- all widget/appearance cards go here -->
</div>
<div id="settings-panel-store" style="display:none;">
  <!-- store type card goes here -->
</div>
<div id="settings-panel-account" style="display:none;">
  <!-- profile, security, danger zone cards go here -->
</div>
```

**Important:** Do not change any `id` attributes on the cards themselves. Only wrap them.

### 6c. Add the switchSettingsTab function

Add this function **at the very bottom of the last `<script>` block**, before the closing `</script>` tag:

```javascript
function switchSettingsTab(name) {
  var panels = ['widget','store','account'];
  panels.forEach(function(p) {
    var el = document.getElementById('settings-panel-' + p);
    var btn = document.getElementById('stab-' + p);
    if (el) el.style.display = (p === name) ? 'block' : 'none';
    if (btn) {
      btn.classList.toggle('sts-active', p === name);
    }
  });
}
```

---

## PART 7 — BILLING TAB: IMPROVE VISUAL PAYMENT STEPS

**Target:** `<div id="tab-content-billing">` — improve the payment instructions card only.

Find this block inside the billing tab:
```html
<div class="card" style="background:#0f1117;margin-bottom:16px;">
  <h2 style="font-size:15px;margin-bottom:12px;">Payment Instructions</h2>
  <p style="font-size:13px;color:var(--muted);line-height:1.8;">
    1. Send payment to JazzCash: <strong style="color:#fff;">0300-1234567</strong>...
  </p>
</div>
```

Replace **only the content inside that card** (keep the outer `<div class="card">` wrapper) with:

```html
<h2 style="font-size:15px;margin-bottom:16px;">How to Pay</h2>
<div style="display:flex;flex-direction:column;gap:12px;">
  <div style="display:flex;gap:14px;align-items:flex-start;">
    <div style="width:28px;height:28px;border-radius:50%;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#818cf8;flex-shrink:0;">1</div>
    <div>
      <div style="font-size:13px;font-weight:600;color:var(--dash-text,#e8e8f0);margin-bottom:3px;">Send payment</div>
      <div style="font-size:12px;color:var(--dash-muted,#6b6d82);line-height:1.7;">
        JazzCash: <strong style="color:#e8e8f0;">0300-1234567</strong>&nbsp;&nbsp;or&nbsp;&nbsp;EasyPaisa: <strong style="color:#e8e8f0;">0333-1234567</strong><br/>
        Account name: <strong style="color:#e8e8f0;">BuildBot PK</strong>
      </div>
    </div>
  </div>
  <div style="display:flex;gap:14px;align-items:flex-start;">
    <div style="width:28px;height:28px;border-radius:50%;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#818cf8;flex-shrink:0;">2</div>
    <div>
      <div style="font-size:13px;font-weight:600;color:var(--dash-text,#e8e8f0);margin-bottom:3px;">Copy your transaction ID</div>
      <div style="font-size:12px;color:var(--dash-muted,#6b6d82);">After payment, JazzCash / EasyPaisa shows a Transaction Reference ID. Copy it.</div>
    </div>
  </div>
  <div style="display:flex;gap:14px;align-items:flex-start;">
    <div style="width:28px;height:28px;border-radius:50%;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#818cf8;flex-shrink:0;">3</div>
    <div>
      <div style="font-size:13px;font-weight:600;color:var(--dash-text,#e8e8f0);margin-bottom:3px;">Paste it below &amp; submit</div>
      <div style="font-size:12px;color:var(--dash-muted,#6b6d82);">We verify manually and activate your plan within 24 hours. You'll receive a confirmation email.</div>
    </div>
  </div>
</div>
```

---

## PART 8 — ANALYTICS TAB: ADD DATE-RANGE SELECTOR UI

**Target:** `<div id="tab-content-analytics">` — find the section title at the top of this tab.

After the `.section-sub` paragraph in the analytics tab, add a date-range selector row (visual only — filter logic is already handled by existing `loadAnalytics` function):

```html
<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
  <button class="btn btn-sm" id="analytics-range-7"  onclick="setAnalyticsRange(7,this)"  style="background:rgba(99,102,241,0.15);color:#818cf8;border-color:rgba(99,102,241,0.3);">Last 7 days</button>
  <button class="btn btn-sm" id="analytics-range-30" onclick="setAnalyticsRange(30,this)" style="background:transparent;color:var(--muted);">Last 30 days</button>
  <button class="btn btn-sm" id="analytics-range-all" onclick="setAnalyticsRange(0,this)" style="background:transparent;color:var(--muted);">All time</button>
  <span style="margin-left:auto;font-size:12px;color:var(--muted);" id="analytics-range-label">Showing: last 7 days</span>
</div>
```

Add this helper function at the bottom of the last `<script>` block:

```javascript
function setAnalyticsRange(days, btn) {
  // Update active button style
  ['analytics-range-7','analytics-range-30','analytics-range-all'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.background = 'transparent';
    el.style.color = 'var(--muted)';
    el.style.borderColor = '';
  });
  if (btn) {
    btn.style.background = 'rgba(99,102,241,0.15)';
    btn.style.color = '#818cf8';
    btn.style.borderColor = 'rgba(99,102,241,0.3)';
  }
  var lbl = document.getElementById('analytics-range-label');
  if (lbl) lbl.textContent = days === 0 ? 'Showing: all time' : 'Showing: last ' + days + ' days';
  // The actual data reload uses the existing loadAnalytics function
  loadAnalytics();
}
```

---

## PART 9 — HELP TAB: ADD CONTEXTUAL FAQ TOOLTIPS

**Target:** Each tab's content div — add a contextual help icon in the section header area.

For each of these tabs, find the `.section-title` div and add a help icon button immediately after the title text (not replacing anything):

**Products tab** (`tab-content-products`):
```html
<span onclick="toggleContextHelp('help-products')" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:1px solid var(--border);font-size:11px;color:var(--muted);cursor:pointer;margin-left:10px;vertical-align:middle;" title="Help">?</span>
<div id="help-products" style="display:none;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:12px 16px;margin:8px 0 16px;font-size:12px;color:#818cf8;line-height:1.8;">
  <strong style="color:#a5b4fc;">Common questions:</strong><br/>
  • <strong>WooCommerce not syncing?</strong> Ensure the plugin is installed, activated, and the secret key matches.<br/>
  • <strong>How often do products sync?</strong> Automatically every 6 hours, or click "Sync now" for immediate update.<br/>
  • <strong>Can I add products manually if I use WooCommerce?</strong> Switch to Manual mode using the tab switcher above.
</div>
```

**Embed tab** (`tab-content-embed`):
```html
<span onclick="toggleContextHelp('help-embed')" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:1px solid var(--border);font-size:11px;color:var(--muted);cursor:pointer;margin-left:10px;vertical-align:middle;" title="Help">?</span>
<div id="help-embed" style="display:none;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:12px 16px;margin:8px 0 16px;font-size:12px;color:#818cf8;line-height:1.8;">
  <strong style="color:#a5b4fc;">Common questions:</strong><br/>
  • <strong>Where do I paste the code?</strong> Paste it just before the &lt;/body&gt; tag in your website's HTML or theme file.<br/>
  • <strong>Works on Shopify?</strong> Yes — paste into your theme.liquid file before &lt;/body&gt;.<br/>
  • <strong>Widget not appearing?</strong> Check that the script tag is on every page, not just the homepage.
</div>
```

Add this function at the bottom of the last `<script>` block:

```javascript
function toggleContextHelp(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
```

---

## FINAL VERIFICATION CHECKLIST FOR CURSOR

After making all changes, verify each of these before considering the task complete:

- [ ] `showPage('landing')`, `showPage('signup')`, `showPage('login')` still navigate correctly
- [ ] `showTab('home')`, `showTab('products')`, `showTab('analytics')`, `showTab('embed')`, `showTab('billing')`, `showTab('settings')`, `showTab('help')` all still work
- [ ] `loadAnalytics()` still runs on dashboard load
- [ ] `loadWooStatus()` still runs when embed tab opens
- [ ] `updateChecklist()`, `updateHealthBar()`, `updateSidebarProductCount()`, `updateSidebarUser()`, `updateStoreTypeUI()` all still function (their target IDs unchanged)
- [ ] `copyEmbed()` still works (ID `product-modal`, `embed-code-display` or equivalent unchanged)
- [ ] `saveProduct()`, `loadProducts()`, `filterProducts()` still work (product table IDs unchanged)
- [ ] `switchProductView('woo')` and `switchProductView('custom')` still toggle `products-woo-view` / `products-custom-view` correctly
- [ ] `submitPayment()` still reads `#pay-method`, `#pay-ref`
- [ ] `changePassword()` still reads `#cp-current`, `#cp-new`, `#cp-confirm`
- [ ] `doLogout()` still fires on logout click
- [ ] The landing page, signup, and login pages look completely unchanged
- [ ] The `#trial-banner` hidden div with `#trial-end-date` still exists in the DOM
- [ ] `#sb-store-type-label` ID still exists (JS writes to it)
- [ ] `#sb-user-name`, `#sb-user-plan`, `#sb-avatar-initials` IDs unchanged
- [ ] No CSS from `#page-app` scoped rules leaks into `#page-landing`, `#page-signup`, or `#page-login`

---

## SUMMARY OF WHAT THIS PROMPT CHANGES

| Part | What changes | What does NOT change |
|------|-------------|---------------------|
| 1 | Dashboard color palette (indigo/dark theme) | Landing/auth colors |
| 2 | Sidebar item order + section labels | All IDs, onclick events |
| 3 | Store type chip sub-text | `sb-store-type-label` ID |
| 4 | Go Live banner on Overview (HTML + 1 JS wrapper) | `copyEmbed()` function |
| 5 | Products tab context banners | `switchProductView()` logic |
| 6 | Settings sub-tab navigation | All settings card IDs |
| 7 | Billing payment steps visual | `submitPayment()` function |
| 8 | Analytics date-range UI (visual toggle only) | `loadAnalytics()` function |
| 9 | Contextual help FAQ dropdowns | Nothing functional |
