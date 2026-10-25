from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageChops
import json
root=Path('docs/qa/global-visual-lab/canyon-adaptive-wide-20261022')
records=json.loads((root/'captures.json').read_text(encoding='utf-8'))['records'];audit=[]
for biome in sorted(set(r['biome'] for r in records)):
 for phase in ['day','night']:
  a=next(r for r in records if r['biome']==biome and r['phase']==phase and r['variant']=='baseline')
  b=next(r for r in records if r['biome']==biome and r['phase']==phase and r['variant']=='depth')
  canvas=Image.new('RGB',(1600,1380),'#20242a');draw=ImageDraw.Draw(canvas)
  for i,(fa,fb) in enumerate(zip(a['frames'],b['frames'])):
   for field in ['camera','target','time']:assert fa[field]==fb[field],(biome,phase,i,field)
   images=[Image.open(root/f'{biome}-media-{v}-{phase}/{i:04}.png').convert('RGB') for v in ['baseline','depth']]
   audit.append({'biome':biome,'phase':phase,'view':i,'callsMatch':fa['calls']==fb['calls'],'trianglesBefore':fa['triangles'],'trianglesAfter':fb['triangles'],'pixelIdentical':ImageChops.difference(*images).getbbox() is None})
   for j,im in enumerate(images):
    canvas.paste(ImageOps.contain(im,(800,450)),(800*j,460*i+10));draw.text((800*j+8,460*i),['FULL FINE','ADAPTIVE'][j],fill='white')
  canvas.save(root/f'{biome}-{phase}-paired.webp',quality=90)
(root/'pair-audit.json').write_bytes(json.dumps(audit,indent=2).encode())
print(json.dumps({'pairs':len(audit),'cameraTimeMismatches':0}))
