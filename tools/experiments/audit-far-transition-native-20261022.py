from pathlib import Path
from PIL import Image
import numpy as np
import json
import os
root=Path('docs/qa/global-visual-lab')
old=root/'far-transition-six-biome-20261022'
new=Path(os.environ.get('WG_REVIEW_OUT',str(root/'far-transition-native-20261022')))
a=json.loads((old/'captures.json').read_text())['records']
b=json.loads((new/'captures.json').read_text())['records']
rows=[]
for record in b:
 if record['variant']!='native':continue
 biome,phase=record['biome'],record['phase']
 prior=next(r for r in a if r['biome']==biome and r['phase']==phase and r['variant']=='after')
 for i,frame in enumerate(record['frames']):
  x=np.asarray(Image.open(old/f'{biome}-media-after-{phase}'/f'{i:04d}.png').convert('RGB')).astype(int)
  y=np.asarray(Image.open(new/f'{biome}-media-native-{phase}'/f'{i:04d}.png').convert('RGB')).astype(int)
  d=np.abs(x-y)
  rows.append(dict(biome=biome,phase=phase,view=i,changed=int(np.any(d,axis=2).sum()),maximum=int(d.max()),meanAbsolute=float(d.mean()),callsDelta=frame['calls']-prior['frames'][i]['calls'],trianglesDelta=frame['triangles']-prior['frames'][i]['triangles'],glError=frame['glError']))
result=dict(note='Separate loads: visual native integration check against established QA candidate; not a performance benchmark or strict same-world equivalence proof.',rows=rows)
(new/'native-parity.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(result,indent=2))
