from pathlib import Path
import json, math, statistics
p=Path('docs/qa/global-visual-lab/mangrove-height-blend/lighting-skip/performance')
d=json.loads((p/'benchmarks.json').read_text());rs=d['records'];assert len(rs)==8
results=[]
for phase in ['day','night']:
 blocks=[r for r in rs if r['phase']==phase]
 assert [r['variant'] for r in blocks]==['base','combined','base','combined']
 reference=blocks[0]
 for r in blocks:
  assert not r['errors']
  assert r['target']==reference['target'] and r['time']==reference['time']
  assert r['gpu']['device']==reference['gpu']['device']
  for kind,n in [('gpu',240),('cadence',240)]:
   v=r[kind];assert v['stateUnchanged'] and not v['glError'];assert len(v['frames'])==n
   for f,base in zip(v['frames'],reference[kind]['frames']):
    for key in ['camera','calls','triangles']:assert f[key]==base[key],(phase,kind,key)
  q=r['gpu']['gpu'];assert q['supported'] and len(q['samples'])==240
  for key in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending']:assert not q[key],key
 for variant in ['base','combined']:
  selected=[r for r in blocks if r['variant']==variant]
  result={'phase':phase,'variant':variant}
  for key,values in [('gpuMs',[[f['ms'] for f in r['gpu']['gpu']['samples']] for r in selected]),('cpuRenderMs',[[f['cpuMs'] for f in r['cadence']['frames']] for r in selected]),('intervalMs',[[f['intervalMs'] for f in r['cadence']['frames']] for r in selected])]:
   assert all(math.isfinite(x) for xs in values for x in xs)
   result[key]=[statistics.mean(xs) for xs in values]
   if key=='intervalMs':result['intervalP95Ms']=[sorted(xs)[math.ceil(.95*len(xs))-1] for xs in values]
  result['groupCpuMs']=[statistics.mean(f['groupCpuMs'] for f in r['cadence']['frames']) for r in selected]
  result['uploadsPerFrame']=[statistics.mean(f['uploads'] for f in r['cadence']['frames']) for r in selected]
  results.append(result)
summary={'blocks':8,'gpuSamples':1920,'cadenceFrames':1920,'device':rs[0]['gpu']['device'],'results':results,'note':'Two block means per variant/phase; not confidence intervals. CPU render excludes simulation; intervals are render entries, not presentation.'}
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(summary,indent=2))
