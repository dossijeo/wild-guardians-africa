import json,sys
from pathlib import Path
from PIL import Image,ImageDraw
for biome in sys.argv[1:] or ['sabana','gran-rio']:
 p=Path(f'docs/qa/global-visual-lab/{biome}-populated-frozen-20261022');d=json.loads((p/'captures.json').read_text(encoding='utf-8'));assert len(d['records'])==4
 fixture=json.loads((p/'native-fixture.json').read_text(encoding='utf-8'));saved=json.loads(fixture['timing']['navigationContext']['state'])
 for r in d['records']:
  assert not r['errors'] and len(r['frames'])==3
  for f in r['frames']:
   assert not f['glError'] and abs(f['elapsed']-saved['elapsed'])<1e-8
   assert f['farBackground']['enabled'] and f['farBackground']['mountainsVisible']
   assert f['coverage']['stats']['overflow']==0
 for phase in ['day','night']:
  im=Image.new('RGB',(1920,384))
  for i in range(3):
   im.paste(Image.open(p/f'{biome}-media-native-{phase}/{i:04}.png').convert('RGB').resize((640,360)),(i*640,24));ImageDraw.Draw(im).text((i*640+8,6),['Normal','Elevated','Reverse'][i],fill='white')
  im.save(p/f'contact-{phase}.jpg',quality=92)
 print(biome,'12 frames; saved elapsed exact; no errors/overflow; full backgrounds')
