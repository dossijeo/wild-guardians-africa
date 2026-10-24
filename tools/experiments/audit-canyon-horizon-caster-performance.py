from pathlib import Path
import json,math,statistics
p=Path('docs/qa/global-visual-lab/canyon-horizon-caster/performance')
d=json.loads((p/'benchmarks.json').read_text());rs=d['records'];assert len(rs)==16
rows=[]
for phase in ['day','night']:
 for mode in ['cached','forced']:
  blocks=[r for r in rs if r['phase']==phase and r['mode']==mode]
  assert [r['variant'] for r in blocks]==['base','combined','combined','base']
  for r in blocks:
   assert not r['errors']
   delta={k:r['shadowAfter'][k]-r['shadowBefore'][k] for k in r['shadowBefore']}
   assert not delta['untracked']
   if mode=='forced':assert delta['draws']>=270
   else:assert delta['hits']>delta['draws']
   for kind,n in [('gpu',60),('cadence',90)]:
    v=r[kind];assert v['stateUnchanged'] and not v['glError'] and len(v['frames'])==n
    assert v['resolution']==[1280,720] and v['device']==rs[0]['gpu']['device']
    for f,b in zip(v['frames'],blocks[0][kind]['frames']):assert f['camera']==b['camera']
   q=r['gpu']['gpu'];assert q['supported'] and len(q['samples'])==60
   for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending']:assert not q[k],k
   values={'gpuMs':[f['ms'] for f in q['samples']],'cpuMs':[f['cpuMs'] for f in r['cadence']['frames']],'intervalMs':[f['intervalMs'] for f in r['cadence']['frames']]}
   row={'phase':phase,'mode':mode,'variant':r['variant'],'shadowDelta':delta,'draws':sorted(set((f['calls'],f['triangles']) for f in r['cadence']['frames']))}
   for k,x in values.items():
    assert all(math.isfinite(a) and a>=0 for a in x)
    row[k]=statistics.mean(x);row[k+'P95']=sorted(x)[math.ceil(len(x)*.95)-1]
   rows.append(row)
(p/'summary.json').write_text(json.dumps({'device':rs[0]['gpu']['device'],'rows':rows,'limitations':['Stationary paused world; forced refresh is worst case, not normal gameplay.','Two ABBA blocks per variant/mode/phase, not confidence intervals.','CPU is render invocation only; interval is callback cadence, not presentation.']},indent=2)+'\n')
print(json.dumps(rows,indent=2))
