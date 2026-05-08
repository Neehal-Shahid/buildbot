import re, pathlib

index_path = pathlib.Path('index.html')
t = index_path.read_text(encoding='utf-8')

# --- Extract dashboard HTML
html_start = t.find('<div class="page" id="page-app">')
if html_start == -1:
    raise SystemExit('Could not find dashboard HTML start')
html_end = t.find('</div><!-- end page-app -->', html_start)
if html_end == -1:
    raise SystemExit('Could not find dashboard HTML end marker')
html_end += len('</div><!-- end page-app -->')
dash_html = t[html_start:html_end]

# --- Extract style
style_m = re.search(r'<style>([\s\S]*?)</style>', t, re.IGNORECASE)
if not style_m:
    raise SystemExit('Could not find <style> block')
style_full = style_m.group(1)

# Remove dashboard CSS from index: the early dashboard layout blocks + dashboard override tail
style_new = style_full

# 1) Remove dashboard layout blocks if present
remove_blocks = [
    ('/* ── SIDEBAR LAYOUT ── */', '/* ── LANDING ── */'),
]
for a,b in remove_blocks:
    ia = style_new.find(a)
    ib = style_new.find(b, ia+1) if ia!=-1 else -1
    if ia!=-1 and ib!=-1:
        # Keep everything before dashboard layout, and from landing onward
        style_new = style_new[:ia] + style_new[ib:]

# 2) Remove explicit dashboard override section (scoped to #page-app)
over_idx = style_new.lower().find('dashboard theme override')
if over_idx != -1:
    over_start = style_new.rfind('/*', 0, over_idx)
    if over_start != -1:
        style_new = style_new[:over_start].rstrip() + "\n"

# --- Extract inline script (the one after dashboard section)
script_open = t.find('\n  <script>', html_end)
if script_open == -1:
    script_open = t.find('<script>', html_end)
if script_open == -1:
    raise SystemExit('Could not find inline <script> after dashboard')
script_close = t.find('</script>', script_open)
if script_close == -1:
    raise SystemExit('Could not find closing </script>')
script_close += len('</script>')

script_tag = t[script_open:script_close]
script_inner_m = re.search(r'<script>([\s\S]*?)</script>', script_tag, re.IGNORECASE)
if not script_inner_m:
    raise SystemExit('Could not parse inline script')
script_full = script_inner_m.group(1)

enter_idx = script_full.find('// ─── ENTER APP')
if enter_idx == -1:
    raise SystemExit('Could not find ENTER APP marker')
shared_js = script_full[:enter_idx].rstrip() + "\n"
dash_js = script_full[enter_idx:].rstrip() + "\n"

# Extract shared helper functions required by auth/landing that are defined later in the file.
# We keep these in index as well (they will also be present in dashboard).
helper_snippets = []
for fn in ['escHtml', 'showAlert']:
    m = re.search(rf'\n\s*function\s+{fn}\s*\([^\)]*\)\s*\{{[\s\S]*?\n\s*\}}\n', dash_js)
    if m:
        helper_snippets.append(m.group(0).rstrip())

helpers_js = "\n\n".join(helper_snippets).strip()

# Build new index inline script: shared + helpers + note. Redirect any enterApp() call to dashboard.html.
index_js = shared_js
if helpers_js:
    index_js += "\n\n" + helpers_js + "\n"
index_js += "\n    // Dashboard logic moved to dashboard.html\n"
index_js = re.sub(r"\benterApp\(\)\s*;", "window.location.href = 'dashboard.html';", index_js)

index_script_new = f"\n  <script>\n{index_js}\n  </script>"

# Remove dashboard HTML from index and replace script and style
# Replace style block content
index_new = t[:style_m.start(1)] + style_new + t[style_m.end(1):]

# Remove dashboard html
index_new = index_new[:html_start] + "\n  <!-- DASHBOARD moved to dashboard.html -->\n" + index_new[html_end:]

# Replace inline script tag (exact region)
index_new = index_new[:script_open] + index_script_new + index_new[script_close:]

index_path.write_text(index_new, encoding='utf-8')

# --- Build dashboard.html
# Keep full dashboard CSS (exactly as before) but scoped removal is not necessary; simplest is include full style_full
# so dashboard looks identical.

# Create a dashboard-only nav compatible with existing ids.
nav_html = """
  <nav id=\"main-nav\">
    <div class=\"nav-logo\" onclick=\"window.location.href='index.html'\">⚡ BuildBot</div>
    <div class=\"nav-links\" id=\"nav-links\" style=\"display:none\"></div>
    <div class=\"nav-user\" id=\"nav-user\" style=\"display:none\"></div>
  </nav>
""".strip("\n")

# Dashboard boot: dashboard entry should behave like FORCE_DASHBOARD
boot_js = """
    const FORCE_DASHBOARD = true;
    const API = window.BB_API || 'https://buildbot-production.up.railway.app/api';
    let token = localStorage.getItem('bb_token');
    function readStoreFromStorage() {
      try {
        return JSON.parse(localStorage.getItem('bb_store') || 'null');
      } catch {
        localStorage.removeItem('bb_store');
        return null;
      }
    }
    let currentStore = readStoreFromStorage();
    let selectedPlan = 'starter';

    if (!token || !currentStore) {
      window.location.href = 'index.html?dashboard=1';
    }
""".strip("\n")

# Patch logout route so dashboard logout returns to index
patched_dash_js = dash_js.replace("showPage('landing');", "window.location.href = 'index.html';")

# The dashboard page needs some shared JS functions too (showPage is referenced by doLogout in some flows).
# We include shared_js plus dashboard js.

out = f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>BuildBot – Dashboard</title>
  <link href=\"https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Poppins:wght@300;400;500;600&display=swap\" rel=\"stylesheet\">
  <script src=\"https://unpkg.com/three@0.160.0/build/three.min.js\"></script>
  <style>
{style_full}
  </style>
  <script src=\"config.js\"></script>
  <script src=\"https://accounts.google.com/gsi/client\" async defer></script>
</head>
<body class=\"dashboard-mode\">
{nav_html}

{dash_html}

  <script>
{boot_js}

{shared_js}

{patched_dash_js}
  </script>
</body>
</html>
"""

pathlib.Path('dashboard.html').write_text(out, encoding='utf-8')
print('OK: split complete')
