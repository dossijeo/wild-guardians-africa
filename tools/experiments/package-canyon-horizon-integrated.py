from pathlib import Path
import os
import json
import numpy as np
from PIL import Image
quality=os.environ.get('WG_COVER_QUALITY','baja')
p=Path(os.environ.get('WG_BANK_OUT','docs/qa/global-visual-lab/canyon-horizon-integrated'));d=json.loads((p/'captures.json').read_text());rows=[]
for phase in ['day','night']:
 a,b=[next(r for r in d['records'] if r['phase']==phase and r['variant']==v) for v in ['base','combined']]
 assert not a['errors'] and not b['errors']
 for x,y in zip(a['frames'],b['frames']):
  for k in ['camera','target','time','calls','triangles']:assert x[k]==y[k],(phase,x['i'],k)
  assert not x['glError'] and not y['glError']
  assert x['horizon'][0]['castShadow'] and y['horizon'][0]['castShadow']
  ims=[Image.open(p/f'gran-canon-{quality}-{v}-{phase}/{x["i"]:04}.png').convert('RGB') for v in ['base','combined']]
  aa,bb=[np.asarray(im,dtype=np.float32) for im in ims]
  assert np.array_equal(aa,bb),(phase,x['i'],'recipe differs')
  rows.append({'phase':phase,'frame':x['i'],'mae':float(abs(aa-bb).mean()),'changedPixels':int(np.any(aa!=bb,axis=2).sum())})
  pair=Image.new('RGB',(2560,720));pair.paste(ims[0]);pair.paste(ims[1],(1280,0));pair.save(p/f'{phase}-{x["i"]}-pair.webp',lossless=True)
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n');print(rows)
