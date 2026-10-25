from pathlib import Path
import json
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/river-cover-root');d=json.loads((p/'captures.json').read_text(encoding='utf-8'));rs=d['records'];assert len(rs)==8
results=[]
for quality in ['media','baja']:
 for biome in ['gran-rio']:
  for phase in ['day','night']:
   a,b=[next(r for r in rs if r['quality']==quality and r['biome']==biome and r['phase']==phase and r['variant']==v) for v in ['base','combined']]
   assert not a['errors'] and not b['errors']
   for i,view in enumerate(d['views']):
    x,y=a['frames'][i],b['frames'][i]
    for key in ['camera','target','time','calls','triangles']:assert x[key]==y[key],(quality,biome,phase,view,key)
    if x['coverage']:
     for key in ['near','far','bufferBytes']:assert x['coverage'][key]==y['coverage'][key],key
     assert x['coverage']['stats']['overflow']==y['coverage']['stats']['overflow']==0
    ims=[]
    for v in ['base','combined']:
     im=Image.open(p/f'{biome}-{quality}-{v}-{phase}/{i:04}.png').convert('RGB');dest=p/f'{biome}-{quality}-{v}-{view}-{phase}.webp';im.save(dest,lossless=True);assert im.tobytes()==Image.open(dest).convert('RGB').tobytes();ims.append(im)
    diff=abs(np.asarray(ims[0]).astype(int)-np.asarray(ims[1]).astype(int))
    results.append(dict(quality=quality,biome=biome,phase=phase,view=view,calls=x['calls'],triangles=x['triangles'],mae=float(diff.mean()),changedPixels=int(np.any(diff,axis=2).sum())))
    if i==0:
     pair=Image.new('RGB',(2560,720));pair.paste(ims[0],(0,0));pair.paste(ims[1],(1280,0));pair.resize((1920,540)).save(p/f'{biome}-{quality}-{phase}-pair.webp',quality=94)
(p/'comparison.json').write_text(json.dumps(dict(note='River fixed / distance-weighted root shade, equal submitted geometry; static visual pilot, no timing claim.',pairs=results),indent=2)+'\n',encoding='utf-8',newline='\n');print('12 matched pairs, 24 verified lossless captures')
