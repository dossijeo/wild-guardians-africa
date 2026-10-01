"""Summarize embedded resources without dumping binary payloads."""
import pathlib, re, json

root = pathlib.Path(r"C:\Users\PC\Desktop\Wild Guardians New")
for path in root.glob("*.html"):
    source = path.read_text(encoding="utf-8")
    scripts = []
    for attrs, body in re.findall(r"<script\b([^>]*)>(.*?)</script>", source, re.S | re.I):
        scripts.append({"attrs": attrs[:180], "chars": len(body), "prefix": body[:90] if len(body) < 500000 else "[large payload/code]"})
    print(json.dumps({"file":path.name,"scripts":scripts,"data_urls":len(re.findall(r'data:[^;\s]+;base64,',source))},ensure_ascii=False))
