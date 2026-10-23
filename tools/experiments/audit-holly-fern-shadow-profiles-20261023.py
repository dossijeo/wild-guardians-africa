import json,statistics,sys
from pathlib import Path
p=Path(sys.argv[1]);d=json.loads((p/'benchmarks.json').read_text(encoding='utf-8'));rows=[]
assert len(d['records'])==8
stats=lambda a:dict(mean=statistics.mean(a),p95=sorted(a)[int((len(a)-1)*.95)])
for r in d['records']:
 assert not r['errors'] and r['sceneAudit']['instanceCulling'] is True
 for mode in ['gpu','cadence']:
  m=r[mode];assert m['stateUnchanged'] and not m['glError'] and len(m['frames'])==90
  if m.get('coverage'):assert not m['coverage']['stats']['overflow']
 g=r['gpu']['gpu'];assert g['supported'] and len(g['samples'])==90
 for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending']:assert not g[k],k
 rows.append(dict(variant=r['variant'],quality=r['quality'],phase=r['phase'],gpu=stats([x['ms'] for x in g['samples']]),cpu=stats([x['cpuMs'] for x in r['cadence']['frames']]),interval=stats([x['intervalMs'] for x in r['cadence']['frames']]),triangles=stats([x['triangles'] for x in r['cadence']['frames']]),calls=stats([x['calls'] for x in r['cadence']['frames']]),device=r['gpu']['device'],resolution=r['gpu']['resolution'],farEnabled=r['sceneAudit']['farEnabled']))
variations=[]
for quality in sorted({r['quality'] for r in d['records']}):
 for phase in ['day','night']:
  group=[r for r in d['records'] if r['quality']==quality and r['phase']==phase];a=group[0]
  for b in group[1:]:
   for k in ['elapsed','workers','target']:assert a['sceneAudit'][k]==b['sceneAudit'][k],k
   assert a['gpu']['device']==b['gpu']['device'] and a['gpu']['resolution']==b['gpu']['resolution']
   for mode in ['gpu','cadence']:assert [f['camera'] for f in a[mode]['frames']]==[f['camera'] for f in b[mode]['frames']]
   assert a['capture']['camera']==b['capture']['camera']
  for variant in set(r['variant'] for r in group):
   a,b=[r for r in group if r['variant']==variant]
   deltas={}
   for mode in ['gpu','cadence']:
    pairs=list(zip(a[mode]['frames'],b[mode]['frames']));dv=[abs(x['triangles']-y['triangles']) for x,y in pairs]
    deltas[mode]=dict(changedFrames=sum(x>0 for x in dv),maxTriangleDelta=max(dv),meanAbsoluteTriangleDelta=statistics.mean(dv),relativeTotalDelta=sum(dv)/max(1,sum(x['triangles'] for x,y in pairs)))
   variations.append(dict(deltas=deltas,quality=quality,phase=phase,variant=variant,initialMemoryEqual=a['sceneAudit']['memory']==b['sceneAudit']['memory'],sameDrawSequence=all([(f['calls'],f['triangles']) for f in a[m]['frames']]==[(f['calls'],f['triangles']) for f in b[m]['frames']] for m in ['gpu','cadence'])))
(p/'summary.json').write_text(json.dumps(dict(rows=rows,repeatChecks=variations,note='Moving-camera resident/streaming run: repeat workload differences must be reviewed before performance conclusions. Main/lab graphics differ intentionally.'),indent=2)+'\n',encoding='utf-8',newline='\n')
for r in rows:print(r['variant'],r['quality'],r['phase'],round(r['gpu']['mean'],3),round(r['cpu']['mean'],3))
print('Repeat checks',variations)
