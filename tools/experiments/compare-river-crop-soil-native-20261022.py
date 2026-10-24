import json
from pathlib import Path
from PIL import Image,ImageChops
p=Path('docs/qa/global-visual-lab/gran-rio-crop-soil-native-20261022');q=Path('docs/qa/global-visual-lab/gran-rio-crop-soil-20261022')
a=json.loads((p/'captures.json').read_text(encoding='utf-8'));b=json.loads((q/'captures.json').read_text(encoding='utf-8'));assert len(a['records'])==len(b['records'])==4
rows=[]
for x,y in zip(a['records'],b['records']):
 assert not x['errors']
 for f,g in zip(x['frames'],y['frames']):
  for k in ['camera','target','elapsed','workers','time','origin','calls','triangles']:assert f[k]==g[k],(x['variant'],x['phase'],f['i'],k)
  rel=Path(f"gran-rio-media-{x['variant']}-{x['phase']}/{f['i']:04}.png")
  exact=ImageChops.difference(Image.open(p/rel).convert('RGB'),Image.open(q/rel).convert('RGB')).getbbox() is None
  rows.append(dict(variant=x['variant'],phase=x['phase'],view=f['i'],rgbExact=exact))
p.joinpath('equivalence.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n');print(rows);assert all(r['rgbExact'] for r in rows)
