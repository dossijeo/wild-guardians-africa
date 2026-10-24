import json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
base=Path('docs/qa/global-visual-lab')
a=base/'volcanes-current-no-culling-20261023'
b=base/'volcanes-current-populated-20261023'
out=base/'volcanes-instance-culling-review-20261023'
out.mkdir(exist_ok=True)
x=json.loads((a/'captures.json').read_text())
y=json.loads((b/'captures.json').read_text())
rows=[]
for phase in ['day','night']:
 ar=next(r for r in x['records'] if r['variant']=='native' and r['phase']==phase)
 br=next(r for r in y['records'] if r['variant']=='native' and r['phase']==phase)
 assert not ar['errors'] and not br['errors']
 for i,(af,bf) in enumerate(zip(ar['frames'],br['frames'])):
  for k in ['camera','target','time','elapsed','workers','origin']:
   assert af[k]==bf[k],(phase,i,k)
  assert not af['glError'] and not bf['glError']
  relative=f'volcanes-media-native-{phase}/{i:04}.png'
  ai=Image.open(a/relative).convert('RGB');bi=Image.open(b/relative).convert('RGB')
  delta=np.abs(np.array(ai,dtype=np.int16)-np.array(bi,dtype=np.int16))
  rows.append(dict(phase=phase,view=i,offCalls=af['calls'],onCalls=bf['calls'],offTriangles=af['triangles'],onTriangles=bf['triangles'],changedPixels=int(np.any(delta,axis=2).sum()),maxDelta=int(delta.max()),meanDelta=float(delta.mean())))
  pair=Image.new('RGB',(2560,748));pair.paste(ai,(0,28));pair.paste(bi,(1280,28))
  d=ImageDraw.Draw(pair);d.text((10,8),'INSTANCE CULLING OFF',fill='white');d.text((1290,8),'PRODUCTION INSTANCE CULLING ON',fill='white')
  pair.save(out/f'{phase}-{i}.jpg',quality=92)
(out/'comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(rows,indent=2))
