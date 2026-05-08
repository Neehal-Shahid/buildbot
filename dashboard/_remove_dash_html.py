import pathlib
p=pathlib.Path('index.html')
t=p.read_text(encoding='utf-8')
start=t.find('<div class="page" id="page-app">')
end=t.find('</div><!-- end page-app -->', start)
if start==-1 or end==-1:
    raise SystemExit('Could not find dashboard block to remove')
end += len('</div><!-- end page-app -->')
new = t[:start] + "\n  <!-- DASHBOARD moved to dashboard.html -->\n" + t[end:]
p.write_text(new, encoding='utf-8')
print('OK removed dashboard HTML from index')
