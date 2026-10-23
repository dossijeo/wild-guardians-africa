from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
root=Path("docs/qa/global-visual-lab/holly-fern-sunlit-motion-20261023")
summary={}
contact=Image.new("RGB",(1920,770),(20,20,20));draw=ImageDraw.Draw(contact)
for row,phase in enumerate(["day","night"]):
 r=json.loads((root/phase/"frames.json").read_text());f=r["frames"]
 assert len(f)==120 and not r["errors"] and all(x["glError"]==0 for x in f)
 assert all(x["elapsed"]==2 for x in f)
 diffs=[];prev=None
 for i,x in enumerate(f):
  im=Image.open(root/phase/f"{i:04}.png").convert("RGB");arr=np.array(im).astype(float)
  if prev is not None:diffs.append(float(np.abs(arr-prev).mean()))
  prev=arr
  if i in [0,30,59,90]:
   col=[0,30,59,90].index(i);contact.paste(im.resize((480,270)),(col*480,row*385+28));draw.text((col*480+10,row*385+8),f"{phase} / frame {i}",fill="white")
 summary[phase]={"frames":len(f),"pendingFrames":[x["frame"] for x in f if x["pending"]],"frameDifferenceMean":float(np.mean(diffs)),"largestAdjacentDifference":float(max(diffs)),"largestDifferenceFrame":int(np.argmax(diffs)+1),"firstCoverage":f[0]["coverage"],"lastCoverage":f[-1]["coverage"]}
contact.save(root/"contact-sheet.jpg",quality=94)
(root/"summary.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
print(json.dumps({k:{a:b for a,b in v.items() if "Coverage" not in a} for k,v in summary.items()},indent=2))
