import pathlib
p=pathlib.Path('dashboard.html')
t=p.read_text(encoding='utf-8')
t=t.replace("showPage('landing');","window.location.href = 'index.html';")
p.write_text(t,encoding='utf-8')
print('OK')
