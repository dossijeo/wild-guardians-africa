import json,subprocess
from pathlib import Path
root=Path("docs/qa/global-visual-lab/accepted-main-review-20261023")
rows=[]
for biome in ["sabana","gran-rio","manglares","gran-canon","desierto","volcanes"]:
 p=root/biome
 data={b:json.loads((p/b/"captures.json").read_text()) for b in ["main","lab"]}
 for phase in ["day","night"]:
  a,b=[next(r for r in data[v]["records"] if r["phase"]==phase and r["variant"]=="native") for v in ["main","lab"]]
  for x,y in zip(a["frames"],b["frames"]):
   assert all(x[k]==y[k] for k in ["camera","target","time","origin","elapsed","workers"])
   assert not x["glError"] and not y["glError"]
   assert y["farBackground"]["enabled"] and y["farBackground"]["mountainsVisible"]
   assert all(t["ready"] for t in y["farBackground"]["adapters"])
   rows.append(dict(biome=biome,phase=phase,view=x["i"],mainCalls=x["calls"],labCalls=y["calls"],mainTriangles=x["triangles"],labTriangles=y["triangles"],mainFar=x["farBackground"]["enabled"],labFar=y["farBackground"]["enabled"],labQuery=b["query"]))
(root/"summary.json").write_text(json.dumps(rows,indent=2)+"\n",encoding="utf8")
print("36 final pairs verified; lab backgrounds present/ready; final-pass counts only, not performance.")
