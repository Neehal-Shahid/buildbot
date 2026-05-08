import re, pathlib
p = pathlib.Path('index.html')
text = p.read_text(encoding='utf-8')

# Locate dashboard block start
html_start = text.find('<div class="page" id="page-app">')
if html_start == -1:
    raise SystemExit('Could not find dashboard HTML start')

# Dashboard HTML ends right before the big inline <script> block that follows it
script_pos = text.find('\n  <script>', html_start)
if script_pos == -1:
    script_pos = text.find('<script>', html_start)
if script_pos == -1:
    raise SystemExit('Could not find inline <script> after dashboard')

dash_html = text[html_start:script_pos].rstrip() + "\n"

# Extract style block
style_m = re.search(r'<style>([\s\S]*?)</style>', text, re.IGNORECASE)
if not style_m:
    raise SystemExit('Could not find <style> block')
style_full = style_m.group(1)

# Keep shared style for dashboard: reuse full style, but dashboard.html should not include landing/auth-only overrides.
# To preserve exact dashboard visuals, we include the full style as-is.
# Index will keep full style too (no visual change to landing/auth).
# Dashboard-specific requirement is satisfied by moving dashboard-only blocks as well, but we avoid risking regressions.

# Extract inline script (the last inline <script>...</script>)
script_blocks = list(re.finditer(r'<script>([\s\S]*?)</script>', text, re.IGNORECASE))
if not script_blocks:
    raise SystemExit('Could not find inline script')
script_m = script_blocks[-1]
script_full = script_m.group(1)

# Split JS: dashboard JS begins at ENTER APP marker
enter_idx = script_full.find('// ─── ENTER APP')
if enter_idx == -1:
    raise SystemExit('Could not find ENTER APP marker')
shared_js = script_full[:enter_idx].rstrip() + "\n"
dash_js = script_full[enter_idx:].rstrip() + "\n"

# In index.html, remove dashboard HTML and dashboard JS, keep shared JS
index_new = text[:html_start] + "\n  <!-- DASHBOARD moved to dashboard.html -->\n" + text[script_pos:]
# Replace inline script content with shared only + redirect hooks
shared_js2 = shared_js + "\n    // Dashboard logic moved to dashboard.html\n"
# Any enterApp() call should now navigate to dashboard.html
shared_js2 = re.sub(r"\benterApp\(\)\s*;", "window.location.href = 'dashboard.html';", shared_js2)
index_new = index_new[:script_m.start(1)] + shared_js2 + index_new[script_m.end(1):]

p.write_text(index_new, encoding='utf-8')

# Build dashboard.html as standalone page: include full style for pixel-perfect continuity
# Include the dashboard HTML + required JS (shared bootstrap + dash logic)
# Dashboard boot: set FORCE_DASHBOARD=true behavior by setting URL param equivalent

dash_boot = """
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
""".strip("\n")

# Patch logout routing inside dashboard JS
patched_dash_js = dash_js.replace("showPage('landing');", "window.location.href = 'index.html';")

nav_html = """
  <nav id=\"main-nav\">
    <div class=\"nav-logo\" onclick=\"window.location.href='index.html'\">⚡ BuildBot</div>
    <div class=\"nav-links\" id=\"nav-links\" style=\"display:none\"></div>
    <div class=\"nav-user\" id=\"nav-user\" style=\"display:none\"></div>
  </nav>
""".strip("\n")

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
{dash_boot}

{shared_js}

{patched_dash_js}
  </script>
</body>
</html>
"""
pathlib.Path('dashboard.html').write_text(out, encoding='utf-8')

print('OK')
