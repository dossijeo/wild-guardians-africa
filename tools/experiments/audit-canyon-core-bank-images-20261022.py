from pathlib import Path
from PIL import Image,ImageChops,ImageStat
import json
for name in ['review','stream']:
 root=Path(f'docs/qa/global-visual-lab/canyon-core-bank-{name}-20261022')
 data=json.loads((root/'captures.json').read_text(encoding='utf8'));rows=[]
 for phase in ['day','night']:
  a,b=[r for r in data['records'] if r['phase']==phase]
  assert not a['errors'] and not b['errors']
  for i,(fa,fb) in enumerate(zip(a['frames'],b['frames'])):
   assert all(fa[k]==fb[k] for k in ['camera','target','time','origin'])
   ims=[Image.open(root/f'gran-canon-media-{v}-{phase}/{i:04}.png').convert('RGB') for v in ['worldbank','corebank']]
   assert all(max(ImageStat.Stat(im).stddev)>10 for im in ims)
   exact=ImageChops.difference(*ims).getbbox() is None
   assert exact,(name,phase,i)
   rows.append(dict(phase=phase,view=i,exact=exact,origin=fa['origin'],calls=[fa['calls'],fb['calls']],triangles=[fa['triangles'],fb['triangles']],memory=[fa['memory'],fb['memory']],coreMeshes=fb.get('coreMeshes')))
 (root/'audit.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
 print(name,len(rows),'exact pairs')
