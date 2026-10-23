import json,sys,statistics,math
from pathlib import Path
p=Path(sys.argv[1]);j=json.loads((p/'benchmarks.json').read_text());records=j['records']
assert len(records)==8
rows=[]
for r in records:
 assert not r['errors']
 assert r['sceneAudit']['windStrength']==[.25,.25]
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
 assert [r['variant'] for r in group]==['base','fast','base','fast']
 for field in ['camera','coverageInstances']:
  expected=[f[field] for f in group[0]['gpu']['frames']]
  assert all([f[field] for f in r['gpu']['frames']]==expected for r in group),field
 for field in ['elapsed','workers','chunks','origin','target']:
  assert all(r['sceneAudit'][field]==group[0]['sceneAudit'][field] for r in group),field
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
print(json.dumps(rows,indent=2))

from PIL import Image
import numpy as np
comparisons=[]
for phase in ['day','night']:
 for a,b in ([(0,2),(4,6)] if phase=='day' else [(1,3),(5,7)]):
  x=np.asarray(Image.open(p/f'media-base-{phase}-{a}.png').convert('RGB'),dtype=np.int16);y=np.asarray(Image.open(p/f'media-fast-{phase}-{b}.png').convert('RGB'),dtype=np.int16)
  delta=np.abs(x-y);comparisons.append(dict(phase=phase,repeat=a//4+1,changedPixels=int(np.any(delta,axis=2).sum()),maxChannel=int(delta.max()),meanAbsolute=float(delta.mean())))
(p/'image-comparison.json').write_text(json.dumps(comparisons,indent=2)+'\n',encoding='utf-8')
print(comparisons)

# Separate repeat drift from stable A/B residuals; not a proof of causation.
residuals=[]
for phase,ids in [('day',[0,2,4,6]),('night',[1,3,5,7])]:
 a,b,c,d=[np.asarray(Image.open(p/f'media-{v}-{phase}-{i}.png').convert('RGB'),dtype=np.int16) for v,i in zip(['base','fast','base','fast'],ids)]
 ab=np.any(a!=b,axis=2);cd=np.any(c!=d,axis=2);aa=np.any(a!=c,axis=2);bb=np.any(b!=d,axis=2)
 stable=ab&cd&~aa&~bb
 residuals.append(dict(phase=phase,baseRepeatPixels=int(aa.sum()),fastRepeatPixels=int(bb.sum()),stableVariantPixels=int(stable.sum()),stableVariantMax=int(np.abs(a-b)[stable].max()) if stable.any() else 0))
 heat=np.zeros_like(a,dtype=np.uint8);heat[ab]=[255,100,0];heat[aa|bb]=[0,100,255];heat[stable]=[255,0,255]
 Image.fromarray(heat).save(p/f'residual-{phase}.png')
(p/'residual-analysis.json').write_text(json.dumps(residuals,indent=2)+'\n',encoding='utf-8')
print(residuals)
