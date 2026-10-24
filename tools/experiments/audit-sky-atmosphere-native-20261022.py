from pathlib import Path
from PIL import Image,ImageChops
import json
p=Path('docs/qa/global-visual-lab/sky-atmosphere-native-20261022');q=p.parent/'sky-palette-six-biomes-20261022'
records=json.loads((p/'captures.json').read_text())['records'];reference=json.loads((q/'captures.json').read_text())['records'];rows=[]
assert len(records)==12
for r in records:
 assert not r['errors']
 original=next(v for v in reference if v['biome']==r['biome'] and v['phase']==r['phase'] and v['variant']=='baseline')
 for i,(a,b) in enumerate(zip(r['frames'],original['frames'])):
  for field in ['camera','target','time','calls','triangles']:assert a[field]==b[field]
  f=f"{r['biome']}-media-baseline-{r['phase']}/{i:04}.png"
  d=ImageChops.difference(Image.open(p/f).convert('RGB'),Image.open(q/f).convert('RGB'))
  h=d.histogram();rows.append(dict(biome=r['biome'],phase=r['phase'],view=i,identical=d.getbbox() is None,maxChannel=max(e[1] for e in d.getextrema()),meanChannel=sum((j%256)*n for j,n in enumerate(h))/(1280*720*3)))
(p/'equivalence.json').write_bytes(json.dumps(rows,indent=2).encode())
print({'frames':len(rows),'exact':sum(r['identical'] for r in rows),'maxChannel':max(r['maxChannel'] for r in rows)})
