import json,sys
from pathlib import Path
from PIL import Image,ImageChops
root=Path('docs/qa/global-visual-lab')
base=root/'reviewed-five-biomes-20261022'
candidate=Path(sys.argv[1])
a=json.loads((base/'captures.json').read_text())
b=json.loads((candidate/'captures.json').read_text())
assert len(b['records'])==4, 'Incomplete capture set'
rows=[]
for r in b['records']:
 assert not r['errors'] and len(r['frames'])==3
 old=next(x for x in a['records'] if x['biome']==r['biome'] and x['variant']==r['variant'] and x['phase']==r['phase'])
 for f,g in zip(r['frames'],old['frames']):
  assert not f['glError'] and f['camera']==g['camera'] and f['target']==g['target'] and f['time']==g['time']
  assert f['calls']==g['calls'] and f['triangles']==g['triangles']
  assert f['farBackground']['enabled'] and f['farBackground']['mountainsVisible']
  assert all(x['ready'] for x in f['farBackground']['adapters'])
  if r['variant']!='native': continue
  rel=f"gran-canon-media-native-{r['phase']}/{f['i']:04}.png"
  diff=ImageChops.difference(Image.open(base/rel).convert('RGB'),Image.open(candidate/rel).convert('RGB'))
  rows.append(dict(phase=r['phase'],view=f['i'],changedPixels=sum(any(rgb) for rgb in diff.getdata()),bbox=diff.getbbox()))
(candidate/'comparison.json').write_text(json.dumps(dict(controls='camera, target, time, draw calls, triangles equal; backgrounds ready; no recorded errors',pixels=rows),indent=2)+'\n',encoding='utf8',newline='\n')
print('12 frame controls passed. Pixel changes do not establish visual improvement.')
