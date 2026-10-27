from pathlib import Path
import json
from PIL import Image, ImageChops
root=Path('docs/qa/global-visual-lab/desert-meso-optin-20261021')
d=json.loads((root/'captures.json').read_text());checks=[]
for phase in ['day','night']:
 a,b=[next(x for x in d['records'] if x['variant']==v and x['phase']==phase) for v in ['base','combined']]
 assert not a['errors'] and not b['errors']
 for i,(fa,fb) in enumerate(zip(a['frames'],b['frames'])):
  for key in ['camera','target','time','calls','triangles']:assert fa[key]==fb[key],(phase,i,key)
  ia=Image.open(root/f'desierto-media-base-{phase}/{i:04}.png').convert('RGB')
  ib=Image.open(root/f'desierto-media-combined-{phase}/{i:04}.png').convert('RGB')
  assert ImageChops.difference(ia,ib).getbbox() is None,(phase,i)
  checks.append(dict(phase=phase,pose=i,pixelExact=True,calls=fa['calls'],triangles=fa['triangles']))
(root/'audit.json').write_bytes((json.dumps(checks,indent=2)+'\n').encode())
print('Six pixel-exact QA/native-option pairs, matching cameras and geometry counters.')
