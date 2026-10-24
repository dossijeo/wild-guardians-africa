import json
import statistics as st
from pathlib import Path

p=Path('docs/qa/global-visual-lab/river-soil-layer-motion/performance')
d=json.loads((p/'benchmarks.json').read_text(encoding='utf-8'))
rows=d['records']; assert len(rows)==8
results=[]
for phase in ['day','night']:
 rr=[r for r in rows if r['phase']==phase]
 assert [r['variant'] for r in rr]==['base','combined','combined','base']
 assert all(r['biome']=='gran-rio' and r['quality']=='baja' and not r['errors'] for r in rr)
 assert all(r['target']==rr[0]['target'] and r['time']==rr[0]['time'] for r in rr)
 for r in rr:
  for mode,count in [('gpu',120),('cadence',180)]:
   v=r[mode]; assert v['stateUnchanged'] and v['glError']==0 and len(v['frames'])==count
   assert v['resolution']==[1280,720]
   assert [f['camera'] for f in v['frames']]==[f['camera'] for f in rr[0][mode]['frames']]
   assert len({tuple(f['camera']) for f in v['frames']})>60
   assert not v['coverage']['stats']['overflow']
  g=r['gpu']['gpu']; assert g['supported'] and len(g['samples'])==120
  assert not any(g[k] for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending'])
  assert r['cadence']['gpu'] is None
 for mode in ['gpu','cadence']:
  for a,b in [(rr[0],rr[1]),(rr[3],rr[2])]:
   assert a[mode]['coverage']['active'] and b[mode]['coverage']['active']
   assert all(a[mode]['coverage'][k]==b[mode]['coverage'][k] for k in ['near','far','triangles','bufferBytes'])
   assert b[mode]['coverage']['near']==0
   for fa,fb in zip(a[mode]['frames'],b[mode]['frames']):
    assert fb['calls']==fa['calls']
    assert fb['triangles']==fa['triangles']
  for i,j in [(0,3),(1,2)]:
   for key in ['calls','triangles']:
    assert [f[key] for f in rr[i][mode]['frames']]==[f[key] for f in rr[j][mode]['frames']]
 values=[]
 for variant in ['base','combined']:
  rs=[r for r in rr if r['variant']==variant]
  values.append(dict(variant=variant,groupCpuMs=[st.mean(f['groupCpuMs'] for f in r['cadence']['frames']) for r in rs],uploadsPerFrame=[st.mean(f['uploads'] for f in r['cadence']['frames']) for r in rs],gpuMs=[st.mean(x['ms'] for x in r['gpu']['gpu']['samples']) for r in rs],cpuMs=[st.mean(f['cpuMs'] for f in r['cadence']['frames']) for r in rs],intervalMs=[st.mean(f['intervalMs'] for f in r['cadence']['frames']) for r in rs],intervalP95Ms=[sorted(f['intervalMs'] for f in r['cadence']['frames'])[170] for r in rs],calls=rs[0]['cadence']['frames'][0]['calls'],triangles=rs[0]['cadence']['frames'][0]['triangles'],coverage=rs[0]['cadence']['coverage']))
 results.append(dict(phase=phase,values=values))
(p/'summary.json').write_text(json.dumps(dict(blocks=8,gpuSamples=960,cadenceFrames=1440,results=results),indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(results))
