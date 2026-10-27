import json
from pathlib import Path
from PIL import Image,ImageChops
root=Path('docs/qa/global-visual-lab');out={}
for tag in ['stream','occupancy','quality']:
 p=root/f'river-underlay-native-{tag}-20261022';d=json.loads((p/'captures.json').read_text());rows=[]
 for r in d['records']:
  f=r['frames'];assert not r['errors'] and all(x['glError']==0 for x in f)
  folder=p/f"gran-rio-media-native-{r['phase']}"
  equal=lambda i,j:ImageChops.difference(Image.open(folder/f'{i:04}.png').convert('RGB'),Image.open(folder/f'{j:04}.png').convert('RGB')).getbbox() is None
  if tag=='stream':
   assert all(not x['stale'] for x in f)
   exact=equal(0,4);hashes=f[0]['maskHashes']==f[-1]['maskHashes']
   if r['phase']=='day-warm':assert exact and hashes
   rows.append(dict(phase=r['phase'],returnRGBExact=exact,returnMaskHashesExact=hashes))
  elif tag=='quality':
   assert [x['underlay'] for x in f]==[[1,48],[1,40],[0,40],[1,48],[0,48],[1,48],[0,48],[1,48]]
   assert f[4]['coverage']['stats']['overflow']>0
   assert all(equal(0,i) for i in [3,5,7])
   rows.append(dict(phase=r['phase'],restoredRGBExact=True))
  else:
   c=f[-1]['crop'];assert c['before']>0 and c['after']==0 and c['maskAfter']==0 and c['dirtyAfterEvent'] and not c['dirtyAfterSync']
   rows.append(dict(phase=r['phase'],crop=c))
 out[tag]=rows
(root/'river-underlay-native-lifecycle-20261022.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
