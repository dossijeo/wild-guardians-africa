from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path('docs/qa/global-visual-lab/desert-aerial-sand')
a=json.loads((root/'integration-reference/captures.json').read_text(encoding='utf-8'))
b=json.loads((root/'integration/captures.json').read_text(encoding='utf-8'))
pairs=[]
for r in b['records']:
 ref=next(x for x in a['records'] if x['quality']==r['quality'] and x['phase']==r['phase'] and x['variant']=='candidate')
 assert not ref['errors'] and not r['errors']
 for f,g in zip(ref['frames'],r['frames']):
  assert all(f[k]==g[k] for k in ['camera','target','time','calls','triangles']), (r['quality'],r['phase'],f['i'])
  name=f"{r['quality']}-integrated-{r['phase']}/{g['i']:04}.png"
  im=Image.open(root/'integration'/name).convert('RGB');x=np.asarray(im).astype(np.int16)
  y=np.asarray(Image.open(root/'integration-reference'/f"{r['quality']}-candidate-{r['phase']}/{f['i']:04}.png").convert('RGB')).astype(np.int16)
  diff=np.abs(x-y)
  pairs.append({'quality':r['quality'],'phase':r['phase'],'view':f['i'],'max':int(diff.max()),'mae':float(diff.mean()),'changedPixels':int(np.any(diff,axis=2).sum()),'samePoseAndGeometry':True})
  dest=root/'integration'/f"{r['quality']}-{r['phase']}-{g['i']}.webp";im.save(dest,lossless=True)
  assert Image.open(dest).convert('RGB').tobytes()==im.tobytes()
assert len(pairs)==12
(root/'integration/comparison.json').write_text(json.dumps({'pairs':pairs},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(pairs,indent=2))
