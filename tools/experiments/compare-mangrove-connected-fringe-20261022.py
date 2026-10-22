from pathlib import Path
import json
from PIL import Image, ImageDraw
p=Path('docs/qa/global-visual-lab/mangrove-connected-fringe-20261022')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'))
assert len(d['records'])==8
rows=[]
for r in d['records']:
 if r['treatment']!='fringe': continue
 o=next(v for v in d['records'] if v['treatment']=='original' and v['variant']==r['variant'] and v['phase']==r['phase'])
 assert not r['errors'] and not o['errors']
 for a,b in zip(o['frames'],r['frames']):
  assert all(a[k]==b[k] for k in ['camera','target','time','origin'])
  assert not a['glError'] and not b['glError']
  assert not b['coverage']['stats']['overflow']
  assert b['coverage']['near']+b['coverage']['far']>=a['coverage']['near']+a['coverage']['far']
  rows.append(dict(addedInstances=b['coverage']['near']+b['coverage']['far']-a['coverage']['near']-a['coverage']['far'],addedTriangles=b['triangles']-a['triangles'],variant=r['variant'],phase=r['phase'],view=a['i'],calls=a['calls'],triangles=a['triangles']))
  if r['variant']!='native': continue
  rel=f"manglares-media-native-{r['phase']}/{a['i']:04}.png"
  im=Image.new('RGB',(2560,752)); im.paste(Image.open(p/'original'/rel),(0,32));im.paste(Image.open(p/'fringe'/rel),(1280,32))
  ImageDraw.Draw(im).text((15,8),'Original dense (left) | Connected dense fringe (right)',fill='white')
  im.save(p/f"pair-{r['phase']}-{a['i']}.jpg",quality=94)
(p/'comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
print('12 comparable view pairs; no errors')
