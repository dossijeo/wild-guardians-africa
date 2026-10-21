import json
from pathlib import Path
from PIL import Image
import numpy as np
p=Path('docs/qa/global-visual-lab/canyon-sand-ablation');d=json.loads((p/'captures.json').read_text(encoding='utf-8'));rs=d['records'];assert len(rs)==6
out=[]
for phase in ['day','night']:
 records=[next(r for r in rs if r['phase']==phase and r['variant']==v) for v in ['full','flat-normal','flat-color']]
 assert all(not r['errors'] and len(r['frames'])==3 for r in records)
 for i in range(3):
  base=records[0]['frames'][i];images=[]
  for r in records:
   f=r['frames'][i]
   for k in ['camera','target','time','calls','triangles']:assert f[k]==base[k]
   images.append(Image.open(p/f"gran-canon-media-{r['variant']}-{phase}/{i:04}.png").convert('RGB'))
  for j in [1,2]:
   diff=np.abs(np.asarray(images[0]).astype(int)-np.asarray(images[j]).astype(int));out.append(dict(phase=phase,view=i,variant=records[j]['variant'],mae=float(diff.mean()),changedPixels=int(np.any(diff,axis=2).sum())))
  if i==2:
   panel=Image.new('RGB',(3840,720))
   for j,im in enumerate(images):panel.paste(im,(1280*j,0))
   panel.resize((2400,450)).save(p/f'{phase}-triptych.webp',quality=95)
(p/'comparison.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n');print('18 captures validated; full / flat normal / mean color')
