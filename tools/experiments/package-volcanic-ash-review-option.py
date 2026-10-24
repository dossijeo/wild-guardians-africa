import json
from pathlib import Path
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/volcanic-ash-review-option')
rows=json.loads((p/'captures.json').read_text(encoding='utf-8'))['records'];assert len(rows)==12
results=[]
for r in rows:
 assert not r['errors']
 reference=p.parent/('volcanic-ash-pilot' if r['variant']=='off' else 'volcanic-ash-mask')
 variant='base' if r['variant']=='off' else r['variant']
 previous=json.loads((reference/'captures.json').read_text(encoding='utf-8'))['records']
 old=next(x for x in previous if x['quality']==r['quality'] and x['phase']==r['phase'] and x['variant']==variant)
 for frame,before in zip(r['frames'],old['frames']):
  assert not frame['glError']
  for key in ['camera','target','time','calls','triangles']:assert frame[key]==before[key],(r['variant'],r['quality'],r['phase'],frame['i'],key)
  i=frame['i'];a=Image.open(reference/f"volcanes-{r['quality']}-{variant}-{r['phase']}"/f'{i:04}.png').convert('RGB');b=Image.open(p/f"volcanes-{r['quality']}-{r['variant']}-{r['phase']}"/f'{i:04}.png').convert('RGB')
  diff=np.abs(np.asarray(a,dtype=np.int16)-np.asarray(b,dtype=np.int16));results.append(dict(variant=r['variant'],quality=r['quality'],phase=r['phase'],frame=i,changedPixels=int(np.any(diff,axis=2).sum()),maxDifference=int(diff.max())))
  if i==0 and r['quality']=='baja':b.save(p/f"{r['variant']}-{r['phase']}.webp",lossless=True)
(p/'parity.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'pairs':len(results),'exact':sum(x['changedPixels']==0 for x in results),'maxChanged':max(x['changedPixels'] for x in results)}))
