from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path("docs/qa/global-visual-lab/canyon-water-components-20261023")
variants=["baseline","no-environment","no-sun"]
records=[json.loads((root/v/"captures.json").read_text())["records"][0] for v in variants]
checks=[]
for i in range(3):
 c=Image.new("RGB",(3840,750),(20,20,20));d=ImageDraw.Draw(c)
 for j,(v,r) in enumerate(zip(variants,records)):
  assert not r["errors"]
  f=r["frames"][i];a=records[0]["frames"][i]
  for k in ["camera","target","origin","time","calls","triangles","memory"]:assert f[k]==a[k],(v,i,k)
  c.paste(Image.open(root/v/"gran-canon-media-native-day"/f"{i:04}.png"),(j*1280,30));d.text((j*1280+10,8),v,fill="white")
  checks.append(dict(variant=v,view=i,controlsMatched=True,glError=f["glError"]))
 c.save(root/f"components-{i}.jpg",quality=95)
(root/"checks.json").write_text(json.dumps(checks,indent=2)+"\n",encoding="utf-8")
print("All nine captures match scene controls, draw counts and resource counts")
