from pathlib import Path
from PIL import Image,ImageDraw
import json
p=Path('docs/qa/global-visual-lab/combined-campaign-review-v8');d=json.loads((p/'captures.json').read_text());old=json.loads(Path('docs/qa/global-visual-lab/combined-campaign-review-v7/captures.json').read_text());assert len(d['records'])==12
biomes=['sabana','gran-rio','gran-canon','manglares','volcanes','desierto'];rows=[]
for r in d['records']:
 assert not r['errors'] and len(r['frames'])==3
 ref=next(o for o in old['records'] if o['biome']==r['biome'] and o['phase']==r['phase'])
 for a,b in zip(r['frames'],ref['frames']):
  for k in ['camera','target','time']:assert a[k]==b[k],(r['biome'],k)
  assert not a['glError']
 rows.append({'biome':r['biome'],'phase':r['phase'],'cameraTimeMatchV7':True,'calls':[f['calls'] for f in r['frames']],'triangles':[f['triangles'] for f in r['frames']]})
for phase in ['day','night']:
 for pose in [0,1]:
  sheet=Image.new('RGB',(1920,768),(20,20,20));draw=ImageDraw.Draw(sheet)
  for j,b in enumerate(biomes):
   im=Image.open(p/f'{b}-media-combined-{phase}/{pose:04}.png').convert('RGB');assert any(hi>lo for lo,hi in im.getextrema());x=(j%3)*640;y=(j//3)*384;sheet.paste(im.resize((640,360)),(x,y+24));draw.text((x+8,y+5),b,fill='white')
  sheet.save(p/f'{phase}-pose{pose}-overview.webp',lossless=True)
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n');print('36 frames, 6 biomes, 4 overview sheets; matched camera/time versus V7')
