# BuildBot Dashboard — Premium Redesign Plan
### For Cursor / Developer Implementation

---

## 1. AUDIT: What's Broken Right Now

### Critical Color/Contrast Issues
| Location | Problem |
|---|---|
| `td { border-bottom: 1px solid #1e2130; color: #ccc; }` | Dark table rows — leftover dark theme. On light BG, `#ccc` text is nearly invisible |
| `tr:hover td { background: #1e2130; }` | Dark hover on light theme — completely invisible content |
| `.badge-success { background: #1a3a2a; }` | Dark green badge background — dark-theme remnant, clashes with light surface |
| `.badge-warning { background: #3a2a1a; }` | Same — dark brown badge, broken in light mode |
| `.badge-danger { background: #3a1a1a; }` | Same — dark red badge |
| `.feature h3 { color: #fff; }` | White heading text on white card background |
| `.plan-price { color: #fff; }` | White price text on white card |
| `.auth-box h2 { color: #fff; }` | White heading on white modal |
| `.section-title { color: #fff; }` (duplicate rule) | Overrides the working `.section-title { color: var(--text); }` |
| `color: #a0c4ff` in `.embed-box` | Light blue text on light gray bg — low contrast |
| `color: #555` in product table `<th>` | Gray text hardcoded — ignores CSS variables |
| `color: #fff` on `.pm-total` stat | White font on white card |
| `.upload-area:hover { background: #12141e; }` | Dark background hover on light theme |
| Sidebar logo uses `⚡` emoji | Emoji in sidebar logo |
| All sidebar items use emoji icons | 🏠 📦 📊 💳 ⚙️ ❓ 🚪 — all emojis |
| Mobile tab bar uses emoji | 🏠 🔗 📦 📊 ⚙️ |
| `.trial-banner { background: linear-gradient(135deg, #1a1a3a, #2a1a3a); }` | Dark purple gradient banner — dark theme remnant |
| CSS variables `--accent`, `--success`, `--danger` reference themselves recursively | `--accent: var(--accent)` — never resolves, broken |
| `.journey-card { background: var(--accent-bg); border-color: var(--accent); }` | Purple tinted card — acceptable but inconsistent with minimal light theme |
| Help context boxes use `color: #818cf8` text on `rgba(99,102,241,0.07)` bg | Low contrast purple-on-near-white |
| `plan-opt.selected { background: #1a1a3a; }` | Dark navy on light surface |
| `.embed-box` uses `color: #a0c4ff` (legacy blue) | Not using variables |

### Structural Issues
- CSS variables `--accent`, `--success`, `--danger` are self-referencing (`--accent: var(--accent)`) — they never resolve to any value. All accent/colored elements will be broken.
- Two separate `<style>` blocks exist — one from the original dark-theme era (lines ~554–968) stacked over the light theme styles — causing cascading conflicts.
- Duplicate class definitions (`.btn`, `.badge`, `.modal`, `.section-title`, `.card`) in both blocks — last one wins, often a dark-theme value.
- Multiple `trial-chip-inline` IDs on the same page (duplicate IDs).

---

## 2. DESIGN SYSTEM

### 2.1 Color Tokens — Fix CSS Variables

Replace the entire `:root` block with properly resolved values:

