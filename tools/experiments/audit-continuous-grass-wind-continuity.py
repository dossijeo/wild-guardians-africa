import json,math
from pathlib import Path
m=json.loads(Path("public/assets/visual-lab/continuous-grass/modules.json").read_text(encoding="utf-8"))
rows=[]
for blade in range(8):
 for rv,lv in [(0,0),(1,1),(6,2)]:
  a=blade*7+rv;b=blade*3+lv
  flat=m["refined"]["flatPosition"][a*3:a*3+3];light=m["light"]["position"][b*3:b*3+3]
  assert max(abs(x-y) for x,y in zip(flat,light))<1e-12
  for scale in [.65,.9]:
   for wave in [-1,0,1]:
    old=4*wave*(m["refined"]["position"][a*3+1]*scale)**2
    new=4*wave*(flat[1]*scale)**2
    other=4*wave*(light[1]*scale)**2
    rows.append({"blade":blade,"vertex":rv,"scale":scale,"wave":wave,"oldJump":abs(old-other),"newJump":abs(new-other)})
assert max(x["newJump"] for x in rows)<1e-12
out=Path("docs/qa/global-visual-lab/continuous-grass-river/wind-continuity");out.mkdir(parents=True,exist_ok=True)
result={"cases":len(rows),"oldMaxMeters":max(x["oldJump"] for x in rows),"newMaxMeters":max(x["newJump"] for x in rows),"scope":"CPU reference of shared base/tip vertices at lod=0, wind8, farFade=1, wave extrema; not rendered temporal proof or normal continuity", "rows":rows}
(out/"boundary-audit.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8",newline="\n")
print({k:v for k,v in result.items() if k!="rows"})
