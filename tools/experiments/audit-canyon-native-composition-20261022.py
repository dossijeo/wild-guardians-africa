from pathlib import Path
from PIL import Image,ImageDraw
p=Path('docs/qa/global-visual-lab/canyon-native-composition-20261022')
for phase in ['day','night']:
 for i in range(6):
  paths=[p/f'gran-canon-media-{v}-{phase}/{i:04}.png' for v in ['base','soft','combined']]
  if not all(x.exists() for x in paths):continue
  sheet=Image.new('RGB',(1920,384));draw=ImageDraw.Draw(sheet)
  for k,f in enumerate(paths):sheet.paste(Image.open(f).resize((640,360)),(k*640,24));draw.text((k*640+8,6),['Warm base','Soft sand','Soft sand + horizon normals'][k],fill='white')
  sheet.save(p/f'comparison-{phase}-{i}.jpg')

import json
records=json.loads((p/'captures.json').read_text(encoding='utf-8'))['records']
assert len(records)==6
for phase in ['day','night']:
 arms=[next(r for r in records if r['phase']==phase and r['variant']==v) for v in ['base','soft','combined']]
 for r in arms:assert not r['errors'] and len(r['frames'])==6
 for i in range(6):
  for field in ['camera','target','time','calls','triangles']:
   assert arms[0]['frames'][i][field]==arms[1]['frames'][i][field]==arms[2]['frames'][i][field],(phase,i,field)
print('36 captures, 12 matched three-way comparisons; identical cameras/time/calls/triangles, no errors')
