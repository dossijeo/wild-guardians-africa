import json
from pathlib import Path
from urllib.parse import urlparse,parse_qs
p=Path('docs/qa/global-visual-lab/current-review-20261025')
rows=[];reference=None
for run in ['a1','b1','a2','b2']:
 d=json.loads((p/f'canyon-handoff-cost-{run}.json').read_text(encoding='utf-8'));s=d['result']['streaming'];q=parse_qs(urlparse(d['url']).query)
 assert (q.get('horizonHandoff')==['atomic'])==run.startswith('b')
 assert q.get('frameScheduler')==['1']
 assert not [e for e in d['errors'] if 'warning X4000' not in e]
 assert s['gpu']['supported'] and not s['gpu']['disjoint'] and s['gpu']['samplesMs']
 assert s['farSettled'] and s['elapsed']==s['initialElapsed']
 conditions=[d['biome'],d['quality'],s['hardware'],s['options'],s['cameraOrigin'],s['targetOrigin'],s['initialElapsed']]
 if reference is None:reference=conditions
 assert conditions==reference, 'Mismatched conditions'
 f=s['rows']['frames'];ordered=sorted(f)
 rows.append(dict(run=run,gpuMs=s['gpu']['summary']['mean'],gpuSamples=len(s['gpu']['samplesMs']),presentationMs=s['summary']['frames']['mean'],presentationP95=s['summary']['frames']['p95'],presentationP99=ordered[int((len(ordered)-1)*.99)],presentationMax=max(f),observedFrames=len(f),elapsedMs=sum(f),renderCpuMs=s['summary']['render']['mean'],created=s['created'],wasmBytes=s['final']['memoryBytes'],nativeChunks=s['final']['loadedChunks']))
(p/'canyon-handoff-cost-summary.json').write_text(json.dumps({'scope':'Paused streaming cost pilot; A may draw missing terrain. No visual-equivalence or GPU speedup claim. RAF intervals include CPU and presentation; GPU query intervals may include bubbles. WASM bytes are not GPU memory.','conditions':reference,'rows':rows},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(rows,indent=2))
