import json,statistics,math,sys
from pathlib import Path
from collections import defaultdict
p=Path(sys.argv[1]);j=json.loads((p/'benchmarks.json').read_text());assert len(j['records'])==8
out=[]
for r in j['records']:
 assert not r['errors']
 assert r['sceneAudit']['farEnabled'] and r['sceneAudit']['cardStudy']['prelit']['nearNative']
 row={'variant':r['variant'],'phase':r['phase'],'modes':{}}
 for m in r['measurements']:
  assert len(m['frames'])==60 and m['glError']==0
  assert m['after']==m['before'] and 'menu' in m['before']['pauses']
  f=m['frames'];mean=lambda values:round(statistics.mean(values),3)
  d={'cpuRenderMs':mean(x['cpuMs'] for x in f),'intervalMs':mean(x['intervalMs'] for x in f),'p95IntervalMs':round(sorted(x['intervalMs'] for x in f)[56],3),'calls':mean(x['calls'] for x in f),'triangles':mean(x['triangles'] for x in f),'elapsedAdvance':m['after']['elapsed']-m['before']['elapsed'],'memory':m['memory']}
  g=m['gpu'] if m['mode']=='frame' else m['passes']['gpu'] if m['mode']=='passes' else None
  if g:
   assert g['supported'] and not any(g[k] for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','pending','contextLost'])
   d['gpuQueries']=len(g['samples'])
  if m['mode']=='frame':
   assert len(g['samples'])==60;d['gpuMs']=mean(x['ms'] for x in g['samples'])
  if m['mode']=='passes':
   groups=defaultdict(lambda:[0.,0,0,0])
   for x in m['passes']['rows']:
    assert x['gpuMs'] is not None and x['timed'];v=groups[x['pass']+'/'+x['segment']];v[0]+=x['gpuMs'];v[1]+=x['calls'];v[2]+=x['triangles'];v[3]+=1
   depth=[x for x in m['passes']['rows'] if x['pass']=='world-depth' and x['segment']=='draw'];d['depthCaptures']=len(depth);d['depthGpuPerCaptureMs']=mean(x['gpuMs'] for x in depth) if depth else None
   d['passPerFrame']={k:dict(gpuMs=round(v[0]/60,3),calls=v[1]/60,triangles=v[2]/60,segments=v[3]) for k,v in groups.items()}
  if m['mode']=='cpu':
   totals=defaultdict(float)
   for x in f:
    for k,v in x['cpuCalls'].items():totals[k]+=v['totalMs']
   d['inclusiveCpuMs']={k:round(v/60,3) for k,v in sorted(totals.items(),key=lambda kv:-kv[1])}
  row['modes'][m['mode']]=d
 out.append(row)
(p/'summary.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n')
drift=[]
for phase in ['day','night']:
 records=[r for r in j['records'] if r['phase']==phase]
 assert [r['variant'] for r in records]==['720','540','720','540']
 for field in ['elapsed','workers','time']:
  assert all(r['stateBefore'][field]==records[0]['stateBefore'][field] for r in records),field
 for mode in ['frame','passes','cadence']:
  frames=[[f['camera'] for f in next(m for m in r['measurements'] if m['mode']==mode)['frames']] for r in records]
  assert all(f==frames[0] for f in frames),'camera'
  for field in ['calls','triangles','coverage']:
   values=[[f[field] for f in next(m for m in r['measurements'] if m['mode']==mode)['frames']] for r in records]
   if field=='coverage':assert all(v==values[0] for v in values),field
   else:
    for index,v in enumerate(values):
     differences=[{'frame':i,'delta':a-b} for i,(a,b) in enumerate(zip(v,values[0])) if a!=b]
     if differences:drift.append({'phase':phase,'mode':mode,'field':field,'record':index,'differences':differences})
for r in out:print(r['variant'],r['phase'],r['modes']['frame']['gpuMs'],r['modes']['cadence']['intervalMs'],r['modes']['cadence']['p95IntervalMs'],r['modes']['frame']['triangles'])

# Ground category must retain identical draw workload at each measured frame.
for phase in ['day','night']:
 records=[r for r in j['records'] if r['phase']==phase];sequences=[]
 for r in records:
  totals=[[0,0] for _ in range(60)]
  for x in next(m for m in r['measurements'] if m['mode']=='passes')['passes']['rows']:
   if x['pass']=='screen' and x['segment']=='color:ground':totals[x['frame']][0]+=x['calls'];totals[x['frame']][1]+=x['triangles']
  sequences.append(totals)
 assert all(x==sequences[0] for x in sequences),'ground draw workload'
(p/'non-ground-drift.json').write_text(json.dumps(drift,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Non-ground drift',drift)
