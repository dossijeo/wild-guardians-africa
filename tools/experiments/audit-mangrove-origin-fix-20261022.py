import json
from pathlib import Path
import numpy as np
from PIL import Image
root=Path('docs/qa/global-visual-lab/mangrove-origin-fix-20261022')
d=json.loads((root/'captures.json').read_text(encoding='utf8'));out=[]
for r in d['records']:
 assert not r['errors'] and len(r['frames'])==5
 f=r['frames'];folder=root/f"{r['biome']}-{r['quality']}-{r['variant']}-{r['phase']}"
 a=np.asarray(Image.open(folder/'0000.png').convert('RGB'));b=np.asarray(Image.open(folder/'0004.png').convert('RGB'))
 out.append(dict(biome=r['biome'],variant=r['variant'],phase=r['phase'],returnChangedPixels=int(np.any(a!=b,axis=2).sum()),origins=[x['origin'] for x in f],resources=[x['memory'] for x in f],settleMs=[x['settleMs'] for x in f],returnCountersEqual=(f[0]['calls'],f[0]['triangles'])==(f[-1]['calls'],f[-1]['triangles'])))
(root/'audit.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(out,indent=2))
