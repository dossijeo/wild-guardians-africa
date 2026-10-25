import json
from pathlib import Path
from PIL import Image,ImageDraw
p=Path("docs/qa/global-visual-lab/fern-screen-prelit-pitch-20261023");rows=[]
for phase in ["day","night"]:
 a,b=[json.loads((p/v/phase/"frames.json").read_text()) for v in ["native","prelit"]]
 assert len(a["frames"])==len(b["frames"])==120
 assert not a["errors"] and not b["errors"]
 for x,y in zip(a["frames"],b["frames"]):
  assert all(x[k]==y[k] for k in ["camera","target","elapsed","time"])
  assert not x["glError"] and not y["glError"]
  assert sum(x["coverage"][k] for k in ["near","far"])==sum(y["coverage"][k] for k in ["near","far"])
  assert not x["coverage"]["stats"]["overflow"] and not y["coverage"]["stats"]["overflow"]
 changes=[dict(frame=i,delta=b["frames"][i]["coverage"]["near"]-b["frames"][i-1]["coverage"]["near"],totalDelta=sum(b["frames"][i]["coverage"][k]-b["frames"][i-1]["coverage"][k] for k in ["near","far"])) for i in range(1,120)]
 changes.sort(key=lambda x:abs(x["delta"]),reverse=True)
 rows.append(dict(phase=phase,maxChanges=changes[:8],nativePending=sum(f["pending"] for f in a["frames"]),candidatePending=sum(f["pending"] for f in b["frames"]),nearRange=[min(f["coverage"]["near"] for f in b["frames"]),max(f["coverage"]["near"] for f in b["frames"])],startEndNear=[b["frames"][i]["coverage"]["near"] for i in [0,119]]))
 indices=sorted(set([0,30,59,90,119,changes[0]["frame"]-1,changes[0]["frame"]]))
 sheet=Image.new("RGB",(1280,len(indices)*380));draw=ImageDraw.Draw(sheet)
 for row,i in enumerate(indices):
  for col,v in enumerate(["native","prelit"]):
   im=Image.open(p/v/phase/f"{i:04}.png").convert("RGB").resize((640,360));sheet.paste(im,(640*col,row*380));draw.text((640*col+5,row*380+362),f"{v} frame {i}",fill="white")
 sheet.save(p/f"{phase}-contact.jpg",quality=92)
(p/"audit.json").write_text(json.dumps(rows,indent=2)+"\n",encoding="utf8")
print(json.dumps(rows,indent=2))
