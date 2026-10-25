from pathlib import Path
import json,numpy as np
from PIL import Image,ImageDraw
root=Path("docs/qa/global-visual-lab/mangrove-village-mask-20261021");r=json.loads((root/"mask.json").read_text())
colors={"accepted":(65,180,70),"cover":(120,120,120),"wear":(215,120,50),"wearMargin":(250,200,80),"slope":(170,70,210),"water":(50,120,240),"occupancy":(230,60,60),"unloaded":(0,0,0)}
im=Image.new("RGB",(672,640),(25,25,25));d=ImageDraw.Draw(im)
for i,row in enumerate(r["rows"]):
 x=i%96*6;z=i//96*6;d.rectangle((x,z,x+5,z+5),fill=colors[row["reason"]])
for i,(name,col) in enumerate(colors.items()):d.text((580,12+i*24),name,fill=col)
d.text((8,590),"48 x 48 unidades | x derecha, z abajo | centro "+str(r["center"]),fill="white");im.save(root/"mask.png")
audit=[]
for phase in ["day","night"]:
 for i in range(3):
  rel=f"manglares-media-combined-{phase}/{i:04}.png"
  a=np.asarray(Image.open(root/rel)).astype(int);b=np.asarray(Image.open(root/rel.replace("combined","base"))).astype(int)
  audit.append(dict(phase=phase,camera=i,maxDifference=int(np.abs(a-b).max()),meanDifference=float(np.abs(a-b).mean())))
(root/"equivalence.json").write_text(json.dumps(audit,indent=2)+"\n",encoding="utf-8",newline="\n")
print(audit)
