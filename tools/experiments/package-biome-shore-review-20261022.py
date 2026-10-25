from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageChops,ImageStat
import json
import os
root=Path(os.environ.get('WG_BANK_OUT','docs/qa/global-visual-lab/biome-world-bank-review-20261022'))
variant=os.environ.get('WG_BANK_VARIANT','worldbank')
records=json.loads((root/'captures.json').read_text(encoding='utf-8'))['records'];audit=[]
for biome in sorted(set(r['biome'] for r in records)):
 for phase in ['day','night']:
  a=next(r for r in records if r['biome']==biome and r['phase']==phase and r['variant']=='baseline')
  b=next(r for r in records if r['biome']==biome and r['phase']==phase and r['variant']==variant)
  canvas=Image.new('RGB',(1600,1380),'#20242a');draw=ImageDraw.Draw(canvas)
  for i,(fa,fb) in enumerate(zip(a['frames'],b['frames'])):
   for field in ['camera','target','time']:assert fa[field]==fb[field],(biome,phase,i,field)
   images=[Image.open(root/f'{biome}-media-{v}-{phase}/{i:04}.png').convert('RGB') for v in ['baseline',variant]]
   assert all(max(ImageStat.Stat(im).stddev)>10 for im in images),'Blank capture'
   assert not a['errors'] and not b['errors']
   audit.append({'biome':biome,'phase':phase,'view':i,'countersMatch':all(fa[k]==fb[k] for k in ['calls','triangles']),'calls':[fa['calls'],fb['calls']],'triangles':[fa['triangles'],fb['triangles']],'pixelIdentical':ImageChops.difference(*images).getbbox() is None})
   for j,im in enumerate(images):
    canvas.paste(ImageOps.contain(im,(800,450)),(800*j,460*i+10));draw.text((800*j+8,460*i),['BASELINE','SHALLOW EDGE'][j],fill='white')
  canvas.save(root/f'{biome}-{phase}-paired.webp',quality=90)
(root/'pair-audit.json').write_bytes(json.dumps(audit,indent=2).encode())
print(json.dumps({'pairs':len(audit),'counterMismatches':sum(not a['countersMatch'] for a in audit)}))
