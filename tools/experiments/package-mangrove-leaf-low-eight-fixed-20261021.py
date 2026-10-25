from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path("docs/qa/global-visual-lab/mangrove-leaf-low-eight-fixed-20261021")
for case in ["."]:
 data=json.loads((root/case/"captures.json").read_text());r={(a["variant"],a["phase"]):a for a in data["records"]}
 for phase in ["day","night"]:
  sheet=Image.new("RGB",(1280,1146),(20,20,20));draw=ImageDraw.Draw(sheet)
  for i in range(3):
   a,b=r["base",phase]["frames"][i],r["combined",phase]["frames"][i]
   for key in ["camera","target","time"]: assert a[key]==b[key],key
   assert b["coverage"]["triangles"]==2*a["coverage"]["triangles"]
   for key in ["near","far"]: assert a["coverage"][key]==b["coverage"][key]
   for col,variant in enumerate(["base","combined"]):
    im=Image.open(root/case/f"manglares-baja-{variant}-{phase}/{i:04}.png")
    sheet.paste(im.resize((640,360)),(col*640,i*382+22));draw.text((col*640+8,i*382+4),f"{variant} | {case} | {phase} | {i}",fill="white")
  sheet.save(root/case/f"comparison-{phase}.jpg",quality=93)

import numpy as np
out=[]
for phase in ["day","night"]:
 for i in range(3):
  x,y=[np.asarray(Image.open(root/f"manglares-baja-{v}-{phase}/{i:04}.png")).astype(int) for v in ["base","combined"]]
  out.append(dict(phase=phase,i=i,max=int(abs(x-y).max()),mae=float(abs(x-y).mean())))
(root/"equivalence.json").write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8",newline="\n")
