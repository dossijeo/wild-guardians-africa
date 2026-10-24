from pathlib import Path
import json, statistics
p=Path('docs/qa/global-visual-lab/grass-wind-preserved')
rows=[]
for quality in ['media','baja']:
 data=json.loads((p/f'benchmarks-{quality}.json').read_text(encoding='utf-8'))['records']
 for view in ['close','game']:
  for phase in ['day','night']:
   entry={'quality':quality,'view':view,'phase':phase}
   for variant in ['static','wind']:
    blocks=[r for r in data if r['view']==view and r['phase']==phase and r['variant']==variant]
    assert len(blocks)==2
    assert all(not r['errors'] and r['cameraStable'] and len(r['gpu']['samples'])==120 and not r['gpu']['disjointEvents'] for r in blocks)
    gpu=[s['ms'] for r in blocks for s in r['gpu']['samples']];cpu=[s for r in blocks for s in r['cpu']]
    entry[variant]={'gpuMean':statistics.mean(gpu),'gpuP95':sorted(gpu)[int(.95*(len(gpu)-1))],'cpuMean':statistics.mean(cpu),'blockGpuMeans':[statistics.mean(s['ms'] for s in r['gpu']['samples']) for r in blocks],'calls':blocks[0]['calls'],'triangles':blocks[0]['triangles'],'textures':blocks[0]['textures']}
   entry['gpuDeltaPercent']=100*(entry['wind']['gpuMean']/entry['static']['gpuMean']-1)
   rows.append(entry)
(p/'benchmark-summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
for r in rows: print(r['quality'],r['view'],r['phase'],round(r['static']['gpuMean'],3),round(r['wind']['gpuMean'],3),round(r['gpuDeltaPercent'],2))
