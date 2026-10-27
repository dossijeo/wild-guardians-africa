from pathlib import Path
import json
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/volcanic-night-components-20261021')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));rows=[]
for phase in ['day','night']:
 records=[next(r for r in d['records'] if r['phase']==phase and r['variant']==v) for v in ['base','ambient','ao']]
 assert all(not r['errors'] and len(r['frames'])==3 for r in records)
 for i in range(3):
  fs=[r['frames'][i] for r in records]
  for f in fs:
   assert not f['glError']
   for k in ['camera','target','time','calls','triangles']:assert f[k]==fs[0][k],k
  ims=[Image.open(p/f'volcanes-media-{v}-{phase}/{i:04}.png').convert('RGB') for v in ['base','ambient','ao']]
  sheet=Image.new('RGB',(3840,720))
  for j,im in enumerate(ims):sheet.paste(im,(j*1280,0))
  sheet.save(p/f'{phase}-{i}-triple.webp',lossless=True)
  arrays=[np.array(im,dtype=np.float32) for im in ims]
  for j,v in [(1,'ambient'),(2,'ao')]:
   delta=abs(arrays[0]-arrays[j]);rows.append(dict(phase=phase,view=i,variant=v,mae=float(delta.mean()),changedPixels=int(np.any(delta,axis=2).sum())))
assert all(r['changedPixels']==0 for r in rows if r['phase']=='day')
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
print(rows)
