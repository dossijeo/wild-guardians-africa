import json,sys,statistics,math
from pathlib import Path
p=Path(sys.argv[1]);j=json.loads((p/'benchmarks.json').read_text());records=j['records']
assert len(records)==8
rows=[]
for r in records:
 assert not r['errors']
 assert r['sceneAudit']['windStrength']==([.25,.25] if r['variant']=='wind' else [0,0])
 for name in ['gpu','cadence']:
  m=r[name];assert m['stateUnchanged'] and m['glError']==0
  assert len(m['frames'])==90
  assert not m['coverage']['stats'].get('overflow',0)
 g=r['gpu']['gpu'];assert g['supported'] and len(g['samples'])==90 and not g['disjointEvents'] and not g['pending'] and not g['contextLost']
 def avg(xs):return round(statistics.mean(xs),3)
 cadence=[f['intervalMs'] for f in r['cadence']['frames']]
 rows.append(dict(variant=r['variant'],phase=r['phase'],motion=r['motion'],gpuMs=avg(s['ms'] for s in g['samples']),cpuMs=avg(f['cpuMs'] for f in r['cadence']['frames']),intervalMs=avg(cadence),p95Ms=round(sorted(cadence)[math.ceil(.95*len(cadence))-1],3),calls=avg(f['calls'] for f in r['gpu']['frames']),triangles=avg(f['triangles'] for f in r['gpu']['frames']),shadowDraws=r['shadowCacheAfter']['draws']-r['sceneAudit']['shadowCacheBefore']['draws'],memory=r['gpu']['memory']))
for phase in ['day','night']:
 group=[r for r in records if r['phase']==phase]
 assert [r['variant'] for r in group]==['wind','still','wind','still']
 for field in ['camera','coverageInstances']:
  expected=[f[field] for f in group[0]['gpu']['frames']]
  assert all([f[field] for f in r['gpu']['frames']]==expected for r in group),field
 for field in ['elapsed','workers','chunks','origin','target']:
  assert all(r['sceneAudit'][field]==group[0]['sceneAudit'][field] for r in group),field
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
print(json.dumps(rows,indent=2))
