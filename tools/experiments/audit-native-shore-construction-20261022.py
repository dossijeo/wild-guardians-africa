import json,statistics
from pathlib import Path
r=Path('docs/qa/global-visual-lab/native-shore-construction-profile-20261022')
d=json.loads((r/'captures.json').read_text(encoding='utf8'));out=[]
for record in d['records']:
 assert not record['errors']
 frames=record['frames'];samples=[s for f in frames for s in (f['shoreProfile'] or {}).get('samples',[])]
 times=sorted(s['ms'] for s in samples)
 out.append(dict(biome=record['biome'],phase=record['phase'],builds=len(samples),totalMs=sum(times),meanMs=statistics.mean(times) if times else 0,p95Ms=times[int((len(times)-1)*.95)] if times else 0,maxMs=max(times,default=0),maxDimensions=max(((s['nx'],s['nz']) for s in samples),key=lambda p:p[0]*p[1],default=None),liveBytes=[(f['shoreProfile'] or {}).get('liveBytes',0) for f in frames],peakBytes=max(((f['shoreProfile'] or {}).get('peakBytes',0) for f in frames),default=0)))
(r/'summary.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf8',newline='\n');print(json.dumps(out,indent=2))
