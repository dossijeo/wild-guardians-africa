import json
from pathlib import Path
from PIL import Image
import numpy as np
p=Path('docs/qa/global-visual-lab/far-transition-direct-control-20261022');d=json.loads((p/'captures.json').read_text());rows=[]
for r in d['records']:
 a,b,c=r['frames'];assert not r['errors'] and not any(f['glError'] for f in r['frames']);assert a['camera']==b['camera']==c['camera'] and a['time']==b['time']==c['time']
 x=np.array(Image.open(p/f"{r['biome']}-{r['quality']}-before-{r['phase']}/0000.png").convert('RGB'));y=np.array(Image.open(p/f"{r['biome']}-{r['quality']}-return-{r['phase']}/0000.png").convert('RGB'))
 rows.append(dict(biome=r['biome'],phase=r['phase'],pixels=int(np.any(x!=y,axis=2).sum()),maxChannelDelta=int(np.abs(x.astype(int)-y.astype(int)).max()),calls=c['calls']-a['calls'],triangles=c['triangles']-a['triangles']))
(p/'audit.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n');print(json.dumps(rows,indent=2));assert len(rows)==6
assert all(r['pixels']==0 and r['calls']==0 and r['triangles']==0 for r in rows)
