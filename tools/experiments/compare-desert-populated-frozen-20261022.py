import json
from pathlib import Path
from PIL import Image,ImageDraw
p=Path('docs/qa/global-visual-lab/desert-populated-frozen-20261022')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));assert len(d['records'])==8
rows=[]
for phase in ['day','night']:
 a,b=[next(r for r in d['records'] if r['quality']==q and r['phase']==phase and r['variant']=='native') for q in ['media','baja']]
 assert not a['errors'] and not b['errors']
 for x,y in zip(a['frames'],b['frames']):
  for k in ['camera','target','time','origin','elapsed','workers']:assert x[k]==y[k],(phase,x['i'],k)
  assert abs(x['elapsed']-120)<1e-8 and not x['glError'] and not y['glError']
  i=x['i'];out=Image.new('RGB',(2560,752));draw=ImageDraw.Draw(out);draw.text((16,8),'Media (left) | Baja (right): same saved state',fill='white')
  for j,q in enumerate(['media','baja']):out.paste(Image.open(p/f'desierto-{q}-native-{phase}/{i:04}.png').convert('RGB'),(1280*j,32))
  out.save(p/f'pair-{phase}-{i}.jpg',quality=92)
  rows.append(dict(phase=phase,view=i,mediumCalls=x['calls'],lowCalls=y['calls'],mediumTriangles=x['triangles'],lowTriangles=y['triangles']))
p.joinpath('comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Six pose/state matched quality pairs')
