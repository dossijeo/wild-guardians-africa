from pathlib import Path
import numpy as np,json
from PIL import Image
root=Path("docs/qa/global-visual-lab");r=root/"sky-visible-mask-20261021";study=root/"sky-cloud-depth-20261021";rows=[]
for phase in ["day","night"]:
 for i in range(3):
  rel=lambda v:f"manglares-media-{v}-{phase}/{i:04}.png"
  a,b=[np.asarray(Image.open(r/rel(v))).astype(int) for v in ["base","combined"]]
  x,y=[np.asarray(Image.open(study/rel(v))).astype(int) for v in ["base","combined"]]
  visible=np.any(a!=b,axis=2);changed=np.any(x!=y,axis=2);outside=changed&~visible
  coords=np.argwhere(changed[360:]);coords[:,0]+=360
  rows.append(dict(phase=phase,pose=i,visiblePixels=int(visible.sum()),changedPixels=int(changed.sum()),outsideSkyResponse=int(outside.sum()),lowerCoordinatesYX=coords.tolist()))
  assert not outside.any()
  Image.fromarray((visible*255).astype("uint8")).save(r/f"mask-{phase}-{i}.png")
(r/"audit.json").write_text(json.dumps(rows,indent=2)+"\n",encoding="utf-8",newline="\n");print(rows)
