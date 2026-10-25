from pathlib import Path
import json
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/river-soil-layer-motion');results=[]
for quality in ['baja','media']:
 for variant in ['base','combined']:
  folder=p/f'stream-{quality}-{variant}';rows=json.loads((folder/'trace.json').read_text());assert len(rows)==5
  assert all(not r['glError'] for r in rows)
  first,last=rows[0],rows[-1]
  for key in ['camera','target','chunks']:assert first[key]==last[key],(quality,variant,key)
  ims=[Image.open(folder/f'{i}.png').convert('RGB') for i in [0,4]]
  assert all(np.count_nonzero(np.any(np.asarray(im)>5,axis=2))>10000 for im in ims)
  diff=np.abs(np.asarray(ims[0],dtype=np.int16)-np.asarray(ims[1],dtype=np.int16))
  disposal=json.loads((folder/'disposal.json').read_text());expected=3 if variant=='combined' else 0
  assert disposal['layerCount']==expected and disposal['disposeEvents']==[1]*expected
  assert disposal['disposed'] and disposal['remainingLayers']==0
  results.append(dict(quality=quality,variant=variant,changedReturnPixels=int(np.any(diff,axis=2).sum()),maximumDifference=int(diff.max()),meanDifference=float(diff.mean()),origins=[r['origin'] for r in rows],memory=[r['memory'] for r in rows],calls=[r['calls'] for r in rows],triangles=[r['triangles'] for r in rows],disposal=disposal))
  if variant=='combined':
   pair=Image.new('RGB',(2560,720));pair.paste(ims[0]);pair.paste(ims[1],(1280,0));pair.save(p/f'{quality}-return-pair.webp',lossless=True)
(p/'streaming-analysis.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(results,indent=2))
