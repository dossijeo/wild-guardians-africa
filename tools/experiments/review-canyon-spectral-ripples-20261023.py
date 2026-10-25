from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path("docs/qa/global-visual-lab/canyon-spectral-ripples-20261023")
a=json.loads((root/"baseline/captures.json").read_text());b=json.loads((root/"spectral/captures.json").read_text())
checks=[]
for phase in ["day","night"]:
 x=next(r for r in a["records"] if r["variant"]=="native" and r["phase"]==phase)
 y=next(r for r in b["records"] if r["variant"]=="native" and r["phase"]==phase)
 assert not x["errors"] and not y["errors"]
 for i,(u,v) in enumerate(zip(x["frames"],y["frames"])):
  for k in ["camera","target","time","origin","calls","triangles"]:assert u[k]==v[k],(phase,i,k)
  checks.append(dict(phase=phase,view=i,memoryEqual=u["memory"]==v["memory"],baselineMemory=u["memory"],candidateMemory=v["memory"]))
  c=Image.new("RGB",(2560,750),(20,20,20));d=ImageDraw.Draw(c)
  for j,variant in enumerate(["baseline","spectral"]):
   im=Image.open(root/variant/f"gran-canon-media-native-{phase}"/f"{i:04}.png");c.paste(im,(j*1280,30));d.text((j*1280+10,8),variant,fill="white")
  c.save(root/f"comparison-{phase}-{i}.jpg",quality=95)
(root/"checks.json").write_text(json.dumps(checks,indent=2)+"\n",encoding="utf-8")
print(json.dumps(checks,indent=2))
