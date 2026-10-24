import json,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
p=Path('docs/qa/global-visual-lab/far-transition-six-biome-20261022')
d=json.loads((p/'captures.json').read_text());rows=[];expected=['sabana','gran-rio','manglares','desierto','volcanes','gran-canon']
for biome in expected:
 for phase in ['day','night']:
  records={r['variant']:r for r in d['records'] if r['biome']==biome and r['phase']==phase}
  if not all(v in records for v in ['before','after','return']):continue
  sheet=Image.new('RGB',(1280,3*384));draw=ImageDraw.Draw(sheet)
  for i in range(3):
   images={v:Image.open(p/f'{biome}-media-{v}-{phase}/{i:04d}.png').convert('RGB') for v in ['before','after','return']}
   frames={v:records[v]['frames'][i] for v in records}
   a,b,c=[frames[v] for v in ['before','after','return']]
   assert a['camera']==b['camera']==c['camera'] and a['time']==b['time']==c['time']
   for r in records.values():assert not r['errors']
   for f in frames.values():assert not f['glError'] and f['farBackground']['enabled'] and f['farBackground']['mountainsVisible']
   diff=np.abs(np.asarray(images['before']).astype(int)-np.asarray(images['after']).astype(int));ret=np.asarray(images['before'])!=np.asarray(images['return'])
   rows.append(dict(biome=biome,phase=phase,view=i,changedPixels=int(np.any(diff,axis=2).sum()),mean=float(diff.mean()),returnPixels=int(np.any(ret,axis=2).sum()),callsDelta=b['calls']-a['calls'],trianglesDelta=b['triangles']-a['triangles'],expectedExtraCalls=b['extraCalls'],expectedExtraTriangles=b['extraTriangles'],returnCalls=c['calls']-a['calls'],returnTriangles=c['triangles']-a['triangles']))
   sheet.paste(images['before'].resize((640,360)),(0,i*384+24));sheet.paste(images['after'].resize((640,360)),(640,i*384+24));draw.text((8,i*384+6),f'{biome} {phase} view {i}: original / ordered smooth',fill='white')
  sheet.save(p/f'{biome}-{phase}-comparison.jpg',quality=92)
(p/'audit.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
for biome in expected:
 bs=[r for r in rows if r['biome']==biome]
 print(biome,len(bs),'exact returns',sum(r['returnPixels']==0 for r in bs),'workload anomalies',sum(r['callsDelta']!=r['expectedExtraCalls'] or r['trianglesDelta']!=r['expectedExtraTriangles'] for r in bs))
if '--partial' not in sys.argv:assert len(rows)==36,f'Incomplete: {len(rows)}/36 comparisons'
