from pathlib import Path
import json
from PIL import Image,ImageDraw
p=Path('docs/qa/global-visual-lab/mangrove-pigment-isolation-20261022')
a=Path('docs/qa/global-visual-lab/reviewed-profile-20261022')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));old=json.loads((a/'captures.json').read_text(encoding='utf-8'));rows=[]
assert len(d['records'])==4
for r in d['records']:
 assert not r['errors']
 o=next(x for x in old['records'] if all(x[k]==r[k] for k in ['biome','quality','variant','phase']))
 for f,b in zip(r['frames'],o['frames']):
  assert all(f[k]==b[k] for k in ['camera','target','time','origin','calls','triangles'])
  assert not f['glError']
  rows.append(dict(variant=r['variant'],phase=r['phase'],view=f['i'],calls=f['calls'],triangles=f['triangles']))
  if r['variant']=='native':
   rel=Path(f"manglares-media-native-{r['phase']}/{f['i']:04}.png")
   im=Image.new('RGB',(2560,752));im.paste(Image.open(a/rel),(0,32));im.paste(Image.open(p/rel),(1280,32));ImageDraw.Draw(im).text((15,8),'Original dense | Constant leaf pigment (right), diagnostic only',fill='white');im.save(p/f"pair-{r['phase']}-{f['i']}.jpg",quality=92)
(p/'comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
print('12 poses and workloads match; no capture errors')
