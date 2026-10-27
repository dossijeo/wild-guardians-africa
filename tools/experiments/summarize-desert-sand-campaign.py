from pathlib import Path
import json, statistics
from PIL import Image
root=Path('docs/qa/global-visual-lab/desert-aerial-sand/dry-specular/campaign-final')
d=json.loads((root/'results.json').read_text())
assert len(d['records'])==32,'Incomplete series'
summary=[]
for quality in ['media','baja']:
 for phase in ['day','night']:
  records=[r for r in d['records'] if r['quality']==quality and r['phase']==phase]
  assert [r['variant'] for r in records]==[0,1,1,0,1,0,0,1]
  reference=records[0]['rows']
  for r in records:
   assert r['materialMembershipUnchanged']
   assert r['simulationUnchanged'] and not r['stateChanges'] and not r['errors']
   assert r['residentBefore']==r['residentAfter']
   assert len(r['rows'])==240
   for a,b in zip(reference,r['rows']):
    for k in ['frame','camera','target','calls','triangles']:assert a[k]==b[k],(quality,phase,r['run'],k)
    assert b['renderCalls']==1 and not b['hidden']
  variants=[]
  for v in [0,1]:
   blocks=[]
   for r in records:
    if r['variant']!=v:continue
    means={k:statistics.mean(x[k] for x in r['rows']) for k in ['intervalMs','appFrameCpuMs','renderCpuMs']}
    means['p95IntervalMs']=sorted(x['intervalMs'] for x in r['rows'])[227]
    blocks.append(means)
   variants.append({'variant':v,'blocks':blocks,'mean':{k:statistics.mean(b[k] for b in blocks) for k in blocks[0]}})
  summary.append({'quality':quality,'phase':phase,'variants':variants,'deltaIntervalMs':variants[1]['mean']['intervalMs']-variants[0]['mean']['intervalMs']})
  for name in ['base','candidate']:
   src=root/f'{quality}-{phase}-{name}.png'
   image=Image.open(src).convert('RGB');dst=src.with_suffix('.webp');image.save(dst,lossless=True)
   assert Image.open(dst).convert('RGB').tobytes()==image.tobytes()
(root/'summary.json').write_text(json.dumps({'samples':7680,'frameParity':'camera, target, draws, triangles for every index in each quality/phase','groups':summary},indent=2)+'\n',encoding='utf-8',newline='\n')
for g in summary:
 a,b=[v['mean'] for v in g['variants']]
 print(g['quality'],g['phase'],'RAF',round(a['intervalMs'],3),round(b['intervalMs'],3),'delta',round(g['deltaIntervalMs'],3),'CPU',round(a['appFrameCpuMs'],3),round(b['appFrameCpuMs'],3))
