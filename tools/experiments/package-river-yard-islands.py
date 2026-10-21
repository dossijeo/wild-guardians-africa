from pathlib import Path
import json
from PIL import Image
p=Path('docs/qa/global-visual-lab/river-yard-islands/native-site')
d=json.loads((p/'captures.json').read_text());rows=d['records'];assert len(rows)==4
results=[]
for phase in ['day','night']:
 a,b=[next(r for r in rows if r['variant']==v and r['phase']==phase) for v in ['base','combined']]
 assert not a['errors'] and not b['errors'] and b['maskAudit']['siteCount']==1
 for i,view in enumerate(d['views']):
  x,y=a['frames'][i],b['frames'][i]
  for key in ['camera','target','time']:assert x[key]==y[key]
  assert x['coverage']['stats']['overflow']==y['coverage']['stats']['overflow']==0
  pair=Image.new('RGB',(2560,720))
  for col,v in enumerate(['base','combined']):pair.paste(Image.open(p/f'gran-rio-baja-{v}-{phase}/{i:04}.png').convert('RGB'),(col*1280,0))
  pair.save(p/f'{phase}-{view}-pair.webp',lossless=True)
  results.append(dict(phase=phase,view=view,calls=[x['calls'],y['calls']],triangles=[x['triangles'],y['triangles']],farCoverage=[x['coverage']['far'],y['coverage']['far']]))
(p/'comparison.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
