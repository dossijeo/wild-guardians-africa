from pathlib import Path
from PIL import Image
import numpy as np
import json
import os
root=Path(os.environ.get('WG_REVIEW_OUT','docs/qa/global-visual-lab/far-transition-native-stream-20261022'))
data=json.loads((root/'captures.json').read_text())
rows=[]
for r in data['records']:
 f=r['frames'];d=root/f"{r['biome']}-{r['quality']}-{r['variant']}-{r['phase']}"
 a=np.asarray(Image.open(d/'0000.png').convert('RGB')).astype(int);b=np.asarray(Image.open(d/'0004.png').convert('RGB')).astype(int)
 delta=np.abs(a-b)
 rows.append(dict(biome=r['biome'],phase=r['phase'],returnChangedPixels=int(np.any(delta,axis=2).sum()),returnMaximum=int(delta.max()),returnMean=float(delta.mean()),memory=[x['memory'] for x in f],calls=[x['calls'] for x in f],triangles=[x['triangles'] for x in f],regions=[[a['stats']['regions'] for a in x['farBackground']['adapters']] for x in f],errors=r['errors']))
result=dict(note='Settled checkpoints, not continuous-motion timing. Cache residency may differ after excursion; return image and memory deltas are observations, not automatic leak or parity claims.',rows=rows)
(root/'stream-audit.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(result,indent=2))
