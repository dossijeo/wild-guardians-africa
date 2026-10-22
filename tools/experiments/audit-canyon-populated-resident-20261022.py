import json,statistics
from pathlib import Path
p=Path('docs/qa/global-visual-lab/canyon-populated-resident-cost-20261022')
d=json.loads((p/'benchmarks.json').read_text());assert len(d['records'])==8
rows=[]
def stats(v):
 v=sorted(v);return dict(mean=statistics.mean(v),p95=v[int((len(v)-1)*.95)])
for r in d['records']:
 assert not r['errors']
 assert len(r['sceneAudit']['residentMasks'])==len(r['sceneAudit']['chunks'])==25
 for mode in ['gpu','cadence']:
  m=r[mode];assert m['stateUnchanged'] and not m['glError'] and len(m['frames'])==90
 g=r['gpu']['gpu'];assert g['supported'] and len(g['samples'])==90
 for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending']:assert not g[k],k
 rows.append(dict(quality=r['quality'],phase=r['phase'],gpu=stats([s['ms'] for s in g['samples']]),cpu=stats([f['cpuMs'] for f in r['cadence']['frames']]),interval=stats([f['intervalMs'] for f in r['cadence']['frames']]),device=r['gpu']['device']))
# Different quality profiles intentionally have different geometry/shadows.
for phase in ['day','night']:
 rs=[r for r in d['records'] if r['phase']==phase]
 for a,b in zip(rs,rs[1:]):
  assert all(x['camera']==y['camera'] for x,y in zip(a['gpu']['frames'],b['gpu']['frames']))
# Equal quality repeats must render the same saved state and workload.
for quality in ['media','baja']:
 for phase in ['day','night']:
  a,b=[r for r in d['records'] if r['quality']==quality and r['phase']==phase]
  for key in ['residentMasks','elapsed','workers','chunks','origin','target','objects','memory','workload']:
   assert a['sceneAudit'][key]==b['sceneAudit'][key],(quality,phase,key)
  assert abs(a['sceneAudit']['elapsed']-120)<1e-8
  for mode in ['gpu','cadence']:
   expected=(a[mode]['frames'][0]['calls'],a[mode]['frames'][0]['triangles'])
   assert all((f['calls'],f['triangles'])==expected for r in [a,b] for f in r[mode]['frames']),(quality,phase,mode,'workload')
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
for r in rows:print(r['quality'],r['phase'],round(r['gpu']['mean'],3),round(r['cpu']['mean'],3))
