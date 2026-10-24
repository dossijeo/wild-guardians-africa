import json
from pathlib import Path
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/canyon-floor-gravel-scale')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));pairs=[]
for quality in ['media','baja']:
 for phase in ['day','night']:
  a,b=[next(r for r in d['records'] if r['quality']==quality and r['phase']==phase and r['variant']==v) for v in ['original','candidate']]
  assert not a['errors'] and not b['errors']
  for i,(aa,bb) in enumerate(zip(a['frames'],b['frames'])):
   for key in ['camera','target','time','calls','triangles']:assert aa[key]==bb[key],(quality,phase,i,key)
   images=[]
   for v in ['original','candidate']:
    im=Image.open(p/f'gran-canon-{quality}-{v}-{phase}/{i:04}.png').convert('RGB');dest=p/f'{quality}-{phase}-{i}-{v}.webp';im.save(dest,lossless=True);assert im.tobytes()==Image.open(dest).convert('RGB').tobytes();images.append(im)
   pair=Image.new('RGB',(2560,720));pair.paste(images[0],(0,0));pair.paste(images[1],(1280,0));pair.resize((1920,540)).save(p/f'{quality}-{phase}-{i}-pair.webp',quality=94)
   delta=abs(np.asarray(images[0]).astype(int)-np.asarray(images[1]).astype(int))
   pairs.append(dict(quality=quality,phase=phase,view=i,calls=aa['calls'],triangles=aa['triangles'],mae=float(delta.mean()),changedPixels=int(np.any(delta,axis=2).sum())))
(p/'comparison.json').write_text(json.dumps(pairs,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(pairs))
