import json
from pathlib import Path
from PIL import Image, ImageChops

p=Path('docs/qa/global-visual-lab/savanna-coverage-cost-isolation/captures')
records=json.loads((p/'captures.json').read_text(encoding='utf-8'))['records']
assert len(records)==4
for phase in ['day','night']:
 a,b=[next(r for r in records if r['phase']==phase and r['variant']==v) for v in ['base','combined']]
 assert not a['errors'] and not b['errors']
 for fa,fb in zip(a['frames'],b['frames']):
  assert all(fa[k]==fb[k] for k in ['i','camera','target','time'])
  assert not fa['glError'] and not fb['glError']
  assert fb['calls']-fa['calls']==1
  assert fb['triangles']-fa['triangles']==fb['coverage']['triangles']
  images=[]
  for r,f in [(a,fa),(b,fb)]:
   path=p/f"sabana-baja-{r['variant']}-{phase}"/f"{f['i']:04}.png"
   im=Image.open(path).convert('RGB');im.save(path.with_suffix('.webp'),lossless=True)
   assert ImageChops.difference(im,Image.open(path.with_suffix('.webp')).convert('RGB')).getbbox() is None
   images.append(im)
  pair=Image.new('RGB',(2560,720));pair.paste(images[0]);pair.paste(images[1],(1280,0));pair.save(p/f"{phase}-{fa['i']:04}-pair.webp",lossless=True)
print('Six paired poses verified; twelve lossless captures and six comparisons.')
