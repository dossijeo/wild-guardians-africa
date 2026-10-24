import json,statistics,os
from pathlib import Path
p=Path(os.environ.get('WG_REVIEW_OUT','docs/qa/global-visual-lab/canyon-day-reflection-cost-20261023'))
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
 rows.append(dict(quality=r['quality'],variant=r['variant'],phase=r['phase'],gpu=stats([s['ms'] for s in g['samples']]),cpu=stats([f['cpuMs'] for f in r['cadence']['frames']]),interval=stats([f['intervalMs'] for f in r['cadence']['frames']]),device=r['gpu']['device']))
for phase in ['day','night']:
 rs=[r for r in d['records'] if r['phase']==phase]
 for a,b in zip(rs,rs[1:]):
  for key in ['residentMasks','elapsed','workers','chunks','origin','target','objects','memory','workload']:
   assert a['sceneAudit'][key]==b['sceneAudit'][key],(phase,key)
  for mode in ['gpu','cadence']:
   assert all((x['camera'],x['calls'],x['triangles'])==(y['camera'],y['calls'],y['triangles']) for x,y in zip(a[mode]['frames'],b[mode]['frames'])),(phase,mode)
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
for r in rows:print(r['variant'],r['phase'],round(r['gpu']['mean'],3),round(r['cpu']['mean'],3))
