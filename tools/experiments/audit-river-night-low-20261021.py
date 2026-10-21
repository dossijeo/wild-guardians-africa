from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path("docs/qa/global-visual-lab/river-night-low-20261021")
data=json.loads((root/"captures.json").read_text(encoding="utf-8"))
records={(r["variant"],r["phase"]):r for r in data["records"]}
out=[]
for phase in ["day","night"]:
 for i in range(3):
  a,b=[records[v,phase]["frames"][i] for v in ["base","combined"]]
  for k in ["camera","target","time","calls","triangles"]:assert a[k]==b[k],k
  for k in ["near","far","triangles","bufferBytes"]:assert a["coverage"][k]==b["coverage"][k],k
  assert a["coverage"]["near"]==0
  assert not a["glError"] and not b["glError"]
  x,y=[np.asarray(Image.open(root/f"gran-rio-baja-{v}-{phase}/{i:04}.png")).astype(int) for v in ["base","combined"]]
  if phase=="day":assert np.array_equal(x,y)
  out.append(dict(phase=phase,pose=i,mae=float(abs(x-y).mean()),changed=int(np.any(x!=y,axis=2).sum()),coverageTriangles=b["coverage"]["triangles"],instances=b["coverage"]["far"],calls=b["calls"],triangles=b["triangles"]))
assert all(not r["errors"] for r in data["records"])
(root/"audit.json").write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8",newline="\n")
print(json.dumps(out,indent=2))