```css
:root {
  /* Backgrounds */
  --bg:          #F7F8FA;
  --surface:     #FFFFFF;
  --surface-2:   #F1F3F7;
  --surface-3:   #E8EBF0;

  /* Borders */
  --border:      #E4E7ED;
  --border-2:    #CDD2DB;

  /* Text */
  --text:        #111827;
  --text-2:      #374151;
  --muted:       #6B7280;
  --dim:         #9CA3AF;

  /* Accent — indigo, single resolved value */
  --accent:         #4F46E5;
  --accent-hover:   #4338CA;
  --accent-light:   #EEF2FF;
  --accent-border:  rgba(79, 70, 229, 0.2);
  --accent-text:    #4338CA;

  /* Semantic */
  --success:        #059669;
  --success-bg:     #ECFDF5;
  --success-border: rgba(5, 150, 105, 0.2);

  --warning:        #D97706;
  --warning-bg:     #FFFBEB;
  --warning-border: rgba(217, 119, 6, 0.2);

  --danger:         #DC2626;
  --danger-bg:      #FEF2F2;
  --danger-border:  rgba(220, 38, 38, 0.2);

  --info:           #0284C7;
  --info-bg:        #F0F9FF;
  --info-border:    rgba(2, 132, 199, 0.2);

  /* Radius */
  --r-sm:  6px;
  --r-md:  8px;
  --r-lg:  12px;
  --r-xl:  16px;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(17, 24, 39, 0.05);
  --shadow-sm: 0 1px 3px rgba(17, 24, 39, 0.07), 0 1px 2px rgba(17, 24, 39, 0.04);
  --shadow-md: 0 4px 12px rgba(17, 24, 39, 0.08), 0 2px 4px rgba(17, 24, 39, 0.04);

  /* Typography */
  --font:         'DM Sans', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
}
```

### 2.2 Typography

**Replace Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- **Body / UI text:** DM Sans — clean, modern, excellent on screens, not overused
- **Monospace (embed code boxes):** JetBrains Mono — premium, highly legible
- Remove Inter, Montserrat, Poppins entirely — they are generic and unneeded

**Type scale:**
```
Page heading:     18px / 700 / --text
Card heading:     15px / 600 / --text  
Body:             13px / 400 / --text-2
Label / Meta:     12px / 500 / --muted
Caption / Tag:    11px / 500 / --dim
```

---

## 3. SIDEBAR REDESIGN

The sidebar is the navigation spine. Make it premium and icon-driven.

### 3.1 Remove ALL Emoji — Replace with SVG Icons

For each nav item, inline an SVG icon (24×24 viewBox, 16px rendered, `stroke-width: 1.75`, Lucide-style):

| Nav Item | SVG Icon Name (Lucide) |
|---|---|
| Overview | `layout-dashboard` |
| Go Live · Widget | `radio` or `zap` |
| Products | `package` |
| Analytics | `bar-chart-2` |
| Billing | `credit-card` |
| Settings | `settings` |
| Help & Docs | `life-buoy` |
| Logout | `log-out` |

### 3.2 Sidebar Structure & CSS

```css
.sidebar {
  width: 232px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* Logo zone */
.sidebar-header {
  padding: 18px 16px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
}
.sidebar-logo-mark {
  width: 28px;
  height: 28px;
  background: var(--accent);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sidebar-logo-mark svg {
  width: 15px;
  height: 15px;
  stroke: #fff;
}
.sidebar-logo-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}

/* Nav sections */
.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sidebar-section-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--dim);
  padding: 10px 8px 4px;
  margin-top: 4px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--r-md);
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--muted);
  transition: background 0.12s, color 0.12s;
  text-decoration: none;
  position: relative;
}
.sidebar-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: currentColor;
  stroke-width: 1.75;
  fill: none;
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
.sidebar-item.active svg {
  stroke: var(--accent);
}

/* Status dot (embed live indicator) */
.sidebar-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning);
  margin-left: auto;
}
.sidebar-status-dot.live {
  background: var(--success);
}

/* Bottom section — user info + logout */
.sidebar-footer {
  padding: 12px 10px;
  border-top: 1px solid var(--border);
}
.sidebar-user {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--r-md);
  margin-bottom: 2px;
}
.sidebar-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  flex-shrink: 0;
}
.sidebar-user-email {
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}
```

### 3.3 Sidebar HTML Structure

