from pathlib import Path
import numpy as np,json
from PIL import Image
root=Path("docs/qa/global-visual-lab/mangrove-leaf-lod-endpoint-20261021");out=[]
r=json.loads((root/"captures.json").read_text());records={(a["variant"],a["phase"]):a for a in r["records"]}
for phase in ["day","night"]:
 for i in range(3):
  a,b=[np.asarray(Image.open(root/f"manglares-media-{v}-{phase}/{i:04}.png")).astype(float) for v in ["base","combined"]]
  fa,fb=[records[v,phase]["frames"][i] for v in ["base","combined"]]
  assert fa["coverage"]["near"]==fb["coverage"]["far"]
  for k in ["camera","target","time"]:assert fa[k]==fb[k]
  out.append(dict(phase=phase,camera=i,instances=fa["coverage"]["near"],mae=float(abs(a-b).mean()),pixels=int(np.any(a!=b,axis=2).sum())))
(root/"difference.json").write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8",newline="\n")
