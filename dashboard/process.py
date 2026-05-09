import re
import os

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. CSS SYSTEM
# Delete all existing :root blocks and add the new one.
# Find <style> and replace everything up to the first '}' with the new :root
new_root = """    :root {
      --bg: #f4f6fb; --surface: #ffffff; --surface-2: #f0f3fa;
      --border: #e2e8f0; --border-2: #cbd5e1;
      --text: #0f172a; --muted: #64748b; --dim: #94a3b8;
      --accent: #4f46e5; --accent-hover: #4338ca;
      --accent-bg: rgba(79,70,229,0.08); --accent-text: #4338ca;
      --success: #059669; --success-bg: rgba(5,150,105,0.08);
      --warning: #d97706; --warning-bg: rgba(217,119,6,0.08);
      --danger: #dc2626; --danger-bg: rgba(220,38,38,0.08);
      --info: #0284c7; --info-bg: rgba(2,132,199,0.08);
      --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 18px;
      --shadow-sm: 0 1px 3px rgba(15,23,42,0.06);
      --shadow-md: 0 4px 12px rgba(15,23,42,0.08);
      --font: 'Inter', 'Poppins', 'Segoe UI', sans-serif;
      --font-heading: 'Inter', 'Montserrat', sans-serif;
    }"""

# Remove all :root { ... }
content = re.sub(r':root\s*\{[^}]*\}', '', content)
# Add the new root after <style>
content = content.replace('<style>', '<style>\n' + new_root)

# Replace all hardcoded hex colors
colors = {
    r'#0f1117': 'var(--bg)', r'#1a1d27': 'var(--surface)', r'#2a2d3e': 'var(--border)',
    r'#7c6af7': 'var(--accent)', r'#6c5ce7': 'var(--accent)', r'#4f46e5': 'var(--accent)',
    r'#4338ca': 'var(--accent-hover)', r'#5b4fe0': 'var(--accent-hover)',
    r'#2ecc71': 'var(--success)', r'#059669': 'var(--success)',
    r'#e74c3c': 'var(--danger)', r'#dc2626': 'var(--danger)',
    r'#667085': 'var(--muted)', r'#888888': 'var(--muted)', r'#888': 'var(--muted)',
    r'#027a48': 'var(--success)', r'#344054': 'var(--text)'
}
for hex_col, var in colors.items():
    content = re.sub(hex_col + r'(?![a-zA-Z0-9])', var, content, flags=re.IGNORECASE)

# 2. Component Standards
# Add new standard component CSS inside <style>
standards_css = """
    .btn { padding: 9px 18px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid var(--border-2); background: var(--surface); color: var(--text); transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
    .btn:hover { background: var(--surface-2); }
    .btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
    .btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
    .btn-danger { background: var(--danger); color: #fff; border-color: var(--danger); }
    .btn-outline { background: transparent; color: var(--accent); border-color: var(--accent); }
    .btn-outline:hover { background: var(--accent-bg); }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
    .badge-success { background: var(--success-bg); color: var(--success); }
    .badge-warning { background: var(--warning-bg); color: var(--warning); }
    .badge-danger { background: var(--danger-bg); color: var(--danger); }
    .badge-info { background: var(--info-bg); color: var(--info); }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); padding: 24px; margin: 0; }
    input, select, textarea { background: var(--surface); border: 1px solid var(--border-2); border-radius: var(--radius-md); color: var(--text); padding: 9px 12px; font-size: 13px; outline: none; transition: border 0.15s, box-shadow 0.15s; width: 100%; }
    input:focus, select:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
    .empty-state { padding: 48px 24px; text-align: center; }
    .empty-state .es-ic { font-size: 36px; margin-bottom: 12px; opacity: 0.4; }
    .empty-state .es-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
    .empty-state .es-sub { font-size: 13px; color: var(--muted); max-width: 300px; margin: 0 auto 16px; line-height: 1.6; }
    .analytics-range-btn { background: var(--surface); border: 1px solid var(--border-2); color: var(--muted); border-radius: var(--radius-md); padding: 6px 14px; font-size: 12px; cursor: pointer; transition: all 0.15s; }
    .range-btn-active { background: var(--accent-bg); color: var(--accent-text); border-color: rgba(79,70,229,0.25); }
"""
content = content.replace('</style>', standards_css + '\n</style>')

with open('dashboard_updated.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved to dashboard_updated.html")
