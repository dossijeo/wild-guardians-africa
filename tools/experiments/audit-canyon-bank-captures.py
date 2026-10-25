from pathlib import Path
import sys,json,numpy as np
from PIL import Image
p=Path(sys.argv[1]);d=json.loads((p/'captures.json').read_text());out=[]
for phase in ['day','night']:
 a=next(r for r in d['records'] if r['variant']=='base' and r['phase']==phase);b=next(r for r in d['records'] if r['variant']=='combined' and r['phase']==phase)
 assert not a['errors'] and not b['errors']
 for x,y in zip(a['frames'],b['frames']):
  for k in ['camera','target','time','calls','triangles','glError']:assert x[k]==y[k],k
  assert x['glError']==0
  i=x['i'];ia=Image.open(p/f'gran-canon-media-base-{phase}/{i:04}.png');ib=Image.open(p/f'gran-canon-media-combined-{phase}/{i:04}.png');delta=np.abs(np.array(ia).astype(int)-np.array(ib).astype(int));out.append(dict(phase=phase,view=i,mae=float(delta.mean()),changed=int(np.any(delta,axis=2).sum())))
  if i==1:
   c=Image.new('RGB',(2560,720));c.paste(ia,(0,0));c.paste(ib,(1280,0));c.save(p/f'{phase}-pair.webp')
(p/'comparison.json').write_text(json.dumps(out,indent=2)+'\n');print(out)
