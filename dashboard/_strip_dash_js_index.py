import re, pathlib
p=pathlib.Path('index.html')
t=p.read_text(encoding='utf-8')
blocks=list(re.finditer(r'<script>([\s\S]*?)</script>', t, re.IGNORECASE))
if not blocks:
    raise SystemExit('no inline script')
m=blocks[-1]
js=m.group(1)
enter=js.find('// ─── ENTER APP')
if enter==-1:
    raise SystemExit('no ENTER APP marker')
shared=js[:enter].rstrip()+"\n\n    // Dashboard logic moved to dashboard.html\n"
shared=re.sub(r"\benterApp\(\)\s*;","window.location.href = 'dashboard.html';",shared)
new=t[:m.start(1)]+shared+t[m.end(1):]
p.write_text(new,encoding='utf-8')
print('OK')
