from pathlib import Path
import json
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/river-yard-islands/streaming')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));rs=d['records'];assert len(rs)==4
pairs=[];returns=[]
for quality in ['baja']:
 for phase in ['day','night']:
  a,b=[next(r for r in rs if r['quality']==quality and r['phase']==phase and r['variant']==v) for v in ['base','combined']]
  assert not a['errors'] and not b['errors'] and len(a['rows'])==len(b['rows'])==9
  for x,y in zip(a['rows'],b['rows']):
   for key in ['camera','target','worldTarget','origin','chunks']:assert x[key]==y[key],(quality,phase,x['index'],key)
   assert x['glError']==y['glError']==0
   assert not x['coverage']['stats']['overflow'] and not y['coverage']['stats']['overflow']
   ims=[np.asarray(Image.open(p/f"{quality}-{v}-{phase}-{x['index']}.png").convert('RGB'),dtype=np.int16) for v in ['base','combined']]
   delta=abs(ims[0]-ims[1]);pairs.append(dict(quality=quality,phase=phase,index=x['index'],changedPixels=int(np.any(delta,axis=2).sum()),maxDelta=int(delta.max()),mae=float(delta.mean())))
  for r in [a,b]:
   assert len({str(x['origin']) for x in r['rows']})>1
   assert all(np.allclose(r['rows'][0]['worldTarget'],r['rows'][i]['worldTarget']) for i in [4,8])
   for i in [4,8]:
    assert r['rows'][0]['triangles']==r['rows'][i]['triangles']
    for key in ['near','far','triangles','bufferBytes']:assert r['rows'][0]['coverage'][key]==r['rows'][i]['coverage'][key]
   ims=[Image.open(p/f"{quality}-{r['variant']}-{phase}-{i}.png").convert('RGB') for i in [0,4,8]]
   diffs=[abs(np.asarray(im,dtype=np.int16)-np.asarray(ims[0],dtype=np.int16)) for im in ims[1:]]
   returns.append(dict(quality=quality,variant=r['variant'],phase=phase,returnMAE=[float(x.mean()) for x in diffs],memory=[x['memory'] for x in r['rows']],origins=[x['origin'] for x in r['rows']]))
 for variant in ['base','combined']:
  v=json.loads((p/f'{quality}-{variant}-disposal.json').read_text(encoding='utf-8'));assert v['layerCount']==3 and v['counts']==[1,1,1] and v['disposed'] and v['remainingLayers']==0
(p/'summary.json').write_text(json.dumps(dict(pairs=pairs,returns=returns),indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(pairs=len(pairs),exact=sum(x['changedPixels']==0 for x in pairs),maxPixels=max(x['changedPixels'] for x in pairs),maxDelta=max(x['maxDelta'] for x in pairs),returns=[{k:v for k,v in x.items() if k not in ['memory','origins']} for x in returns])))
