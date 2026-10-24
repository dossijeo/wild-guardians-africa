from pathlib import Path
import numpy as np,json
from PIL import Image
for name in ["river-night-ambient-20261021","river-night-ambient-strong-20261021"]:
 r=Path("docs/qa/global-visual-lab")/name;out=[]
 for phase in ["day","night"]:
  for i in range(3):
   a,b=[np.asarray(Image.open(r/f"gran-rio-media-{v}-{phase}/{i:04}.png")).astype(int) for v in ["base","combined"]]
   if phase=="day":assert np.array_equal(a,b)
   out.append(dict(phase=phase,pose=i,mae=float(abs(a-b).mean()),changed=int(np.any(a!=b,axis=2).sum())))
 (r/"difference.json").write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8",newline="\n")
