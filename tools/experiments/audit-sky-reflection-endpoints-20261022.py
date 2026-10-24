from PIL import Image,ImageChops
from pathlib import Path
import json
p=Path('docs/qa/global-visual-lab/sky-reflection-endpoints-20261022');d=json.loads((p/'captures.json').read_text());rows=[]
for r in d['records']:
 assert not r['errors']
 fs=r['frames']
 assert [f['endpoint'] for f in fs]==[1,0,1]
 for b in [1,2]:
  for field in ['camera','target','time','calls','triangles']:assert fs[0][field]==fs[b][field]
  a=Image.open(p/f'gran-rio-media-sky-{r["phase"]}/0000.png').convert('RGB');im=Image.open(p/f'gran-rio-media-sky-{r["phase"]}/{b:04}.png').convert('RGB');dif=ImageChops.difference(a,im)
  row=dict(phase=r['phase'],comparison='off' if b==1 else 'repeat',maxChannel=max(e[1] for e in dif.getextrema()),identical=dif.getbbox() is None)
  rows.append(row)
  assert row['identical'],row
(p/'audit.json').write_bytes(json.dumps(rows,indent=2).encode());print(rows)
