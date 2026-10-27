from pathlib import Path
import json,sys,numpy as np
from PIL import Image
p=Path(sys.argv[1]);d=json.loads((p/'captures.json').read_text(encoding='utf-8'));assert len(d['records'])==4
rows=[]
for phase in ['day','night']:
 a,b=[next(r for r in d['records'] if r['variant']==v and r['phase']==phase) for v in ['base','combined']]
 assert not a['errors'] and not b['errors']
 for i in range(3):
  for k in ['camera','target','time','calls','triangles']:assert a['frames'][i][k]==b['frames'][i][k]
  imgs=[Image.open(p/f'manglares-baja-{v}-{phase}/{i:04}.png').convert('RGB') for v in ['base','combined']]
  delta=abs(np.array(imgs[0]).astype(int)-np.array(imgs[1]).astype(int));rows.append(dict(phase=phase,view=i,changedPixels=int(np.any(delta,axis=2).sum()),maxDelta=int(delta.max())))
  if i==1:
   pair=Image.new('RGB',(2560,720));pair.paste(imgs[0],(0,0));pair.paste(imgs[1],(1280,0));pair.save(p/f'{phase}-pair.webp',lossless=True)
(p/'parity.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n');print(rows)
