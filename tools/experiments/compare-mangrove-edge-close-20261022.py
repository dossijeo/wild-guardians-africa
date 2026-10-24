from pathlib import Path
import json
from PIL import Image, ImageDraw
p=Path('docs/qa/global-visual-lab/mangrove-edge-close-20261022')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'))
assert len(d['records'])==8
rows=[]
for r in d['records']:
 if r['treatment']!='edge': continue
 o=next(v for v in d['records'] if v['treatment']=='original' and v['variant']==r['variant'] and v['phase']==r['phase'])
 assert not r['errors'] and not o['errors']
 for a,b in zip(o['frames'],r['frames']):
  assert all(a[k]==b[k] for k in ['camera','target','time','origin','calls','triangles'])
  assert not a['glError'] and not b['glError']
  rows.append(dict(variant=r['variant'],phase=r['phase'],view=a['i'],calls=a['calls'],triangles=a['triangles']))
  if r['variant']!='native': continue
  rel=f"manglares-media-native-{r['phase']}/{a['i']:04}.png"
  im=Image.new('RGB',(2560,752)); im.paste(Image.open(p/'original'/rel),(0,32));im.paste(Image.open(p/'edge'/rel),(1280,32))
  ImageDraw.Draw(im).text((15,8),'Original dense (left) | Edge retention (right)',fill='white')
  im.save(p/f"pair-{r['phase']}-{a['i']}.jpg",quality=94)
(p/'comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
print('12 comparable view pairs; no errors')
