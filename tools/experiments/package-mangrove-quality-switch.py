from pathlib import Path
import json
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/mangrove-full-integrated/quality-switch-fixed')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));assert not d['errors'] and len(d['records'])==8
out=[]
for phase in ['day','night']:
 rs=[r for r in d['records'] if r['phase']==phase];assert [r['quality'] for r in rs]==['media','muy_baja','baja','media']
 ims=[Image.open(p/f"{phase}-{r['step']}-{r['quality']}.png").convert('RGB') for r in rs]
 diff=abs(np.asarray(ims[0],dtype=np.int16)-np.asarray(ims[-1],dtype=np.int16))
 for i,im in enumerate(ims):im.save(p/f'{phase}-{i}.webp',lossless=True)
 assert not diff.any(), 'Quality roundtrip changed the rendered image'
 assert len({r['masks'] for r in rs})==1
 out.append(dict(phase=phase,returnChangedPixels=int(np.any(diff,axis=2).sum()),returnMaxDelta=int(diff.max()),masks=[r['masks'] for r in rs],memory=[r['memory'] for r in rs],mudCount=[r['mudCount'] for r in rs],materialsDisposed=[sum(r['disposed']) for r in rs]))
(p/'summary.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(out))