```html
<aside class="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-logo-mark">
      <!-- Zap SVG icon -->
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    </div>
    <span class="sidebar-logo-name">BuildBot</span>
  </div>

  <nav class="sidebar-nav">
    <span class="sidebar-section-label">Get Started</span>
    
    <div class="sidebar-item active" onclick="showTab('home')" id="tab-home">
      <!-- layout-dashboard SVG -->
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      Overview
    </div>

    <div class="sidebar-item" onclick="showTab('embed')" id="tab-embed">
      <!-- radio SVG -->
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M20.07 4.93a10 10 0 0 1 0 14.14"/><path d="M3.93 19.07a10 10 0 0 1 0-14.14"/></svg>
      Go Live · Widget
      <span class="sidebar-status-dot" id="embed-status-dot"></span>
    </div>

    <span class="sidebar-section-label">Workspace</span>

    <div class="sidebar-item" onclick="showTab('products')" id="tab-products">
      <!-- package SVG -->
      <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      Products
    </div>

    <div class="sidebar-item" onclick="showTab('analytics')" id="tab-analytics">
      <!-- bar-chart-2 SVG -->
      <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      Analytics
    </div>

    <span class="sidebar-section-label">Account</span>

    <div class="sidebar-item" onclick="showTab('billing')" id="tab-billing">
      <!-- credit-card SVG -->
      <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      Billing
    </div>

    <div class="sidebar-item" onclick="showTab('settings')" id="tab-settings">
      <!-- settings SVG -->
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      Settings
    </div>

    <div class="sidebar-item" onclick="showTab('help')" id="tab-help">
      <!-- life-buoy SVG -->
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>
      Help & Docs
    </div>
  </nav>

  <div class="sidebar-footer">
    <div class="sidebar-user">
      <div class="sidebar-avatar" id="sidebar-avatar-initials">U</div>
      <span class="sidebar-user-email" id="nav-user-email"></span>
    </div>
    <div class="sidebar-item" onclick="doLogout()">
      <!-- log-out SVG -->
      <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      Logout
    </div>
  </div>
</aside>
```

---

## 4. TOP NAV REDESIGN

Remove the top sticky `<nav>` bar entirely — it duplicates the sidebar logo and adds no value on desktop. The sidebar handles all navigation and identity.

**On mobile**, keep a simplified top bar: just the logo + hamburger icon.

**If you keep the top nav**, clean it up:
```css
nav {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-logo {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}
/* Remove .nav-logo { color: var(--accent); } — use neutral text */
```

**Trial chip in top nav:**
```css
.trial-chip {
  background: var(--warning-bg);
  color: var(--warning);
  border: 1px solid var(--warning-border);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  cursor: pointer;
}
/* Remove: background #1a1a3a, dark gradients */
```

---

## 5. SPECIFIC COMPONENT FIXES

### 5.1 Tables — Fix Completely

The existing table CSS is broken (dark theme leftover). Replace entirely:

```css
/* DELETE these dark-theme rules: */
/* td { border-bottom: 1px solid #1e2130; color: #ccc; } */
/* tr:hover td { background: #1e2130; } */

/* REPLACE with: */
table { width: 100%; border-collapse: collapse; }
th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
td {
  padding: 11px 14px;
  font-size: 13px;
  color: var(--text-2);          /* was: #ccc — FIXED */
  border-bottom: 1px solid var(--border);
}
tbody tr:hover td {
  background: var(--surface-2);  /* was: #1e2130 — FIXED */
}
```

In product table `<th>` tags: remove all hardcoded `color:#555` inline styles — use the class instead.

### 5.2 Badges — Fix Dark Backgrounds

```css
/* DELETE dark badge rules: */
/* .badge-success { background: #1a3a2a; } */
/* .badge-warning { background: #3a2a1a; } */
/* .badge-danger  { background: #3a1a1a; } */
/* .badge-primary { background: #1a1a3a; } */

/* KEEP (from light theme block): */
.badge-success { background: var(--success-bg); color: var(--success); }
.badge-warning { background: var(--warning-bg); color: var(--warning); }
.badge-danger  { background: var(--danger-bg);  color: var(--danger);  }
.badge-info    { background: var(--info-bg);     color: var(--info);    }
.badge-accent  { background: var(--accent-light); color: var(--accent); }
```

