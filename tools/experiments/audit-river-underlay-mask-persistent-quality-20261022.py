import json
from pathlib import Path
from PIL import Image,ImageChops
p=Path('docs/qa/global-visual-lab/river-underlay-mask-persistent-quality-20261022');d=json.loads((p/'captures.json').read_text());rows=[]
for r in d['records']:
 f=r['frames'];expected=[[1,48],[1,40],[0,40],[1,48],[0,48],[1,48],[0,48],[1,48]]
 assert [x['underlay'] for x in f]==expected
 assert f[4]['coverage']['stats']['overflow']>0 and f[5]['coverage']['stats']['overflow']==0
 assert not r['errors'] and all(x['glError']==0 for x in f)
 folder=p/f"gran-rio-media-persistent-{r['phase']}";a=Image.open(folder/'0000.png').convert('RGB')
 exact=[ImageChops.difference(a,Image.open(folder/f'{i:04}.png').convert('RGB')).getbbox() is None for i in [3,5,7]]
 rows.append(dict(phase=r['phase'],restoredRGBExact=exact,activationMatches=True,overflow=f[4]['coverage']['stats']['overflow']))
 assert all(exact)
(p/'audit.json').write_text(json.dumps(rows,indent=2));print(rows)
