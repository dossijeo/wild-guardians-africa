import json
from pathlib import Path
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/river-underlay-mask-persistent-stream-warm-20261022')
d=json.loads((p/'captures.json').read_text());rows=[]
for r in d['records']:
 f=r['frames'];folder=p/f"gran-rio-media-{r['variant']}-{r['phase']}"
 a=np.asarray(Image.open(folder/'0000.png')).astype(int);b=np.asarray(Image.open(folder/'0004.png')).astype(int);delta=abs(a-b)
 rows.append(dict(variant=r['variant'],phase=r['phase'],pixels=int((delta.max(2)>0).sum()),maximum=int(delta.max()),mean=float(delta.mean()),maskHashesExact=f[0]['maskHashes']==f[-1]['maskHashes'],geometryExact=(f[0]['calls'],f[0]['triangles'])==(f[-1]['calls'],f[-1]['triangles']),errors=r['errors']))
 assert all(not x['stale'] and x['glError']==0 for x in f)
(p/'audit.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
