import re
f = open("E:/code/jmcomic-ios/apk_analysis/assets/public/static/js/main.ec54a949.js", "r", encoding="utf-8", errors="ignore")
c = f.read()
# Find the area near the API mappings
idx = c.find("token:")
if idx >= 0:
    ctx = c[idx:idx+5000]
    # Find all occurrences of token and tokenparam
    for m in re.finditer(r"token[^,]{0,200}tokenparam", ctx):
        print("=== Token construction ===")
        print(m.group()[:500])
        break
