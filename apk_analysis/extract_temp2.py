import re
f = open("E:/code/jmcomic-ios/apk_analysis/assets/public/static/js/main.ec54a949.js", "r", encoding="utf-8", errors="ignore")
c = f.read()

# Find token generation for requests 
# Look for patterns like: token:md5(...  or token:...
idx = c.find("18comicAPPContent")
if idx >= 0:
    ctx = c[max(0,idx-200):idx+300]
    print("=== AuthKey Context ===")
    print(ctx)
    print()

# Find how tokenparam is constructed
idx2 = c.find("tokenparam")
if idx2 >= 0:
    ctx = c[max(0,idx2-200):idx2+300]
    print("=== tokenparam Context ===")
    print(ctx)
    print()

# Find the version string  
for m in re.finditer(r"[0-9]+\.[0-9]+\.[0-9]+", c):
    v = m.group()
    ctx = c[max(0,m.start()-50):m.end()+50]
    if "version" in ctx.lower():
        print("Version:", v)

