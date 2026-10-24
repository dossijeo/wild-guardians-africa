import json
from pathlib import Path
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/obstruction-fade-motion')
rs=json.loads((p/'captures.json').read_text(encoding='utf-8'))['records'];assert len(rs)==4
out=[]
for phase in ['day','night']:
 a,b=[next(r for r in rs if r['phase']==phase and r['variant']==v) for v in ['base','combined']]
 assert not a['errors'] and not b['errors'] and len(a['frames'])==len(b['frames'])==90
 for fa,fb in zip(a['frames'],b['frames']):
  assert all(fa[k]==fb[k] for k in ['i','camera','target','time','windTime','obstruction']), (phase,fa['i'],'pose or obstruction mismatch')
  assert not fa['glError'] and not fb['glError']
  assert all(fa['coverage'][k]==fb['coverage'][k] for k in ['near','far','triangles','bufferBytes'])
  images=[Image.open(p/f"sabana-baja-{r['variant']}-{phase}"/f"{fa['i']:04}.png").convert('RGB') for r in [a,b]]
  assert all(np.asarray(im).max()>20 and np.count_nonzero(np.any(np.asarray(im)>5,axis=2))>10000 for im in images),(phase,fa['i'],'empty capture')
  diff=np.abs(np.asarray(images[0],dtype=np.int16)-np.asarray(images[1],dtype=np.int16))
  out.append(dict(phase=phase,frame=fa['i'],changedPixels=int(np.any(diff,axis=2).sum()),maxDifference=int(diff.max()),baseCalls=fa['calls'],candidateCalls=fb['calls'],baseTriangles=fa['triangles'],candidateTriangles=fb['triangles'],partial=sum(.002<=v<.999 for _,v in fa['obstruction']),hidden=sum(v<.002 for _,v in fa['obstruction'])))
  if fa['i'] in [0,30,45,60,89]:
   pair=Image.new('RGB',(2560,720));pair.paste(images[0]);pair.paste(images[1],(1280,0));pair.save(p/f"{phase}-{fa['i']:04}-pair.webp",lossless=True)
(p/'comparison.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(pairs=len(out),exact=sum(x['changedPixels']==0 for x in out),maxPartial=max(x['partial'] for x in out),maxExtraCalls=max(x['candidateCalls']-x['baseCalls'] for x in out))))
