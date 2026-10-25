import json
from pathlib import Path
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/canyon-sand-normal-only/streaming-corrected')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));assert len(d['records'])==4
summary=[]
for phase in ['day','night']:
 a,b=[next(r for r in d['records'] if r['phase']==phase and r['variant']==v) for v in ['original','candidate']]
 assert len(a['rows'])==len(b['rows'])==9 and not a['errors'] and not b['errors']
 for aa,bb in zip(a['rows'],b['rows']):
  for key in ['camera','target','worldTarget','origin','calls','triangles','chunks']:assert aa[key]==bb[key],(phase,aa['index'],key)
  assert aa['glError']==bb['glError']==0
 for v,r in [('original',a),('candidate',b)]:
  assert all(np.allclose(r['rows'][i]['worldTarget'],r['rows'][0]['worldTarget']) for i in [4,8])
  ims=[Image.open(p/f'media-{v}-{phase}-{i}.png').convert('RGB') for i in [0,4,8]]
  delta=[abs(np.array(im).astype(int)-np.array(ims[0]).astype(int)) for im in ims[1:]]
  strip=Image.new('RGB',(1920,360))
  for j,im in enumerate(ims):strip.paste(im.resize((640,360)),(640*j,0))
  strip.save(p/f'{v}-{phase}-returns.webp',quality=94)
  summary.append(dict(phase=phase,variant=v,returnMAE=[float(x.mean()) for x in delta],origins=[row['origin'] for row in r['rows']],memory=[row['memory'] for row in r['rows']],programs=[row['programs'] for row in r['rows']]))
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps([{k:v for k,v in r.items() if k in ['phase','variant','returnMAE','programs']} for r in summary]))
