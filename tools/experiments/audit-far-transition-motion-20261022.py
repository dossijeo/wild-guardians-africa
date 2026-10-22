import json,os
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
p=Path(os.environ.get('WG_REVIEW_OUT','docs/qa/global-visual-lab/far-transition-motion-20261022'))
biome=os.environ.get('WG_REVIEW_BIOMES','sabana')
quality=os.environ.get('WG_COVER_QUALITY','media')
d=json.loads((p/'captures.json').read_text());rows=[]
for phase in ['day','night']:
 records={r['variant']:r for r in d['records'] if r['phase']==phase}
 for mode in ['after','return']:
  a,b=records['before'],records[mode]
  unequal=[i for i,(x,y) in enumerate(zip(a['frames'],b['frames'])) if (x['calls'],x['triangles'])!=(y['calls'],y['triangles'])]
  assert all(x['camera']==y['camera'] for x,y in zip(a['frames'],b['frames']))
  sheet=Image.new('RGB',(1280,5*384),(25,25,25));draw=ImageDraw.Draw(sheet);shots=[]
  for n,i in enumerate([0,60,120,180,239]):
   x=Image.open(p/f'{biome}-{quality}-before-{phase}/{i:04d}.png').convert('RGB')
   y=Image.open(p/f'{biome}-{quality}-{mode}-{phase}/{i:04d}.png').convert('RGB')
   delta=np.abs(np.asarray(x).astype(int)-np.asarray(y).astype(int))
   shots.append(dict(frame=i,pixels=int(np.any(delta,axis=2).sum()),mean=float(delta.mean())))
   sheet.paste(x.resize((640,360)),(0,n*384+24));sheet.paste(y.resize((640,360)),(640,n*384+24));draw.text((8,n*384+5),f'{phase} frame {i}: dither / {mode}',fill='white')
  sheet.save(p/f'{phase}-{mode}-contact.jpg',quality=92)
  rows.append(dict(phase=phase,variant=mode,unequalWorkloadFrames=unequal,shots=shots))
assert all(r['farEnabled'] and r['mountainsVisible'] and not r['errors'] and not any(f['glError'] for f in r['frames']) for r in d['records'])
(p/'audit.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(rows,indent=2))

assert all(not r['unequalWorkloadFrames'] for r in rows),'Workload differs: see audit.json'
assert all(s['pixels']==0 for r in rows if r['variant']=='return' for s in r['shots']),'Return is not RGB exact: see audit.json'
