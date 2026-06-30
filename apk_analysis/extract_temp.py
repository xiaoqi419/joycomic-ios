import re
f = open("E:/code/jmcomic-ios/apk_analysis/assets/public/static/js/main.ec54a949.js", "r", encoding="utf-8", errors="ignore")
c = f.read()
idx = c.find("token:\"185Hcomic3PAPP7R\"")
if idx >= 0:
    chunk = c[idx:idx+3000]
    pairs = re.findall(r"(\w+):\"([^\"]+)\"", chunk)
    print("=== API URL Mappings from APK JS Bundle ===")
    for k, v in pairs:
        print(k + ": \"" + v + "\"")

