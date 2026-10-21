from pathlib import Path
import json,numpy as np
from PIL import Image
p=Path('docs/qa/global-visual-lab/mangrove-height-blend/lighting-skip');results=[]
d=json.loads((p/'repeat/captures.json').read_text(encoding='utf-8'));assert len(d['records'])==4
for phase in ['day','night']:
 a,b=[next(r for r in d['records'] if r['variant']==v and r['phase']==phase) for v in ['base','combined']]
 assert not a['errors'] and not b['errors']
 for i in range(3):
  for key in ['camera','target','time','calls','triangles']:assert a['frames'][i][key]==b['frames'][i][key]
  arrays={(run,v):np.array(Image.open(p/run/f'manglares-baja-{v}-{phase}/{i:04}.png').convert('RGB')).astype(int) for run in ['', 'repeat'] for v in ['base','combined']}
  row={'phase':phase,'view':i}
  for key,aa,bb in [('repeatAB',('repeat','base'),('repeat','combined')),('baseAcrossRuns',('','base'),('repeat','base')),('candidateAcrossRuns',('','combined'),('repeat','combined'))]:
   delta=abs(arrays[aa]-arrays[bb]);row[key]={'changedPixels':int(np.any(delta,axis=2).sum()),'maxDelta':int(delta.max())}
  results.append(row)
(p/'repeat/parity.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(results))
