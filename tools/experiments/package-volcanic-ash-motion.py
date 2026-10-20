import json
from pathlib import Path
import numpy as np
from PIL import Image

p=Path('docs/qa/global-visual-lab/volcanic-ash-motion')
rs=json.loads((p/'captures.json').read_text(encoding='utf-8'))['records'];assert len(rs)==4
results=[]
def rgb(path):
 im=Image.open(path).convert('RGB');a=np.asarray(im)
 assert a.max()>20 and np.count_nonzero(np.any(a>5,axis=2))>10000, path
 return im
for phase in ['day','night']:
 a,b=[next(r for r in rs if r['phase']==phase and r['variant']==v) for v in ['base','combined']]
 assert not a['errors'] and not b['errors'] and len(a['frames'])==len(b['frames'])==36
 for x,y in zip(a['frames'],b['frames']):
  assert all(x[k]==y[k] for k in ['i','camera','target','time','obstruction','calls','triangles']),(phase,x['i'])
  assert not x['glError'] and not y['glError']
  ims=[rgb(p/f'volcanes-baja-{v}-{phase}'/f"{x['i']:04}.png") for v in ['base','combined']]
  diff=np.abs(np.asarray(ims[0],dtype=np.int16)-np.asarray(ims[1],dtype=np.int16))
  results.append(dict(phase=phase,frame=x['i'],changedPixels=int(np.any(diff,axis=2).sum()),meanDifference=float(diff.mean())))
  if x['i'] in [0,9,17,26,35]:
   pair=Image.new('RGB',(2560,720));pair.paste(ims[0]);pair.paste(ims[1],(1280,0));pair.save(p/f'{phase}-{x["i"]:04}-pair.webp',lossless=True)
trips=[]
for v in ['base','combined']:
 d=json.loads((p/f'{v}-roundtrip.json').read_text(encoding='utf-8'));rows=d['rows']
 assert len(rows)==5 and not d['errors'] and all(not r['glError'] for r in rows)
 for key in ['camera','target','chunks','calls','triangles']:assert rows[0][key]==rows[-1][key],(v,key)
 ims=[rgb(p/f'{v}-roundtrip-{i}.png') for i in range(5)]
 diff=np.abs(np.asarray(ims[0],dtype=np.int16)-np.asarray(ims[-1],dtype=np.int16))
 trips.append(dict(variant=v,changedPixels=int(np.any(diff,axis=2).sum()),maxDifference=int(diff.max()),origins=[r['origin'] for r in rows],memory=[r['memory'] for r in rows],programs=[r['programs'] for r in rows],chunks=[len(r['chunks']) for r in rows]))
 pair=Image.new('RGB',(2560,720));pair.paste(ims[0]);pair.paste(ims[-1],(1280,0));pair.save(p/f'{v}-roundtrip-pair.webp',lossless=True)
(p/'analysis.json').write_text(json.dumps(dict(pairs=results,roundtrips=trips),indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(matchedPairs=len(results),roundtrips=trips)))
