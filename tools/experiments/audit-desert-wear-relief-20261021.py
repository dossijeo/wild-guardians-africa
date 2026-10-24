from pathlib import Path
import json, math, statistics
p=Path('docs/qa/global-visual-lab/desert-wear-relief-20261021/performance')
d=json.loads((p/'benchmarks.json').read_text());rs=d['records'];assert len(rs)==8
results=[]
for phase in ['day','night']:
 blocks=[r for r in rs if r['phase']==phase]
 assert [r['variant'] for r in blocks]==['base','combined','combined','base']
 reference=blocks[0]
 for r in blocks:
  reference=blocks[0]
  assert not r['errors']
  for kind,n in [('gpu',60),('cadence',90)]:
   v=r[kind];assert v['device']==rs[0]['gpu']['device'] and v['resolution']==[1280,720];assert v['stateUnchanged'] and not v['glError'];assert len(v['frames'])==n
   for index,(f,base) in enumerate(zip(v['frames'],reference[kind]['frames'])):
    assert f['camera']==blocks[0][kind]['frames'][index]['camera']
    for key in ['camera','calls','triangles']:assert f[key]==base[key],(phase,kind,key)
   assert v['coverage'] is None
  q=r['gpu']['gpu'];assert q['supported'] and len(q['samples'])==60
  for key in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending']:assert not q[key],key
 for variant in ['base','combined']:
  selected=[r for r in blocks if r['variant']==variant]
  result={'phase':phase,'variant':variant}
  for key,values in [('gpuMs',[[f['ms'] for f in r['gpu']['gpu']['samples']] for r in selected]),('cpuRenderMs',[[f['cpuMs'] for f in r['cadence']['frames']] for r in selected]),('intervalMs',[[f['intervalMs'] for f in r['cadence']['frames']] for r in selected])]:
   assert all(math.isfinite(x) for xs in values for x in xs)
   result[key]=[statistics.mean(xs) for xs in values]
   result[key+'P95']=[sorted(xs)[math.ceil(.95*len(xs))-1] for xs in values]
   if key=='intervalMs':result['intervalP95Ms']=[sorted(xs)[math.ceil(.95*len(xs))-1] for xs in values]
  results.append(result)
assert all(0<f['ms']<1000 for r in rs for f in r['gpu']['gpu']['samples']), 'Implausible GPU query; inspect raw data'
summary={'blocks':8,'gpuSamples':480,'cadenceFrames':720,'device':rs[0]['gpu']['device'],'results':results,'note':'Two block means per variant/phase; not confidence intervals. CPU render excludes simulation; intervals are render entries, not presentation.'}
summary['resourceCounts']=[{'variant':r['variant'],'phase':r['phase'],'gpu':r['gpu']['memory'],'cadence':r['cadence']['memory']} for r in rs]
summary['limitations']=['Texture counts differ across variants; not a VRAM saving measurement or proof of equal resource residency.','Stationary camera: excludes mask generation and streaming cost.']
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(summary,indent=2))
