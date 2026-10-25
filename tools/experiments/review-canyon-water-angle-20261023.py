from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path("docs/qa/global-visual-lab/canyon-water-angle-20261023")
baseline=Path("docs/qa/global-visual-lab/canyon-spectral-ripples-20261023/baseline")
a=json.loads((baseline/"captures.json").read_text())["records"]
checks=[]
for variant in ["flat-direction","flat-fresnel","grazing"]:
 records=json.loads((root/variant/"captures.json").read_text())["records"]
 for r in records:
  phase=r["phase"];ref=next(x for x in a if x["variant"]=="native" and x["phase"]==phase)
  assert not r["errors"] and not ref["errors"]
  for i,(u,v) in enumerate(zip(ref["frames"],r["frames"])):
   for k in ["camera","target","time","origin","calls","triangles"]:assert u[k]==v[k],(variant,phase,i,k)
   checks.append(dict(variant=variant,phase=phase,view=i,memoryEqual=u["memory"]==v["memory"],glError=v["glError"]))
   if variant=="grazing":
    c=Image.new("RGB",(2560,750),(20,20,20));d=ImageDraw.Draw(c)
    for j,(folder,label) in enumerate([(baseline,"baseline"),(root/variant,"grazing candidate")]):
     c.paste(Image.open(folder/f"gran-canon-media-native-{phase}"/f"{i:04}.png"),(j*1280,30));d.text((j*1280+10,8),label,fill="white")
    c.save(root/f"grazing-{phase}-{i}.jpg",quality=95)
(root/"checks.json").write_text(json.dumps(checks,indent=2)+"\n",encoding="utf-8")
print(json.dumps(checks,indent=2))
