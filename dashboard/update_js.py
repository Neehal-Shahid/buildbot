import re

def update_js():
    with open('dashboard_updated.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add refreshOverviewState function if it doesn't exist
    if 'function refreshOverviewState' not in content:
        js_func = """
    function refreshOverviewState() {
      const isLive = localStorage.getItem('bb_widget_live') === '1';
      const homeOverview = document.getElementById('home-overview-state');
      const homeActive = document.getElementById('home-active-state');
      if (homeOverview && homeActive) {
        if (isLive) {
          homeOverview.style.display = 'none';
          homeActive.style.display = 'block';
        } else {
          homeOverview.style.display = 'block';
          homeActive.style.display = 'none';
        }
      }
    }
"""
        content = content.replace('// ─── TABS ─────────────────────────────────────────────────', js_func + '\n// ─── TABS ─────────────────────────────────────────────────')

    # Update showTab function to call refreshOverviewState when name === 'home'
    # Find `if (name === 'home')` inside showTab and ensure it calls refreshOverviewState()
    # Or just replace the `if (name === 'home' || name === 'products'` part.
    # We will search for showTab definition and add it.
    show_tab_pattern = r'(function showTab\(name\)\s*\{.*?)(var mobileMap)'
    def replace_show_tab(m):
        code = m.group(1)
        if 'refreshOverviewState();' not in code:
            code += "      if (name === 'home') refreshOverviewState();\n      "
        return code + m.group(2)
    content = re.sub(show_tab_pattern, replace_show_tab, content, flags=re.DOTALL)

    with open('dashboard_updated.html', 'w', encoding='utf-8') as f:
        f.write(content)

update_js()
print("JS updated")