### 5.3 Trial Banner — Fix Dark Gradient

```css
/* DELETE: */
/* .trial-banner { background: linear-gradient(135deg, #1a1a3a, #2a1a3a); border: 1px solid var(--primary); } */

/* REPLACE with: */
.trial-banner {
  background: var(--warning-bg);
  border: 1px solid var(--warning-border);
  border-radius: var(--r-lg);
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
.trial-banner p { font-size: 13px; color: var(--text-2); }
.trial-banner strong { color: var(--warning); font-weight: 600; }
```

### 5.4 Section Titles — Fix White Text

Remove the duplicate `.section-title { color: #fff; }` rule from the legacy block. Only keep:
```css
.section-title { font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.section-sub   { font-size: 13px; color: var(--muted); margin-bottom: 20px; line-height: 1.55; }
```

### 5.5 Auth Box — Fix White on White Headings

```css
/* DELETE: .auth-box h2 { color: #fff; } */
.auth-box h2 { font-size: 20px; color: var(--text); margin-bottom: 6px; }
```

### 5.6 Feature Cards — Fix White on White

```css
/* DELETE: .feature h3 { color: #fff; } */
.feature h3 { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
```

### 5.7 Plan Price — Fix White on White

```css
/* DELETE: .plan-price { color: #fff; } */
.plan-price { font-size: 30px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
```

### 5.8 Plan Selector Selected State — Fix Dark Blue

```css
/* DELETE: .plan-opt.selected { background: #1a1a3a; } */
.plan-opt.selected {
  border-color: var(--accent);
  background: var(--accent-light);
}
.plan-opt .po-name { color: var(--text); } /* was: #fff */
```

### 5.9 Upload Area Hover — Fix Dark Hover

```css
/* DELETE: .upload-area:hover { background: #12141e; } */
.upload-area:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}
```

### 5.10 Embed Code Box — Fix Low-Contrast Blue

```css
/* DELETE: color: #a0c4ff in .embed-box */
.embed-code-box {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-2);          /* was: #a0c4ff — FIXED */
  padding: 16px;
  line-height: 1.7;
}
```

### 5.11 Stat Cards — Fix Icons

Replace letter placeholders `R`, `P`, `B`, `D` with inline SVGs:

```html
<!-- Instead of: <div class="stat-icon">R</div> -->
<div class="stat-icon">
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75">
    <!-- Use appropriate Lucide icon per stat -->
  </svg>
</div>
```

Stat icon color should use the variable-based approach:
```css
.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  margin-bottom: 14px;
}
```

Icons per stat:
- Total Recommendations → `trending-up`
- Products in Catalog → `package`
- Avg Customer Budget → `dollar-sign`
- Recommendations Today → `activity`

### 5.12 Empty State — Fix Emoji

```css
/* .empty-state .es-ic { font-size: 36px; } — was emoji */
```
Replace with SVG icon wrapper:
```html
<div class="es-ic">
  <svg viewBox="0 0 24 24" width="36" height="36" stroke="var(--border-2)" fill="none" stroke-width="1.5">
    <!-- inbox or package-open icon -->
  </svg>
</div>
```

### 5.13 Products — Mini Stat Grid (White text on white)

```html
<!-- Change: color:#fff → use var(--text) -->
<div style="font-size:22px;font-weight:700;color:var(--text);" id="pm-total">0</div>
<div style="font-size:22px;font-weight:700;color:var(--success);" id="pm-instock">0</div>
<div style="font-size:22px;font-weight:700;color:var(--danger);" id="pm-outstock">0</div>
<div style="font-size:22px;font-weight:700;color:var(--accent);" id="pm-categories">0</div>
```

### 5.14 Help Context Boxes — Fix Low Contrast Purple

