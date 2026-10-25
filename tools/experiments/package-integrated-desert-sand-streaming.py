from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path('docs/qa/global-visual-lab/desert-aerial-sand/integration-streaming')
summary=[]
for quality in ['media','baja']:
 d=json.loads((root/(quality+'.json')).read_text(encoding='utf-8'))
 assert d['disposal']['cloneDisposals']==d['disposal']['sourceDisposals']==1 and d['disposal']['sourceObserved']
 assert not d['errors']
 for phase in ['day','night']:
  a=next(s for s in d['steps'] if s['label']=='start' and s['phase']==phase);b=next(s for s in d['steps'] if s['label']=='return' and s['phase']==phase)
  assert a['camera']==b['camera'] and a['target']==b['target'] and a['chunks']==b['chunks']
  x=np.array(Image.open(root/a['file']).convert('RGB')).astype(np.int16);y=np.array(Image.open(root/b['file']).convert('RGB')).astype(np.int16);diff=np.abs(x-y)
  summary.append({'quality':quality,'phase':phase,'max':int(diff.max()),'mae':float(diff.mean()),'changedPixels':int(np.any(diff,axis=2).sum())})
 for s in d['steps']:
  p=root/s['file'];im=Image.open(p).convert('RGB');im.save(p.with_suffix('.webp'),lossless=True);assert Image.open(p.with_suffix('.webp')).convert('RGB').tobytes()==im.tobytes()
(root/'return-comparison.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
print(summary)
