"""QA cadence comparison; phase waits overlap and are not frame or GPU times."""
import json, statistics
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/current-review-20261025'
result=[]
for name in ['gran-rio-phase-trace','gran-rio-phase-separated']:
    report=json.loads((root/(name+'.json')).read_text())
    trace=json.loads((root/(name+'.terrain-trace.json')).read_text())
    chunks={}; batches={}
    for row in trace:
        key=(row['cx'],row['cz']); chunks.setdefault(key,[]).append(row)
        if row['phase'].startswith('prop-slots'):
            if row['phase']=='prop-slots':
                batch=sum(x['phase']=='prop-slots' for x in chunks[key])-1
            else: batch=int(row['phase'].rsplit('-',1)[1])//4
            batches.setdefault(batch,[]).append(row)
    phases=[]
    for batch,rows in sorted(batches.items()):
        phases.append(dict(batch=batch,count=len(rows),medianMs=statistics.median(x['ms'] for x in rows),maxMs=max(x['ms'] for x in rows),totalWaitMs=sum(x['waitMs'] for x in rows),maxEstimateMs=max(x['estimateBefore'] for x in rows)))
    s=report['result']['streaming']; scheduler=report['result']['scheduler']
    assert s['created']==10 and s['farSettled'] and scheduler['pending']==0
    assert s['initialElapsed']==s['elapsed']
    result.append(dict(source=name,phases=phases,created=s['created'],blockingRecoveries=scheduler['blockingRecoveries'],maxUnitMs=scheduler['maxUnitMs'],warnings=report['errors']))
(root/'prop-phase-comparison.json').write_text(json.dumps({'scope':'One instrumented paused pair with screenshot waits; not an FPS benchmark or causal A/B/A/B result. Summed phase waits overlap between chunks.','runs':result},indent=2)+'\n',encoding='utf-8')
for r in result: print(r['source'],'recoveries',r['blockingRecoveries'],'maxUnitMs',r['maxUnitMs'],[(p['batch'],round(p['totalWaitMs'])) for p in r['phases']])