```css
/* Current: color: #818cf8 on rgba(99,102,241,0.07) — too light */
.context-help-box {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 12px 16px;
  font-size: 12.5px;
  color: var(--text-2);           /* readable on any light bg */
  line-height: 1.75;
}
.context-help-box strong { color: var(--text); }
```

### 5.15 Products WooCommerce / Manual Mode Banners

Replace:
```html
<!-- DELETE: <span style="font-size:16px;flex-shrink:0;">🔌</span> -->
<!-- DELETE: <span style="font-size:16px;flex-shrink:0;">📋</span> -->
```

Replace with SVG icon inline:
```html
<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" style="flex-shrink:0;">
  <!-- plug icon for WooCommerce, list icon for manual -->
</svg>
```

And fix background colors from `rgba(99,102,241,0.07); color:#818cf8` to `var(--surface-2); color:var(--muted)`.

### 5.16 CSV Upload Button Label — Fix Dark Hardcoded Colors

```html
<!-- DELETE hardcoded dark styles: -->
<!-- background:var(--border);color:#ccc;border:1px solid #3a3d50 -->

<!-- REPLACE: -->
<label style="
  background: var(--surface);
  color: var(--text-2);
  border: 1px solid var(--border-2);
  padding: 8px 14px;
  border-radius: var(--r-md);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='var(--surface)'">
  <!-- file SVG icon + "Choose File" text -->
</label>
```

### 5.17 Sidebar Bottom Separator — Fix Transparency

```css
/* Current: border-top: 1px solid rgba(255,255,255,0.06) — invisible on white */
.sidebar-footer {
  border-top: 1px solid var(--border);  /* FIXED */
}
```

### 5.18 Journey Card — De-emphasize Purple Tint

```css
/* Replace purple tinted journey card with neutral premium style */
.journey-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 20px;
}
/* Use a left accent stripe instead of full purple bg: */
.journey-card {
  border-left: 3px solid var(--accent);
}
```

---

## 6. MOBILE TABS — Fix Emoji

Replace all mobile tab emoji with SVGs:
```html
<button class="mobile-tab" onclick="showTab('home')">
  <svg class="mobile-tab-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
  Overview
</button>
<!-- Repeat for each tab with appropriate SVG -->
```

---

## 7. CSS CLEANUP STRATEGY

### Step 1: Consolidate the two `<style>` blocks
The file has two `<style>` blocks. The second one (around line 946–968) re-declares `.btn`, `.badge`, `.card`, `.input` etc. Both blocks conflict. **Merge into one `<style>` block at the top of `<head>`.**

### Step 2: Remove all dark-theme rules
Delete any CSS rule containing these hardcoded dark values:
- `#1e2130`, `#12141e`, `#1a1a3a`, `#2a1a3a`, `#1a3a2a`, `#3a2a1a`, `#3a1a1a`, `#3a1a1a`, `#3a3d50`
- `color: #ccc`, `color: #fff` on text/headings inside cards (except `.btn-primary`, badges on dark, which correctly use `#fff`)
- `color: #a0c4ff`
- `color: #818cf8` (too low contrast on light bg)

### Step 3: Remove legacy sections
These are dead code — CSS for a landing page that no longer exists in the HTML body:
- `.hero`, `.hero h1`, `.features`, `.pricing`, `.plans-grid`, `.plan-card`, `.plan-price`, `.plan-name`, `.plan-badge`, `.plan-features` — only remove if the signup/landing page truly doesn't exist

### Step 4: Fix duplicate IDs
`trial-chip-inline` appears twice — give the second one a unique ID or remove the duplicate.

---

## 8. PRIORITY ORDER FOR CURSOR

Fix in this order for maximum visible impact with least risk of breaking JS:

**Critical (visual breakage):**
1. Fix `:root` CSS variables — self-referencing `--accent: var(--accent)` breaks every colored element
2. Fix `td` color and `tr:hover` background (dark on light)
3. Fix `.badge-*` dark backgrounds
4. Fix `section-title { color: #fff }` duplicate rule

