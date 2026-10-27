import json
from pathlib import Path
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/river-soil-layer-motion')
rs=json.loads((p/'captures.json').read_text(encoding='utf-8'))['records'];assert len(rs)==8
results=[]
for quality in ['baja','media']:
 for phase in ['day','night']:
  a,b=[next(r for r in rs if r['quality']==quality and r['phase']==phase and r['variant']==v) for v in ['base','combined']]
  assert not a['errors'] and not b['errors'] and len(a['frames'])==len(b['frames'])==36
  for x,y in zip(a['frames'],b['frames']):
   assert all(x[k]==y[k] for k in ['i','camera','target','time','windTime','obstruction','calls','triangles']),(quality,phase,x['i'])
   assert not x['glError'] and not y['glError']
   assert all(x['coverage'][k]==y['coverage'][k] for k in ['near','far','triangles','bufferBytes'])
   assert not x['coverage']['stats']['overflow'] and not y['coverage']['stats']['overflow']
   ims=[Image.open(p/f'gran-rio-{quality}-{v}-{phase}'/f"{x['i']:04}.png").convert('RGB') for v in ['base','combined']]
   assert all(np.count_nonzero(np.any(np.asarray(im)>5,axis=2))>10000 for im in ims)
   diff=np.abs(np.asarray(ims[0],dtype=np.int16)-np.asarray(ims[1],dtype=np.int16))
   results.append(dict(quality=quality,phase=phase,frame=x['i'],near=x['coverage']['near'],far=x['coverage']['far'],changedPixels=int(np.any(diff,axis=2).sum()),meanDifference=float(diff.mean())))
   if x['i'] in [0,17,35]:
    pair=Image.new('RGB',(2560,720));pair.paste(ims[0]);pair.paste(ims[1],(1280,0));pair.save(p/f"{quality}-{phase}-{x['i']:04}-pair.webp",lossless=True)
(p/'analysis.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'matchedPairs':len(results),'nearRanges':{q:[min(x['near'] for x in results if x['quality']==q),max(x['near'] for x in results if x['quality']==q)] for q in ['baja','media']},'farRanges':{q:[min(x['far'] for x in results if x['quality']==q),max(x['far'] for x in results if x['quality']==q)] for q in ['baja','media']}}))
