import json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
p=Path('docs/qa/global-visual-lab/far-transition-motion-20261022')
d=json.loads((p/'captures.json').read_text());rows=[]
for phase in ['day','night']:
 records={r['variant']:r for r in d['records'] if r['phase']==phase}
 for mode in ['after','return']:
  a,b=records['before'],records[mode]
  unequal=[i for i,(x,y) in enumerate(zip(a['frames'],b['frames'])) if (x['calls'],x['triangles'])!=(y['calls'],y['triangles'])]
  assert not unequal,(phase,mode,unequal)
  assert all(x['camera']==y['camera'] for x,y in zip(a['frames'],b['frames']))
  sheet=Image.new('RGB',(1280,5*384),(25,25,25));draw=ImageDraw.Draw(sheet);shots=[]
  for n,i in enumerate([0,60,120,180,239]):
   x=Image.open(p/f'sabana-media-before-{phase}/{i:04d}.png').convert('RGB')
   y=Image.open(p/f'sabana-media-{mode}-{phase}/{i:04d}.png').convert('RGB')
   delta=np.abs(np.asarray(x).astype(int)-np.asarray(y).astype(int))
   shots.append(dict(frame=i,pixels=int(np.any(delta,axis=2).sum()),mean=float(delta.mean())))
   sheet.paste(x.resize((640,360)),(0,n*384+24));sheet.paste(y.resize((640,360)),(640,n*384+24));draw.text((8,n*384+5),f'{phase} frame {i}: dither / {mode}',fill='white')
  if mode=='return':assert all(s['pixels']==0 for s in shots),shots
  sheet.save(p/f'{phase}-{mode}-contact.jpg',quality=92)
  rows.append(dict(phase=phase,variant=mode,unequalWorkloadFrames=unequal,shots=shots))
assert all(r['farEnabled'] and r['mountainsVisible'] and not r['errors'] and not any(f['glError'] for f in r['frames']) for r in d['records'])
(p/'audit.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(rows,indent=2))
