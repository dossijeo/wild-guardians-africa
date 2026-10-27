from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path('docs/qa/global-visual-lab/combined-campaign-review');d=json.loads((root/'captures.json').read_text(encoding='utf-8'));rs=d['records'];assert len(rs)==24,'Need all six biomes, both variants and phases'
pairs=[]
for biome in ['sabana','gran-rio','gran-canon','manglares','volcanes','desierto']:
 for phase in ['day','night']:
  a=next(r for r in rs if r['biome']==biome and r['phase']==phase and r['variant']=='base');b=next(r for r in rs if r['biome']==biome and r['phase']==phase and r['variant']=='combined')
  assert not a['errors'] and not b['errors']
  for i,view in enumerate(d['views']):
   x,y=a['frames'][i],b['frames'][i];assert all(x[k]==y[k] for k in ['camera','target','time']), (biome,phase,view)
   if biome not in ['sabana','gran-rio']:assert all(x[k]==y[k] for k in ['calls','triangles']), (biome,phase,view,'geometry')
   ims=[]
   for v in ['base','combined']:
    p=root/f'{biome}-media-{v}-{phase}/{i:04}.png';im=Image.open(p).convert('RGB');out=root/f'{biome}-{v}-{view}-{phase}.webp';im.save(out,lossless=True);assert Image.open(out).convert('RGB').tobytes()==im.tobytes();ims.append(im)
   diff=np.abs(np.array(ims[0]).astype(np.int16)-np.array(ims[1]).astype(np.int16))
   pairs.append({'biome':biome,'phase':phase,'view':view,'samePose':True,'draws':[x['calls'],y['calls']],'triangles':[x['triangles'],y['triangles']],'coverage':y['coverage'],'mae':float(diff.mean()),'changedPixels':int(np.any(diff,axis=2).sum())})
   if i==0:
    pair=Image.new('RGB',(2560,720));pair.paste(ims[0],(0,0));pair.paste(ims[1],(1280,0));pair.save(root/f'{biome}-{phase}-pair.webp',quality=92)
(root/'comparison.json').write_text(json.dumps({'note':'Visual comparison; geometry intentionally increases for continuous coverage. No CPU/GPU benchmark.', 'pairs':pairs},indent=2)+'\n',encoding='utf-8',newline='\n')
print('36 pose-matched pairs, 72 lossless captures, 12 review pairs')
