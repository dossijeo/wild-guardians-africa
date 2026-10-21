from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
root=Path("docs/qa/global-visual-lab/obstruction-backfaces-20261021")
data=json.loads((root/"captures.json").read_text())
records={(r["variant"],r["phase"]):r for r in data["records"]}
metrics=[]
for phase in ["day","night"]:
 sheet=Image.new("RGB",(1920,3*382),(24,24,24));draw=ImageDraw.Draw(sheet)
 for row,i in enumerate([9,17,35]):
  arrays=[]
  for col,(variant,label) in enumerate([("double","DoubleSide"),("base","FrontSide (actual)"),("combined","Superficie mas cercana (QA)")]):
   frame=next(f for f in records[variant,phase]["frames"] if f["i"]==i)
   control=next(f for f in records["base",phase]["frames"] if f["i"]==i)
   for key in ["camera","target","time","windTime","partial"]: assert frame[key]==control[key],key
   assert not frame["glError"]
   im=Image.open(root/f"sabana-baja-{variant}-{phase}/{i:04}.png").convert("RGB")
   arrays.append(np.asarray(im).astype(float))
   sheet.paste(im.resize((640,360)),(col*640,row*382+22));draw.text((col*640+8,row*382+4),f"{label} | {phase} | pose {i}",fill="white")
  metrics.append(dict(phase=phase,pose=i,doubleVsFrontMAE=float(np.abs(arrays[0]-arrays[1]).mean()),nearestVsFrontMAE=float(np.abs(arrays[2]-arrays[1]).mean())))
 sheet.save(root/f"comparison-{phase}.jpg",quality=93)
(root/"comparison.json").write_text(json.dumps(metrics,indent=2)+"\n",encoding="utf-8",newline="\n")
