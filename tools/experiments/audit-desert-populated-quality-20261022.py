import json,statistics
from pathlib import Path
p=Path('docs/qa/global-visual-lab/desert-populated-quality-cost-20261022')
d=json.loads((p/'benchmarks.json').read_text());assert len(d['records'])==8
rows=[]
def stats(v):
 v=sorted(v);return dict(mean=statistics.mean(v),p95=v[int((len(v)-1)*.95)])
for r in d['records']:
 assert not r['errors']
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
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
for r in rows:print(r['quality'],r['phase'],round(r['gpu']['mean'],3),round(r['cpu']['mean'],3))
