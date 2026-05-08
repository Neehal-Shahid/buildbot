import re, pathlib
p = pathlib.Path('index.html')
text = p.read_text(encoding='utf-8')

# --- Dashboard HTML
html_start = text.find('<div class="page" id="page-app">')
if html_start == -1:
    raise SystemExit('Could not find dashboard HTML start')
html_end = text.find('</div><!-- end page-app -->', html_start)
if html_end == -1:
    raise SystemExit('Could not find dashboard HTML end')
html_end += len('</div><!-- end page-app -->')
dash_html = text[html_start:html_end]

# --- Style
style_m = re.search(r'<style>([\s\S]*?)</style>', text, re.IGNORECASE)
if not style_m:
    raise SystemExit('Could not find <style> block')
style_full = style_m.group(1)

# Dashboard override section (explicit)
idx = style_full.lower().find('dashboard theme override')
if idx == -1:
    raise SystemExit('Could not find DASHBOARD THEME OVERRIDE section')
comment_start = style_full.rfind('/*', 0, idx)
if comment_start == -1:
    raise SystemExit('Could not locate start of dashboard theme comment')
css_dashboard_override = style_full[comment_start:]

# Dashboard core blocks by comment markers
markers = [
    ('/* ── SIDEBAR LAYOUT ── */', '/* ── FORMS ── */'),
    ('/* ── CARDS ── */', '/* ── FORMS ── */'),
    ('/* ── STAT CARDS ── */', '/* ── FORMS ── */'),
    ('/* ── TOASTS ── */', '/* ── ALERTS ── */'),
]
css_dashboard_core = ''
for a,b in markers:
    ia = style_full.find(a)
    ib = style_full.find(b, ia+1) if ia!=-1 else -1
    if ia!=-1 and ib!=-1:
        css_dashboard_core += style_full[ia:ib]

mod_ia = style_full.find('/* ── MODALS ── */')
if mod_ia!=-1:
    mod_ib = style_full.find('/* ── LANDING', mod_ia)
    if mod_ib==-1:
        mod_ib = len(style_full)
    css_dashboard_core += style_full[mod_ia:mod_ib]

css_dashboard = (css_dashboard_core + '\n\n' + css_dashboard_override).strip() + '\n'

# Remove those dashboard css parts from index style
style_new = style_full
# remove override tail
style_new = style_new[:comment_start].rstrip() + '\n'
# remove core blocks
for a,b in markers:
    ia = style_new.find(a)
    ib = style_new.find(b, ia+1) if ia!=-1 else -1
    if ia!=-1 and ib!=-1:
        style_new = style_new[:ia] + style_new[ib:]
# remove modals block
mod_ia2 = style_new.find('/* ── MODALS ── */')
if mod_ia2!=-1:
    mod_ib2 = style_new.find('/* ── LANDING', mod_ia2)
    if mod_ib2!=-1:
        style_new = style_new[:mod_ia2] + style_new[mod_ib2:]

text2 = text[:style_m.start(1)] + style_new + text[style_m.end(1):]

# --- Inline script (the big one). Take the last <script>...</script> without src attribute.
# This avoids matching external scripts in <head>.
script_blocks = list(re.finditer(r'<script>([\s\S]*?)</script>', text2, re.IGNORECASE))
if not script_blocks:
    raise SystemExit('Could not find inline <script> block')
script_m = script_blocks[-1]
script_full = script_m.group(1)

enter_idx = script_full.find('// ─── ENTER APP')
if enter_idx == -1:
    raise SystemExit('Could not find ENTER APP marker')
dash_js = script_full[enter_idx:].strip() + '\n'

# Keep everything before ENTER APP in index
script_new = script_full[:enter_idx].rstrip() + '\n\n    // Dashboard logic moved to dashboard.html\n'

# Redirect any successful "enterApp()" transitions to dashboard.html
script_new = re.sub(r"\benterApp\(\)\s*;", "window.location.href = 'dashboard.html';", script_new)

# Replace inline script
text3 = text2[:script_m.start(1)] + script_new + text2[script_m.end(1):]

# Remove dashboard HTML block
text_index_new = text3[:html_start] + "\n  <!-- DASHBOARD moved to dashboard.html -->\n" + text3[html_end:]

p.write_text(text_index_new, encoding='utf-8')

# --- Build dashboard.html
# Extract needed shared CSS from original style_full
root_m = re.search(r':root\s*\{[\s\S]*?\}', style_full)
root_css = root_m.group(0) if root_m else ''
body_css_m = re.search(r'body\s*\{[\s\S]*?\}', style_full)
body_css = body_css_m.group(0) if body_css_m else ''
pages_css_m = re.search(r'/\*\s*──\s*PAGES\s*──\s*\*/[\s\S]*?(?=/\*\s*──\s*NAV\s*──\s*\*/)', style_full)
pages_css = pages_css_m.group(0) if pages_css_m else ''
nav_css_m = re.search(r'/\*\s*──\s*NAV\s*──\s*\*/[\s\S]*?(?=/\*\s*──\s*SIDEBAR LAYOUT\s*──\s*\*/)', style_full)
nav_css = nav_css_m.group(0) if nav_css_m else ''

# Shared blocks dashboard still needs
shared_blocks = []
for (a,b) in [
    ('/* ── FORMS ── */','/* ── BUTTONS ── */'),
    ('/* ── BUTTONS ── */','/* ── BUTTON LOADING ── */'),
    ('/* ── BUTTON LOADING ── */','/* ── TOASTS ── */'),
    ('/* ── ALERTS ── */','/* ── LANDING ── */'),
]:
    ia = style_full.find(a)
    ib = style_full.find(b, ia+1) if ia!=-1 else -1
    if ia!=-1 and ib!=-1:
        shared_blocks.append(style_full[ia:ib])
shared_css = '\n'.join(shared_blocks)

full_dash_css = "\n\n".join([root_css, body_css, pages_css, nav_css, css_dashboard, shared_css]).strip() + "\n"

nav_html = """
  <nav id=\"main-nav\">
    <div class=\"nav-logo\" onclick=\"window.location.href='index.html'\">⚡ BuildBot</div>
    <div class=\"nav-links\" id=\"nav-links\" style=\"display:none\"></div>
    <div class=\"nav-user\" id=\"nav-user\" style=\"display:none\"></div>
  </nav>
""".strip("\n")

dash_boot = """
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

# Logout should leave dashboard and return to index
patched_dash_js = dash_js.replace("showPage('landing');", "window.location.href = 'index.html';")

out = f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>BuildBot – Dashboard</title>
  <link href=\"https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Poppins:wght@300;400;500;600&display=swap\" rel=\"stylesheet\">
  <style>
{full_dash_css}
  </style>
  <script src=\"config.js\"></script>
</head>
<body class=\"dashboard-mode\">
{nav_html}

{dash_html}

  <script>
{dash_boot}

{patched_dash_js}
  </script>
</body>
</html>
"""
pathlib.Path('dashboard.html').write_text(out, encoding='utf-8')

print('OK: separated dashboard')
