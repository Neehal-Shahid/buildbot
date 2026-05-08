import pathlib
t=pathlib.Path("index.html").read_text(encoding="utf-8")
s=t.find("<div class=\"page\" id=\"page-app\">")
print("start",s)
print("next_script", t.find("<script", s) if s!=-1 else -1)
