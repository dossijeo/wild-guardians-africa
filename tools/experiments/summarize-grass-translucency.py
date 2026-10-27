from pathlib import Path
import json,statistics,gzip
root=Path('docs/qa/global-visual-lab/grass-translucency-native');out=[]
for biome in ['sabana','gran-rio','gran-canon']:
 path=root/biome/'benchmarks-media.json'
 records=json.loads(path.read_text(encoding='utf-8') if path.exists() else gzip.decompress(path.with_suffix('.json.gz').read_bytes()).decode('utf-8'))['records']
 for view in ['close','game']:
  for phase in ['day','night']:
   row={'biome':biome,'view':view,'phase':phase}
   for variant in ['original','translucent']:
    blocks=[r for r in records if r['view']==view and r['phase']==phase and r['variant']==variant]
    assert len(blocks)==2
    assert all(not r['errors'] and r['cameraStable'] and not r['gpu']['disjointEvents'] and len(r['gpu']['samples'])==120 for r in blocks)
    samples=[s['ms'] for r in blocks for s in r['gpu']['samples']]
    row[variant]={'gpuMean':statistics.mean(samples),'gpuP95':sorted(samples)[227],'cpuMean':statistics.mean(s for r in blocks for s in r['cpu']),'blocks':[statistics.mean(s['ms'] for s in r['gpu']['samples']) for r in blocks]}
   row['deltaMs']=row['translucent']['gpuMean']-row['original']['gpuMean'];out.append(row)
(root/'benchmark-summary.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n')
for r in out:print(r['biome'],r['view'],r['phase'],round(r['deltaMs'],3))
