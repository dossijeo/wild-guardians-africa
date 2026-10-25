import json,statistics
from pathlib import Path
p=Path('docs/qa/global-visual-lab/holly-fern-approved-active-cost-20261023')
d=json.loads((p/'benchmarks.json').read_text());assert len(d['records'])==4
stats=lambda xs:dict(mean=statistics.mean(xs),p95=sorted(xs)[int((len(xs)-1)*.95)])
rows=[]
for r in d['records']:
 assert not r['errors'] and r['sceneAudit']['instanceCulling'] and r['sceneAudit']['farEnabled']
 assert r['sceneAudit']['shadowResolution']==2048 and all(r['sceneAudit']['fernShadowEnabled'])
 assert r['stateAfter']['elapsed']>r['stateBefore']['elapsed'] and not r['stateAfter']['pauses']
 assert r['stateBefore']['workers']!=r['stateAfter']['workers']
 for mode in ['gpu','cadence']:
  m=r[mode];assert not m['stateUnchanged'] and not m['glError'] and len(m['frames'])==90
  assert not m['coverage']['stats']['overflow']
 g=r['gpu']['gpu'];assert g['supported'] and len(g['samples'])==90
 for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending']:assert not g[k],k
 rows.append(dict(phase=r['phase'],advance=r['stateAfter']['elapsed']-r['stateBefore']['elapsed'],gpu=stats([x['ms'] for x in g['samples']]),cpuRender=stats([x['cpuMs'] for x in r['cadence']['frames']]),interval=stats([x['intervalMs'] for x in r['cadence']['frames']]),calls=stats([x['calls'] for x in r['cadence']['frames']]),triangles=stats([x['triangles'] for x in r['cadence']['frames']]),device=r['gpu']['device'],resolution=r['gpu']['resolution']))
for phase in ['day','night']:
 a,b=[r for r in d['records'] if r['phase']==phase]
 for mode in ['gpu','cadence']:assert [x['camera'] for x in a[mode]['frames']]==[x['camera'] for x in b[mode]['frames']]
# Each fresh page begins from the same saved world. Night intentionally continues its day.
a,b=[r for r in d['records'] if r['phase']=='day'];assert a['stateBefore']==b['stateBefore']
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(rows,indent=2))
