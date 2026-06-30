import re
f = open("E:/code/jmcomic-ios/apk_analysis/assets/public/static/js/main.ec54a949.js", "r", encoding="utf-8", errors="ignore")
c = f.read()

# Search for token + header construction patterns
idx = c.find("token:"185Hcomic3PAPP7R"")
# Look for where token and tokenparam are used in headers
# Search around the API URL mappings for the header construction
start = max(0, idx - 50)
end = min(len(c), idx + 5000)
chunk = c[start:end]

# Find where the token/tokenparam are actually used (as strings in code)
# Look for "token" and "tokenparam" near each other
for m in re.finditer(r"token[^,}]{0,200}tokenparam", chunk):
    print("=== Token Header Construction ===")
    print(m.group()[:500])
    print()
    break

# Also look for actual fetch/ajax call pattern
for m in re.finditer(r"fetch\([^)]+\)", c[:500000]):
    ctx = c[max(0,m.start()-200):m.end()+200]
    if "token" in ctx or "header" in ctx.lower():
        print("=== fetch with token ===")
        print(ctx[:500])
        print()
        break

