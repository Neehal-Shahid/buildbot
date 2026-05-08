import pathlib
p=pathlib.Path('index.html')
t=p.read_text(encoding='utf-8')
start=t.find('<div class="page" id="page-app">')
if start==-1:
    raise SystemExit('no page-app start')
# find the inline script that follows the dashboard markup
script_open=t.find('\n  <script>', start)
if script_open==-1:
    script_open=t.find('<script>', start)
if script_open==-1:
    raise SystemExit('no script after page-app')
new=t[:start] + "\n  <!-- DASHBOARD moved to dashboard.html -->\n" + t[script_open:]
p.write_text(new,encoding='utf-8')
print('OK removed dashboard HTML')
