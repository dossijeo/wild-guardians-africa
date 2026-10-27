from pathlib import Path
import json,numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/grass-pigment-endpoint-20261021');d=json.loads((p/'captures.json').read_text());out=[]
for r in d['records']:
 a,b=r['frames'];assert not r['errors'] and not a['glError'] and not b['glError'];assert a['camera']==b['camera'] and a['time']==b['time']
 assert a['coverage']['near']==b['coverage']['far'] and a['coverage']['far']==b['coverage']['near']==0
 ims=[Image.open(p/f"sabana-media-{r['variant']}-{r['phase']}/{i:04}.png").convert('RGB') for i in [0,1]];aa,bb=[np.array(im,dtype=float) for im in ims];delta=abs(aa-bb)
 out.append(dict(variant=r['variant'],phase=r['phase'],instances=a['coverage']['near'],mae=float(delta.mean()),changedPixels=int(np.any(delta>0,axis=2).sum()),pixelsDeltaOver10=int(np.any(delta>10,axis=2).sum())))
 sheet=Image.new('RGB',(2560,720));sheet.paste(ims[0]);sheet.paste(ims[1],(1280,0));sheet.save(p/f"{r['variant']}-{r['phase']}-pair.webp",lossless=True)
(p/'summary.json').write_text(json.dumps(out,indent=2),encoding='utf-8',newline='\n');print(out)
