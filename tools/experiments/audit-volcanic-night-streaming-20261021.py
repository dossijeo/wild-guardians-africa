from pathlib import Path
import json
from PIL import Image
p=Path('docs/qa/global-visual-lab/volcanic-night-streaming-20261021');d=json.loads((p/'captures.json').read_text());rs=d['records'];assert len(rs)==4
out=[]
for phase in ['day','night']:
 a,b=[next(r for r in rs if r['variant']==v and r['phase']==phase) for v in ['base','combined']]
 assert not a['errors'] and not b['errors']
 for x,y in zip(a['frames'],b['frames']):
  for k in ['camera','target','time','chunkKeys','calls','triangles']:assert x[k]==y[k],(phase,x['i'],k)
  assert not x['glError'] and not y['glError']

 for r in [a,b]:
  fs=r['frames'];assert len(fs)==8
  assert fs[0]['chunkKeys']==fs[3]['chunkKeys']==fs[7]['chunkKeys']
  assert fs[7]['resources']['memory']['geometries']<=fs[3]['resources']['memory']['geometries']
  assert fs[7]['resources']['memory']['textures']<=fs[3]['resources']['memory']['textures']
  assert fs[-1]['shadow']['draws']>fs[0]['shadow']['draws']
  out.append({'phase':phase,'variant':r['variant'],'frames':[{'i':f['i'],'loadRenderAuditMs':f['loadMs'],'chunks':len(f['chunkKeys']),'memory':f['resources']['memory'],'shadow':f['shadow'],'horizon':f['horizon']} for f in fs]})
 for i in [0,1,2,3,7]:
  pair=Image.new('RGB',(2560,720))
  for j,v in enumerate(['base','combined']):
   im=Image.open(p/f'volcanes-media-{v}-{phase}/{i:04}.png').convert('RGB');assert any(hi>lo for lo,hi in im.getextrema());pair.paste(im,(1280*j,0))
  pair.save(p/f'{phase}-{i}-pair.webp',lossless=True)
(p/'summary.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
