"""Validate current active biome smoke controls; do not imply paired speedups."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/current-review-20261025'
rows=[]
for biome in ['sabana','gran-rio','manglares','desierto','volcanes','gran-canon']:
    name=biome+'-coalesced-water-active'
    d=json.loads((root/(name+'.json')).read_text());s=d['result']['streaming'];q=d['result']['scheduler']
    assert s['options']['active'] and not s['options']['visualSteps'] and s['options']['frames']==180 and s['options']['distance']==96
    assert s['created']==10 and s['actorsReadyFrames']==180 and s['pausedFrames']==0 and s['farSettled'] and q['pending']==0
    assert s['gpu']['supported'] and not s['gpu']['disjoint']
    assert not [e for e in d['errors'] if 'warning X4000' not in e]
    if biome=='manglares':assert 'mangroveFerns=holly' in d['url'] and 'groundCache=fixed512' in d['url']
    if biome=='gran-canon':assert s['options']['terrainCamera'] and len(s['cameraSamples'])==180 and min(x['clearance'] for x in s['cameraSamples'])>0
    rows.append(dict(biome=biome,source=name+'.json',url=d['url'],hardware=s['hardware'],cameraPath='terrain-following' if s['options']['terrainCamera'] else 'fixed-height',frames=s['summary']['frames'],gpu=s['gpu']['summary'],preparation=s['summary']['preparationCpu'],latency=s['summary']['preparationLatency'],slices=s['summary']['slices'],blockingRecoveries=q['blockingRecoveries']))
(root/'coalesced-water-six-biome-controls.json').write_text(json.dumps({'scope':'Single active controls, not A/B/A/B; different worlds and settling lengths. GPU elapsed is not pure GPU busy time. No claim of overall speedup or complete lifecycle coverage.','runs':rows},indent=2)+'\n',encoding='utf-8')
for r in rows:print(r['biome'], 'GPU',round(r['gpu']['mean'],2),'RAF p95',round(r['frames']['p95'],2),'recoveries',r['blockingRecoveries'])
