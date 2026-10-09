from pathlib import Path
import json,hashlib
base=Path(__file__).resolve().parent
summary={"source":"276ea5b5","scope":"G pilot plus Vite ABBA; original variability and negative readiness comparison retained. Human later explicitly accepted G wait/responsiveness tradeoff.","arms":{},"files":{}}
cameras=[]
for arm in ["A1","G1","G2","A2"]:
 p=base/"root-abba-276ea5b5"/(arm+"-report.json");d=json.loads(p.read_text(encoding="utf-8"));assert d["done"] and d["errors"]==[]
 events=d["events"];click=next(e for e in events if e["label"]=="native-continue-click-received");assert click["trusted"] is True
 ready=next(e for e in events if e["label"]=="verified-world-ready");end=next(e for e in events if e["label"]=="controls-ready");assert ready["camera"]==end["camera"];cameras.append(ready["camera"])
 summary["arms"][arm]={"readyMs":d["readyMs"],"totalMs":d["totalMs"],"frames":d["frameSummary"],"snapshot":d["snapshot"]}
assert all(c==cameras[0] for c in cameras)
assert all(row["snapshot"]==summary["arms"]["A1"]["snapshot"] for row in summary["arms"].values())
for name in ["root-pilot-276ea5b5","root-abba-276ea5b5"]:
 for p in sorted((base/name).rglob("*")):
  if p.is_file():summary["files"][str(p.relative_to(base)).replace(chr(92),"/")]={"bytes":p.stat().st_size,"sha256":hashlib.sha256(p.read_bytes()).hexdigest()}
(base/"g-native-verification.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8",newline="\n")
print("Verified four arms, exact snapshot/cameras, complete raw hashes; Vite readiness inconclusive retained.")
