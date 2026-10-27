import json,statistics
from pathlib import Path
p=Path('docs/qa/global-visual-lab/far-native-low-moving-cost-20261022')
d=json.loads((p/'benchmarks.json').read_text());out=[];controls=[]
def stats(xs):
 xs=sorted(xs);return dict(mean=statistics.mean(xs),p95=xs[int((len(xs)-1)*.95)],max=max(xs))
for b in d['records']:
 assert not b['errors']
 for mode in ['gpu','cadence']:
  m=b[mode];assert m['stateUnchanged'] and not m['glError'] and len(m['frames'])==90
 g=b['gpu']['gpu'];assert g['supported'] and len(g['samples'])==90
 for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending']:assert not g[k],k
 out.append(dict(variant=b['variant'],phase=b['phase'],run=b['run'],gpu=stats([s['ms'] for s in g['samples']]),cpu=stats([f['cpuMs'] for f in b['cadence']['frames']]),interval=stats([f['intervalMs'] for f in b['cadence']['frames']]),memory=b['gpu']['memory'],device=b['gpu']['device']))
for phase in ['day','night']:
 for mode in ['gpu','cadence']:
  rs=[r for r in d['records'] if r['phase']==phase]
  for i in [0,2]:
   a,b=rs[i],rs[i+1];assert all(x['camera']==y['camera'] for x,y in zip(a[mode]['frames'],b[mode]['frames']))
   deltas=[dict(frame=j,calls=y['calls']-x['calls'],triangles=y['triangles']-x['triangles']) for j,(x,y) in enumerate(zip(a[mode]['frames'],b[mode]['frames']))]
   expected=b['gpuWorkload' if mode=='gpu' else 'cpuWorkload'];controls.append(dict(phase=phase,mode=mode,pair=i//2+1,unexpected=[x for x,e in zip(deltas,expected) if x['calls']!=e['extraCalls'] or x['triangles']!=e['extraTriangles']]))
(p/'summary.json').write_text(json.dumps(dict(results=out,controls=controls),indent=2)+'\n',encoding='utf8',newline='\n')
for r in out:print(r['phase'],r['run'],r['variant'],'GPU',round(r['gpu']['mean'],3),'CPU',round(r['cpu']['mean'],3))
print('Unexpected workload frames:',sum(len(c['unexpected']) for c in controls))
