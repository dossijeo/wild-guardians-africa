from pathlib import Path
import json,statistics,math
p=Path('docs/qa/global-visual-lab/desert-continuous-20261021')
d=json.loads((p/'benchmarks.json').read_text());rs=d['records'];assert len(rs)==4
out=[]
for phase in ['day','night']:
 a,b=[next(r for r in rs if r['phase']==phase and r['variant']==v) for v in ['base','combined']]
 for r in [a,b]:
  assert not r['errors'] and not r['glError'] and len(r['trace'])==240
  for f in r['trace']:assert all(math.isfinite(f[k]) and f[k]>=0 for k in ['cpuMs','intervalMs'])
  row={'phase':phase,'variant':r['variant']}
  for k in ['cpuMs','intervalMs']:
   xs=[f[k] for f in r['trace']];row[k]={'mean':statistics.mean(xs),'p95':sorted(xs)[227],'max':max(xs)}
  row['chunkChanges']=sum(x['chunks']!=y['chunks'] for x,y in zip(r['trace'],r['trace'][1:]));row['finalMemory']=r['trace'][-1]['memory'];out.append(row)
 for x,y in zip(a['trace'],b['trace']):assert all(abs(u-v)<1e-7 for u,v in zip(x['camera'],y['camera']))
 out[-1]['framesDifferentChunkSets']=sum(x['chunks']!=y['chunks'] for x,y in zip(a['trace'],b['trace']))
(p/'summary.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(out,indent=2))
