from pathlib import Path
from PIL import Image,ImageDraw
import json,subprocess
root=Path("docs/qa/global-visual-lab/river-night-motion-20261021")
r=json.loads((root/"captures.json").read_text());records={(a["variant"],a["phase"]):a for a in r["records"]};summary=[]
for phase in ["day","night"]:
 folder=root/f"pairs-{phase}";folder.mkdir(exist_ok=True)
 near=[];far=[]
 contact=Image.new("RGB",(1280,4*382),(22,22,22));draw=ImageDraw.Draw(contact)
 for i in range(36):
  a,b=[records[v,phase]["frames"][i] for v in ["base","combined"]]
  for key in ["camera","target","time","windTime","calls","triangles"]:assert a[key]==b[key],key
  for key in ["near","far","triangles"]:assert a["coverage"][key]==b["coverage"][key],key
  assert b["coverage"]["stats"]["overflow"]==0 and not b["glError"]
  near.append(b["coverage"]["near"]);far.append(b["coverage"]["far"])
  pair=Image.new("RGB",(1280,382),(22,22,22));pd=ImageDraw.Draw(pair)
  for col,v in enumerate(["base","combined"]):
   im=Image.open(root/f"gran-rio-media-{v}-{phase}/{i:04}.png");pair.paste(im.resize((640,360)),(col*640,22));pd.text((col*640+8,4),f"{v} | {phase} | pose {i} | wind {a['windTime']:.2f}",fill="white")
  pair.save(folder/f"{i:04}.png")
  if i in [0,12,24,35]:contact.paste(pair,(0,[0,12,24,35].index(i)*382))
 contact.save(root/f"contact-{phase}.jpg",quality=93)
 subprocess.run(["C:/ffmpeg/bin/ffmpeg.exe","-y","-loglevel","error","-framerate","12","-i",str(folder/"%04d.png"),"-c:v","libx264","-crf","18","-pix_fmt","yuv420p",str(root/f"comparison-{phase}.mp4")],check=True)
 summary.append(dict(phase=phase,pairs=36,nearRange=[min(near),max(near)],farRange=[min(far),max(far)],note="Settled poses, not realtime FPS; temporal review not certified by equal metadata."))
(root/"audit.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8",newline="\n")
