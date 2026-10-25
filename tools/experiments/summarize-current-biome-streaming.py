"""Summarize current active streaming observations, not cross-biome A/B claims."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/current-review-20261025'
sources={'sabana':'sabana-clean-retention-a1','gran-rio':'gran-rio-active-stream','manglares':'manglares-medium-active-stream','desierto':'desierto-active-stream','volcanes':'volcanes-active-stream','gran-canon':'gran-canon-terrain-camera-stream'}
rows=[]
for biome,source in sources.items():
 d=json.loads((root/(source+'.json')).read_text(encoding='utf-8'));s=d['result']['streaming']
 assert d['biome']==biome and d['quality']=='media'
 assert s['options']['active'] and s['options']['frames']==180 and s['options']['distance']==96
 assert s['farSettled'] and s['actorsReadyFrames']==180 and s['pausedFrames']==0
 assert s['gpu']['supported'] and not s['gpu']['disjoint']
 assert not [e for e in d['errors'] if 'X4000' not in e]
 rows.append({'biome':biome,'visuallyValid':True,'visualLimitation':'Final screenshot only; not exhaustive motion inspection.','cameraPath':'Terrain-following native pose' if biome=='gran-canon' else 'Fixed-height translation','source':source+'.json','url':d['url'],'hardware':s['hardware'],'created':s['created'],'raf':s['summary']['frames'],'gpu':s['gpu']['summary'],'draw':s['summary']['draw'],'nativeBefore':s['baseline'],'nativeAfter':s['final']})
result={'scope':'Single observations collected at different times. Same authored camera duration/distance, different worlds and wall-clock simulation progression. Not paired performance comparisons. GPU elapsed includes pipeline bubbles; native memory excludes GPU and JS memory.','runs':rows}
(root/'six-biome-streaming-summary.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
for r in rows:print(r['biome'], 'RAF',round(r['raf']['mean'],2),'p95',round(r['raf']['p95'],2),'GPU',round(r['gpu']['mean'],2))
