from pathlib import Path
import json
from PIL import Image,ImageDraw
r=Path('docs/qa/global-visual-lab/native-shore-low-review-20261022');d=json.loads((r/'captures.json').read_text(encoding='utf8'))
assert len(d['records'])==12
for record in d['records']:assert not record['errors'] and len(record['frames'])==3 and all(not f['glError'] for f in record['frames'])
for phase in ['day','night']:
 records=[x for x in d['records'] if x['phase']==phase]
 sheet=Image.new('RGB',(1280,3*384),(20,20,20));draw=ImageDraw.Draw(sheet)
 for i,x in enumerate(records):
  p=r/f"{x['biome']}-{x['quality']}-{x['variant']}-{phase}"/'0000.png';im=Image.open(p).convert('RGB').resize((640,360));col=i%2;row=i//2;sheet.paste(im,(col*640,row*384+24));draw.text((col*640+8,row*384+5),x['biome']+' / '+phase+' / baja',fill='white')
 sheet.save(r/f'overview-{phase}.jpg',quality=94)
print('36 captures; 12 records without errors')
