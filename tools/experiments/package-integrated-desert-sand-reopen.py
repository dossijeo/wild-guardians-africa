from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path('docs/qa/global-visual-lab/desert-aerial-sand/integration-reopen');d=json.loads((root/'results.json').read_text(encoding='utf-8'));pairs=[]
assert len(d['records'])==6
assert len(set(r['setup']['mapId'] for r in d['records']))==6
assert len(set(r['setup']['sourceId'] for r in d['records']))==6
for quality in ['media','baja']:
 rs=[r for r in d['records'] if r['quality']==quality];assert len(rs)==3
 for r in rs:
  assert not r['errors'] and r['closed']['releases']=={'clone':1,'source':1}
  for f in r['frames']:
   ref=next(x for x in rs[0]['frames'] if x['phase']==f['phase'])
   assert all(ref[k]==f[k] for k in ['camera','target','time','calls','triangles']), (quality,r['cycle'],f['phase'])
   file=root/f"{quality}-{r['cycle']}-{f['phase']}.png";im=Image.open(file).convert('RGB');im.save(file.with_suffix('.webp'),lossless=True);assert Image.open(file.with_suffix('.webp')).convert('RGB').tobytes()==im.tobytes()
   x=np.array(im).astype(np.int16);y=np.array(Image.open(root/f"{quality}-0-{f['phase']}.png").convert('RGB')).astype(np.int16);diff=np.abs(x-y)
   pairs.append({'quality':quality,'cycle':r['cycle'],'phase':f['phase'],'max':int(diff.max()),'mae':float(diff.mean()),'changedPixels':int(np.any(diff,axis=2).sum()),'samePoseAndGeometry':True,'memory':f['memory']})
(root/'comparison.json').write_text(json.dumps(pairs,indent=2)+'\n',encoding='utf-8',newline='\n');print(pairs)
