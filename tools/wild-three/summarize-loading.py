"""Summarize completed runs; never turn a timed-out load into a performance win."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'docs/qa/wild-three-resource-control'
rows=[]
for run in ['a1','b1','a2','b2']:
 path=root/('loading-'+run+'.json')
 failure=root/('loading-'+run+'.failure.json')
 if not path.exists():
  rows.append(dict(run=run,status='failed' if failure.exists() else 'pending',failure=json.loads(failure.read_text()) if failure.exists() else None));continue
 data=json.loads(path.read_text());r=data['result'];frames=r['loading']['frames']
 intervals=sorted(b['timestamp']-a['timestamp'] for a,b in zip(frames,frames[1:]))
 q=lambda p:intervals[int((len(intervals)-1)*p)] if intervals else None
 pilot=r.get('texturePilot')
 rows.append(dict(run=run,status='failed' if failure.exists() else 'completed',readyMs=r['loading']['readyMs'],presentationIntervalsMs=dict(p50=q(.5),p95=q(.95),p99=q(.99),maximum=q(1)),schedulerCoordinationMs=r['scheduler']['coordinationMs'],texturePilot=None if not pilot else {k:v for k,v in pilot.items() if k!='records'},chunks=r['chunks']))
output={'scope':'Initial loading only, frozen populated Manglares. RAF intervals are presentation cadence, not GPU or main-thread blocking time. Failed loads cannot satisfy throughput acceptance. Same host, serial fresh Chrome, media 720p, stock-source versus patched-source plus region integration.','runs':rows}
(root/'loading-summary.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
print(json.dumps(output,indent=2))
