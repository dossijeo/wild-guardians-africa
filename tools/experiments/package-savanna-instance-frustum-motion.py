import json
from pathlib import Path
import numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/savanna-instance-frustum/motion')
rs=json.loads((p/'captures.json').read_text(encoding='utf-8'))['records'];assert len(rs)==4
out=[]
for phase in ['day','night']:
 a,b=[next(r for r in rs if r['phase']==phase and r['variant']==v) for v in ['base','combined']]
 assert not a['errors'] and not b['errors']
 assert len(a['frames'])==len(b['frames'])==36
 for fa,fb in zip(a['frames'],b['frames']):
  assert all(fa[k]==fb[k] for k in ['i','camera','target','time','windTime'])
  assert not fa['glError'] and not fb['glError']
  assert all(fa['coverage'][k]==fb['coverage'][k] for k in ['near','far','triangles','bufferBytes'])
  images=[]
  for r,f in [(a,fa),(b,fb)]:
   path=p/f"sabana-baja-{r['variant']}-{phase}"/f"{f['i']:04}.png"
   im=Image.open(path).convert('RGB');images.append(im)
  diff=np.abs(np.asarray(images[0],dtype=np.int16)-np.asarray(images[1],dtype=np.int16))
  out.append(dict(phase=phase,view=fa['i'],changedPixels=int(np.any(diff,axis=2).sum()),maxDifference=int(diff.max()),mae=float(diff.mean()),baseCalls=fa['calls'],candidateCalls=fb['calls'],baseTriangles=fa['triangles'],candidateTriangles=fb['triangles']))
  pair=Image.new('RGB',(2560,720));pair.paste(images[0]);pair.paste(images[1],(1280,0));pair.save(p/f"{phase}-{fa['i']:04}-pair.png")
  if fa['i'] in [0,17,35]:pair.save(p/f"{phase}-{fa['i']:04}-pair.webp",lossless=True)
(p/'comparison.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(out))
