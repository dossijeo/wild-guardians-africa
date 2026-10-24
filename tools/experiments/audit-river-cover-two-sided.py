from pathlib import Path
import json, math, statistics
p=Path('docs/qa/global-visual-lab/river-cover-two-sided/performance')
d=json.loads((p/'benchmarks.json').read_text());rs=d['records'];assert len(rs)==8
results=[]
for phase in ['day','night']:
 blocks=[r for r in rs if r['phase']==phase]
 assert [r['variant'] for r in blocks]==['base','combined','combined','base']
 reference=blocks[0]
 for r in blocks:
  assert not r['errors']
  for kind,n in [('gpu',120),('cadence',180)]:
   v=r[kind];assert v['stateUnchanged'] and not v['glError'];assert len(v['frames'])==n
   for f,base in zip(v['frames'],reference[kind]['frames']):
    for key in ['camera','calls','triangles']:assert f[key]==base[key],(phase,kind,key)
   for key in ['near','far','triangles','bufferBytes']:assert v['coverage'][key]==reference[kind]['coverage'][key]
   assert v['coverage']['stats']['overflow']==0
  q=r['gpu']['gpu'];assert q['supported'] and len(q['samples'])==120
  for key in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending']:assert not q[key],key
 for variant in ['base','combined']:
  selected=[r for r in blocks if r['variant']==variant]
  result={'phase':phase,'variant':variant}
  for key,values in [('gpuMs',[[f['ms'] for f in r['gpu']['gpu']['samples']] for r in selected]),('cpuRenderMs',[[f['cpuMs'] for f in r['cadence']['frames']] for r in selected]),('intervalMs',[[f['intervalMs'] for f in r['cadence']['frames']] for r in selected])]:
   assert all(math.isfinite(x) for xs in values for x in xs)
   result[key]=[statistics.mean(xs) for xs in values]
   if key=='intervalMs':result['intervalP95Ms']=[sorted(xs)[math.ceil(.95*len(xs))-1] for xs in values]
  results.append(result)
summary={'blocks':8,'gpuSamples':960,'cadenceFrames':1440,'device':rs[0]['gpu']['device'],'results':results,'note':'Two block means per variant/phase; not confidence intervals. CPU render excludes simulation; intervals are render entries, not presentation.'}
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(summary,indent=2))
