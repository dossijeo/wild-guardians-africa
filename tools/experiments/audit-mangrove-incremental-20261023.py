import json, statistics, sys, math
from pathlib import Path
root=Path(sys.argv[1]);records=json.loads((root/'benchmarks.json').read_text())['records'];summary=[];issues=[];audit={}
for ri,r in enumerate(records):
 assert not r['errors'];modes={m['mode']:m for m in r['measurements']};a=modes['frame'];b=modes['cadence'];n=len(a['frames']);g=a['gpu']
 assert g['supported'] and len(g['samples'])==n
 assert not any(g[k] for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','pending','contextLost'])
 for m in [a,b]:assert m['before']==m['after'] and not m['glError']
 mean=lambda values:round(statistics.mean(values),4)
 summary.append(dict(record=ri,variant=r['variant'],phase=r['phase'],samples=n,gpuMs=mean(x['ms'] for x in g['samples']),frameMs=mean(x['intervalMs'] for x in b['frames']),p95Ms=sorted(x['intervalMs'] for x in b['frames'])[math.ceil(len(b['frames'])*.95)-1],cpuMs=mean(x['cpuMs'] for x in b['frames']),cache=r['sceneAudit']['ablation'].get('queue')))
for phase in sorted(set(r['phase'] for r in records)):
 runs=[r for r in records if r['phase']==phase];assert [r['variant'] for r in runs]==['base','incremental','base','incremental']
 for field in ['elapsed','workers','time']:assert all(r['stateBefore'][field]==runs[0]['stateBefore'][field] for r in runs)
 for mode in ['frame','cadence']:
  frames=[next(m['frames'] for m in r['measurements'] if m['mode']==mode) for r in runs];base=frames[0]
  assert all([f['camera'] for f in v]==[f['camera'] for f in base] for v in frames)
  assert all([f['coverage'] for f in v]==[f['coverage'] for f in base] for v in frames)
  extra=[]
  for i,rows in enumerate(frames[1:],1):
   deltas=[(b['calls']-a['calls'],b['triangles']-a['triangles']) for a,b in zip(base,rows)]
   allowed=[(0,0)] if i==2 else [(0,0),(1,2)]
   for frame,d in enumerate(deltas):
    if d not in allowed:issues.append(dict(phase=phase,mode=mode,run=i,frame=frame,delta=d))
   extra.append(deltas.count((1,2)))
  audit[phase+'/'+mode]=dict(matchingCameraAndFernCoverage=True,extraQuadFramesByRun=extra)
result=dict(passed=not issues,phasePassed={phase:not any(i["phase"]==phase for i in issues) for phase in sorted(set(r["phase"] for r in records))},issues=issues,windows=audit,limitation='Count audit permits one additional two-triangle bake quad; not an individual asset census.')
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n');(root/'workload-audit.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(summary,indent=2));print(json.dumps(result,indent=2))
if issues:raise SystemExit('Unexpected workload differences: do not claim equivalence')
