"""Compare the authored 180-frame prefix separately from variable settling."""
import json, statistics
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/current-review-20261025'
def summary(xs):
    return dict(count=len(xs),mean=statistics.mean(xs),p95=statistics.quantiles(xs,n=100,method='inclusive')[94],max=max(xs))
rows=[];reference=None
for run in ['a1','b1','a2','b2']:
    d=json.loads((root/('river-water-abab-'+run+'.json')).read_text());s=d['result']['streaming'];q=d['result']['scheduler']
    expected='sync' if run.startswith('a') else 'coalesced'
    assert d['result']['assetWaterPreparation']==expected
    assert any(k.startswith('asset-water-bed-') for k in s['terrainPhases'])==(expected=='coalesced'),'Execution did not match selected preparation mode'
    assert s['options']['active'] and s['options']['frames']==180 and not s['options']['visualSteps']
    assert s['created']==10 and s['actorsReadyFrames']==180 and s['pausedFrames']==0 and s['farSettled'] and q['pending']==0
    assert s['gpu']['supported'] and not s['gpu']['disjoint']
    assert not [e for e in d['errors'] if 'warning X4000' not in e]
    signature=[d['biome'],d['quality'],d['url'],s['hardware'],s['cameraOrigin'],s['targetOrigin'],s['initialElapsed'],s['workersBefore'],s['options']]
    if reference is None:reference=signature
    assert signature==reference,'Different initial state or options'
    rows.append(dict(run=run,mode=expected,authoredFrames=summary(s['rows']['frames'][:180]),allFrames=s['summary']['frames'],gpu=s['gpu']['summary'],preparationCpu=s['summary']['preparationCpu'],preparationLatency=s['summary']['preparationLatency'],slices=s['summary']['slices'],draw=s['summary']['draw'],loading=d['result']['loading'],blockingRecoveries=q['blockingRecoveries']))
(root/'asset-water-abab-summary.json').write_text(json.dumps({'scope':'A/B/A/B on same host, authored camera and initial world. First 180 presentation intervals compared separately; GPU and other summaries include variable settling. Simulation advances by real wall time, so final states differ. One series cannot establish small speedups.','runs':rows},indent=2)+'\n',encoding='utf-8')
for r in rows:print(r['run'],r['mode'],'RAF',r['authoredFrames'],'GPU',round(r['gpu']['mean'],3),'latency',round(r['preparationLatency']['mean'],2))
