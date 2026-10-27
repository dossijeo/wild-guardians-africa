from pathlib import Path
from PIL import Image,ImageDraw
import json
p=Path('docs/qa/global-visual-lab/six-biome-native-review-20261022');root=Path('C:/Users/PC/source/repos/wild-guardians-africa/.codex-remote-attachments/01a0f8fd-dd6c-7a53-b3ed-cdb47d54d46d')
refs={'sabana':'09045a28-5ace-4eba-a8e3-31649440d917/1-13511.jpg','gran-rio':'09045a28-5ace-4eba-a8e3-31649440d917/2-13512.jpg','manglares':'09045a28-5ace-4eba-a8e3-31649440d917/3-13514.jpg','desierto':'09045a28-5ace-4eba-a8e3-31649440d917/4-13518.jpg','volcanes':'09045a28-5ace-4eba-a8e3-31649440d917/5-13519.jpg','gran-canon':'3f95eb60-9d78-4b6f-b08d-eebcb095c2f7/1-13520.jpg'}
records=json.loads((p/'captures.json').read_text(encoding='utf-8'))['records'];assert len(records)==12
for biome,ref in refs.items():
 row=next(r for r in records if r['biome']==biome and r['phase']=='day');assert not row['errors'] and len(row['frames'])==3
 sheet=Image.new('RGB',(1280,768));draw=ImageDraw.Draw(sheet)
 paths=[root/ref]+[p/f'{biome}-media-native-day/{i:04}.png' for i in range(3)]
 for i,path in enumerate(paths):
  x=(i%2)*640;y=(i//2)*384;sheet.paste(Image.open(path).convert('RGB').resize((640,360)),(x,y+24));draw.text((x+6,y+6),['User mockup (art reference; different composition)','Native: game view','Native: elevated','Native: reverse'][i],fill='white')
 sheet.save(p/f'art-review-{biome}.jpg')
for r in records:
 assert not r['errors']
 for f in r['frames']:
  assert f['glError']==0
  if r['biome'] in ['sabana','gran-rio','manglares']:assert f['coverage']['active']
print('36 real frames, 6 art-reference sheets, no GL/console errors')
