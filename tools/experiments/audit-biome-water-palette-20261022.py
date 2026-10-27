import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
root=Path("docs/qa/global-visual-lab/biome-water-palette-review-20261022")
data=json.loads((root/"captures.json").read_text(encoding="utf8"))
lookup={(r["biome"],r["phase"],r["variant"]):r for r in data["records"]}
audit=[]
for (biome,phase,variant),a in lookup.items():
 if variant!="original": continue
 b=lookup[(biome,phase,"regional")]
 assert not a["errors"] and not b["errors"]
 sheet=Image.new("RGB",(1280,3*384),(20,20,20));draw=ImageDraw.Draw(sheet)
 for i,(fa,fb) in enumerate(zip(a["frames"],b["frames"])):
  assert fa["camera"]==fb["camera"] and fa["target"]==fb["target"] and fa["time"]==fb["time"]
  images=[Image.open(root/f"{biome}-media-{v}-{phase}"/f"{i:04d}.png").convert("RGB") for v in ["original","regional"]]
  diff=np.abs(np.asarray(images[0],dtype=int)-np.asarray(images[1],dtype=int))
  audit.append(dict(biome=biome,phase=phase,view=i,changedPixels=int(np.any(diff,axis=2).sum()),meanRGB=float(diff.mean()),equalCalls=fa["calls"]==fb["calls"],equalTriangles=fa["triangles"]==fb["triangles"]))
  for col,im in enumerate(images):
   sheet.paste(im.resize((640,360)),(col*640,i*384+24));draw.text((col*640+8,i*384+5),f"{biome} {phase} {['original','regional'][col]} / view {i}",fill="white")
 sheet.save(root/f"comparison-{biome}-{phase}.jpg",quality=93)
(root/"audit.json").write_text(json.dumps(audit,indent=2)+"\n",encoding="utf8",newline="\n")
print(json.dumps(audit,indent=2))
