import json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
out=Path('public/assets/visual-lab/moss-composite');out.mkdir(parents=True,exist_ok=True)
config=json.loads(Path('public/content/ground-materials.json').read_text())['mangrove']
n=1024;y,x=np.mgrid[0:n,0:n].astype(np.float32)/n
field=.5+.18*np.sin(2*np.pi*x+.7)*np.cos(2*np.pi*y-1.1)+.13*np.sin(2*np.pi*(2*x+y)+2.2)+.09*np.cos(2*np.pi*(x-2*y)-.4)
t=np.clip((field-.40)/.20,0,1);weight=(t*t*(3-2*t))[...,None]
records=[]
for role in ['base','normal','arh']:
 src=Path('public'+config[role]);a=np.asarray(Image.open(src).convert('RGB'),dtype=np.float32)/255
 # Integer UV frequencies preserve periodic wrapping; same orientation for both normals.
 small=np.asarray(Image.open(src).convert('RGB').resize((n//4,n//4),Image.Resampling.BOX),dtype=np.float32)/255
 fine=np.tile(small,(4,4,1))
 if role=='normal':
  a=a*2-1;fine=fine*2-1
  mixed=a*(1-weight)+fine*weight;mixed/=np.maximum(np.linalg.norm(mixed,axis=2,keepdims=True),1e-6);mixed=mixed*.5+.5
 else:mixed=a*(1-weight)+fine*weight
 pixels=np.uint8(np.rint(np.clip(mixed,0,1)*255));dest=out/(role+'.png');Image.fromarray(pixels).save(dest)
 records.append(dict(role=role,source=str(src),sourceSha256=hashlib.sha256(src.read_bytes()).hexdigest(),output=str(dest),sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),size=list(pixels.shape[:2]),bytes=dest.stat().st_size))
Path('docs/qa/global-visual-lab/mangrove-moss-composite').mkdir(parents=True,exist_ok=True)
Path('docs/qa/global-visual-lab/mangrove-moss-composite/resources.json').write_text(json.dumps(dict(records=records,nominalRGBA8MipBytes=3*n*n*4*4/3,note='Same dimensions and three samplers as source; finer layer loses spatial bandwidth. Numeric data blend, no extra gamma conversion.'),indent=2)+'\n',encoding='utf-8',newline='\n')
print('Baked three 1024 maps, same nominal allocation as baseline')
