import json
from pathlib import Path
from PIL import Image
p=Path('docs/qa/global-visual-lab/fern-screen-prelit-review-20261023');d=json.loads((p/'captures.json').read_text());rows=[]
for phase in ['day','night']:
 a,b=[r for r in d['records'] if r['phase']==phase];assert not a['errors'] and not b['errors']
 for i,(x,y) in enumerate(zip(a['frames'],b['frames'])):
  assert all(x[k]==y[k] for k in ['camera','target','time','origin'])
  assert x['coverage']['near']+x['coverage']['far']==y['coverage']['near']+y['coverage']['far']
  assert not x['glError'] and not y['glError']
  rows.append(dict(phase=phase,view=i,nativeTriangles=x['triangles'],candidateTriangles=y['triangles'],near=x['coverage']['near'],far=x['coverage']['far'],candidateNear=y['coverage']['near'],candidateFar=y['coverage']['far'],nativeCalls=x['calls'],candidateCalls=y['calls']))
  ims=[Image.open(p/t/f'manglares-media-native-{phase}/{i:04}.png') for t in ['native','composite']];im=Image.new('RGB',(2560,720));im.paste(ims[0],(0,0));im.paste(ims[1],(1280,0));im.save(p/f'{phase}-{i}-pair.jpg',quality=92)
(p/'comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(rows,indent=2))
