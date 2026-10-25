import json, statistics, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8",newline="\n")
p=Path("docs/qa/global-visual-lab/continuous-grass-river/combined-validation")
quality=sys.argv[1] if len(sys.argv)>1 else "media"
r=json.loads((p/("benchmarks-"+quality+".json")).read_text(encoding="utf-8"))["records"]
assert len(r)==24
for x in r:
 assert not x["errors"] and x["glError"]==0 and x["cameraStable"]
 assert len(x["gpu"]["samples"])==120 and len(x["cpu"])==120
 assert not x["gpu"]["disjointEvents"] and not x["gpu"]["contextLost"] and not x["gpu"]["pending"]
 assert x["coverage"]["stats"]["overflow"]==0
rows=[]
for view in ["close","game","elevated"]:
 for phase in ["day","night"]:
  a=[x for x in r if x["view"]==view and x["phase"]==phase]
  assert [x["mode"] for x in a]==["original","distance","distance","original"]
  assert all(x["camera"]==a[0]["camera"] and x["target"]==a[0]["target"] and x["time"]==a[0]["time"] for x in a)
  assert len(set(x["coverage"]["near"]+x["coverage"]["far"] for x in a))==1
  row={"view":view,"phase":phase}
  for mode in ["original","distance"]:
   b=[x for x in a if x["mode"]==mode]
   row[mode]={"gpuMedian":statistics.median(s["ms"] for x in b for s in x["gpu"]["samples"]),"cpuMedian":statistics.median(s for x in b for s in x["cpu"]),"triangles":b[0]["coverage"]["triangles"],"calls":b[0]["calls"]}
  row["gpuDelta"]=row["distance"]["gpuMedian"]-row["original"]["gpuMedian"]
  row["baselineDrift"]=statistics.median(s["ms"] for s in a[3]["gpu"]["samples"])-statistics.median(s["ms"] for s in a[0]["gpu"]["samples"])
  rows.append(row)
(p/("timing-summary-"+quality+".json")).write_text(json.dumps({"samples":2880,"rows":rows},indent=2)+"\n",encoding="utf-8",newline="\n")
for row in rows:print(json.dumps(row))
