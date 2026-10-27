import json
from pathlib import Path
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/mangrove-mud-fringe/sized-inset/streaming')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));assert len(d['records'])==4
summary=[];parity=[]
for phase in ['day','night']:
 a,b=[next(r for r in d['records'] if r['phase']==phase and r['variant']==v) for v in ['original','candidate']]
 assert len(a['rows'])==len(b['rows'])==9 and not a['errors'] and not b['errors']
 for aa,bb in zip(a['rows'],b['rows']):
  for key in ['camera','target','worldTarget','origin','calls','triangles','chunks']:assert aa[key]==bb[key],(phase,aa['index'],key)
  assert aa['glError']==bb['glError']==0
  for row in [aa,bb]:assert row['mudAudit']['bound']==row['mudAudit']['meshes'] and row['mudAudit']['finite']
  assert aa['mudAudit']['radiusAttributes']==0
  assert bb['mudAudit']['radiusAttributes']==bb['mudAudit']['meshes']
  ia,ib=[np.asarray(Image.open(p/f"media-{v}-{phase}-{aa['index']}.png").convert('RGB')) for v in ['original','candidate']]
  delta=abs(ia.astype(int)-ib.astype(int));parity.append(dict(phase=phase,index=aa['index'],mae=float(delta.mean()),changedPixels=int(np.any(delta,axis=2).sum()),maxDelta=int(delta.max())))
 for v,r in [('original',a),('candidate',b)]:
  assert all(np.allclose(r['rows'][i]['worldTarget'],r['rows'][0]['worldTarget']) for i in [4,8])
  ims=[Image.open(p/f'media-{v}-{phase}-{i}.png').convert('RGB') for i in [0,4,8]]
  delta=[abs(np.array(im).astype(int)-np.array(ims[0]).astype(int)) for im in ims[1:]]
  strip=Image.new('RGB',(1920,360))
  for j,im in enumerate(ims):strip.paste(im.resize((640,360)),(640*j,0))
  strip.save(p/f'{v}-{phase}-returns.webp',quality=94)
  summary.append(dict(mudAudits=[row['mudAudit'] for row in r['rows']],phase=phase,variant=v,returnMAE=[float(x.mean()) for x in delta],origins=[row['origin'] for row in r['rows']],memory=[row['memory'] for row in r['rows']],programs=[row['programs'] for row in r['rows']]))
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps([{k:v for k,v in r.items() if k in ['phase','variant','returnMAE','programs']} for r in summary]))

(p/'parity.json').write_text(json.dumps(parity,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(parity))

for variant in ['original','candidate']:
 disposal=json.loads((p/f'media-{variant}-disposal.json').read_text());assert disposal['before']>0 and len(disposal['counts'])==disposal['before'] and all(n==1 for n in disposal['counts']) and disposal['boundAfter']==0
print('18 matched scene pairs; streamed radius attributes and geometry disposal verified')
