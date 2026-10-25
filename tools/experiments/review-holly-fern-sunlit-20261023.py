from pathlib import Path
import json
from PIL import Image, ImageDraw
import numpy as np
root=Path("docs/qa/global-visual-lab/holly-fern-sunlit-review-20261023")
r=json.loads((root/"captures.json").read_text())["records"]
checks=[]
for phase in ["day","night"]:
 a=next(x for x in r if x["treatment"]=="baseline" and x["phase"]==phase)
 b=next(x for x in r if x["treatment"]=="sunlit" and x["phase"]==phase)
 assert not a["errors"] and not b["errors"]
 for i,(x,y) in enumerate(zip(a["frames"],b["frames"])):
  for k in ["camera","target","time","calls","triangles"]: assert x[k]==y[k],(phase,i,k)
  paths=[root/t/f"manglares-media-native-{phase}"/f"{i:04}.png" for t in ["baseline","sunlit"]]
  images=[Image.open(p).convert("RGB") for p in paths]
  diff=np.abs(np.array(images[0]).astype(int)-np.array(images[1]).astype(int))
  checks.append(dict(phase=phase,view=i,changedPixels=int(np.any(diff,axis=2).sum()),mae=float(diff.mean()),resourcesEqual=x["memory"]==y["memory"]))
  canvas=Image.new("RGB",(2560,750),(20,20,20));d=ImageDraw.Draw(canvas)
  for j,im in enumerate(images): canvas.paste(im,(j*1280,30));d.text((j*1280+12,8),["ANTES / native baseline","DESPUES / sunlit candidate"][j],fill="white")
  canvas.save(root/f"before-after-{phase}-{i}.jpg",quality=94)
ref=Image.open("docs/qa/global-visual-lab/holly-fern-mockup-review-20261023/reference.jpg").convert("RGB").resize((1280,720))
new=Image.open(root/"sunlit/manglares-media-native-day/0000.png")
c=Image.new("RGB",(2560,750),(20,20,20));c.paste(ref,(0,30));c.paste(new,(1280,30));d=ImageDraw.Draw(c);d.text((12,8),"MOCKUP / referencia artistica",fill="white");d.text((1292,8),"RENDER REAL / frondas iluminadas",fill="white");c.save(root/"mockup-side-by-side.jpg",quality=95)
(root/"comparison.json").write_text(json.dumps(checks,indent=2)+"\n",encoding="utf-8")
print(json.dumps(checks,indent=2))