**High (contrast violations):**
5. Fix `.trial-banner` dark gradient
6. Fix `.auth-box h2`, `.feature h3`, `.plan-price` white text
7. Fix `.plan-opt.selected` dark navy
8. Fix `.upload-area:hover` dark hover
9. Fix `.embed-code-box` color
10. Fix product mini-stat `color:#fff`
11. Fix `color:#555` in product table `<th>` (inline styles)
12. Fix `color:#818cf8` help boxes
13. Fix sidebar bottom border `rgba(255,255,255,0.06)`

**Polish (no emojis / icons):**
14. Replace sidebar emoji → SVGs
15. Replace mobile tab emoji → SVGs
16. Replace stat card letter icons → SVGs
17. Replace WooCommerce/manual banner emoji → SVGs
18. Replace empty state emoji → SVGs
19. Replace CSV upload emoji → SVG
20. Replace sidebar logo emoji `⚡` → SVG wordmark

**Typography:**
21. Replace Google Fonts import with DM Sans + JetBrains Mono
22. Update `--font` and `--font-heading` variables

---

## 9. WHAT NOT TO CHANGE

- All JavaScript logic — none of this plan touches any JS functions
- `config.js` reference
- Google Sign-In script
- All ID attributes used by JS (`stat-total`, `products-table`, `embed-code-display`, etc.)
- API calls, auth logic, toast system logic
- Analytics chart SVG rendering (`renderAnalyticsLine`)
- Any `onclick` handlers

---

## 10. QUICK REFERENCE — ICON MAP (Lucide SVG paths)

Use these exact SVG paths (stroke-based, no fill):

```
layout-dashboard: <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>

package: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>

bar-chart-2: <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>

credit-card: <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>

settings: <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>

log-out: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>

trending-up: <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>

activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>

dollar-sign: <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>

radio: <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>

life-buoy: <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>

inbox: <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>

upload: <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>

plug: <path d="M7 6V4m10 2V4M5 20h14a1 1 0 0 0 1-1V9H4v10a1 1 0 0 0 1 1z"/><rect x="9" y="12" width="6" height="5"/>

list: <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>

file-text: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
```

All icons: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.75"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.

---

## SUMMARY CHECKLIST FOR CURSOR

- [ ] Fix `:root` CSS variable self-references (accent, success, danger)
- [ ] Merge two `<style>` blocks into one
- [ ] Delete all hardcoded dark color values (#1e2130, #ccc on td, #1a3a2a, #3a2a1a, etc.)
- [ ] Fix table row text and hover backgrounds
- [ ] Fix badge dark backgrounds (all four variants)
- [ ] Fix trial banner dark gradient → warning-bg
- [ ] Fix section-title duplicate rule (white text)
- [ ] Fix auth-box, feature card, plan-price white text
- [ ] Fix plan-opt selected dark navy
- [ ] Fix upload-area dark hover
- [ ] Fix embed-code-box color
- [ ] Fix product mini-stat white text
- [ ] Fix inline color:#555 in product table th
- [ ] Fix help context box purple low-contrast
- [ ] Fix sidebar bottom border (white transparency)
- [ ] Fix CSV upload label hardcoded dark styles
- [ ] Replace Google Fonts → DM Sans + JetBrains Mono
- [ ] Replace ALL emoji in sidebar → SVG icons
- [ ] Replace mobile tab emoji → SVG icons
- [ ] Replace stat card letter placeholders → SVG icons
- [ ] Replace empty state emoji → SVG icons
- [ ] Replace WooCommerce/Manual banner emoji → SVGs
- [ ] Replace CSV upload label emoji → SVG
- [ ] Replace sidebar logo ⚡ → SVG logomark
- [ ] Fix duplicate `trial-chip-inline` ID
- [ ] Add DM Sans font import to `<head>`
