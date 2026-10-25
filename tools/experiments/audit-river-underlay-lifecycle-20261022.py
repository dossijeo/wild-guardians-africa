from pathlib import Path
import json
from PIL import Image,ImageChops
p=Path('docs/qa/global-visual-lab/river-underlay-lifecycle-20261022')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));out=[]
for r in d['records']:
 assert not r['errors']
 expected=[[1,48],[1,40],[0,40],[1,48],[0,48],[1,48]]
 for f,e in zip(r['frames'],expected):
  assert f['underlay']==e,(f['step'],f['underlay'])
  assert not f['glError'] and f['coverage']['stats']['overflow']==0
 folder=p/f"gran-rio-media-gated-on-{r['phase']}"
 for a,b in [(0,3),(0,5),(2,4)]:
  same=ImageChops.difference(Image.open(folder/f'{a:04}.png').convert('RGB'),Image.open(folder/f'{b:04}.png').convert('RGB')).getbbox() is None
  assert same,(r['phase'],a,b)
  out.append(dict(phase=r['phase'],steps=[a,b],pixelExact=True))
disposed=json.loads((p/'disposal.json').read_text());assert disposed['disposed'] and not disposed['attached'] and disposed['underlay']==[0,48] and not disposed['glError']
(p/'audit.json').write_bytes(json.dumps(out,indent=2).encode())
print('12 lifecycle states, 6 pixel-exact pairs, disposal resets filter')
