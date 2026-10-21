from pathlib import Path
import json
from PIL import Image
p=Path('docs/qa/global-visual-lab/canyon-bank-streaming-v2')
d=json.loads((p/'captures.json').read_text());rs=d['records'];assert len(rs)==4
out=[]
for phase in ['day','night']:
 a=next(r for r in rs if r['variant']=='base' and r['phase']==phase)
 b=next(r for r in rs if r['variant']=='combined' and r['phase']==phase)
 assert not a['errors'] and not b['errors']
 for x,y in zip(a['frames'],b['frames']):
  for k in ['camera','target','time','chunkKeys','calls','triangles']:assert x[k]==y[k],(phase,x['i'],k)
  assert x['glError']==y['glError']==0
 for r in [a,b]:
  frames=r['frames'];assert len(frames)==4
  assert frames[0]['chunkKeys']==frames[-1]['chunkKeys']
  out.append(dict(phase=phase,variant=r['variant'],frames=[dict(view=f['i'],settleRenderAuditMs=f['loadMs'],chunks=len(f['chunkKeys']),masks=f['resources']['masks'],memory=f['resources']['memory'],builds=len(f['resources']['maskBuilds']),buildTotalMs=sum(v['ms'] for v in f['resources']['maskBuilds'])) for f in frames]))
 for i in [0,1,2,3]:
  c=Image.new('RGB',(2560,720))
  for j,v in enumerate(['base','combined']):
   im=Image.open(p/f'gran-canon-media-{v}-{phase}/{i:04}.png').convert('RGB');assert any(hi>lo for lo,hi in im.getextrema()), 'Blank capture';c.paste(im,(1280*j,0))
  c.save(p/f'{phase}-{i}-pair.webp')
(p/'summary.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
