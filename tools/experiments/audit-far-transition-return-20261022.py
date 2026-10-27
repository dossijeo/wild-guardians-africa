import json
from pathlib import Path
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/far-transition-warmed-world-20261022')
d=json.loads((p/'captures.json').read_text());rows=[]
for phase in ['day','night']:
 a=next(r for r in d['records'] if r['phase']==phase and r['variant']=='before')
 b=next(r for r in d['records'] if r['phase']==phase and r['variant']=='return')
 for i in range(3):
  x=np.array(Image.open(p/f'sabana-media-before-{phase}/{i:04d}.png').convert('RGB'))
  y=np.array(Image.open(p/f'sabana-media-return-{phase}/{i:04d}.png').convert('RGB'))
  delta=np.abs(x.astype(int)-y.astype(int));fa,fb=a['frames'][i],b['frames'][i]
  assert fa['camera']==fb['camera'] and fa['time']==fb['time']
  row=dict(phase=phase,view=i,pixels=int(np.any(delta,axis=2).sum()),mean=float(delta.mean()),calls=fa['calls']==fb['calls'],triangles=fa['triangles']==fb['triangles'])
  assert row['pixels']==0 and row['calls'] and row['triangles'],row
  rows.append(row)
(p/'return-audit.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
print('Six exact RGB returns, camera/time/calls/triangles matched.')
