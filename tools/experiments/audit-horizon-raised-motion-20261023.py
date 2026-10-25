import json,math,runpy,sys
from pathlib import Path
runpy.run_path('tools/experiments/audit-populated-excursion-20261023.py',run_name='__main__')
p=Path(sys.argv[1]);d=json.loads((p/'active-play.json').read_text(encoding='utf-8'));rows=[]
for r in d['records']:
 fs=r['frames'];x,z=fs[0]['camera'][0],fs[0]['camera'][2]
 canyon=r.get('motionPath')=='canyon-z'
 if canyon or r['biome']=='desierto': assert all(f.get('cameraClearance') is not None and f['cameraClearance']>=3-1e-6 for f in fs), 'Invalid terrain camera clearance'
 errors=[max(abs(f['camera'][0]-(x+(0 if canyon else 144)*math.sin(math.pi*min(1,f['wallMs']/40000))**2)),abs(f['camera'][2]-(z+(144 if canyon else 50.4)*math.sin(math.pi*min(1,f['wallMs']/40000))**2))) for f in fs]
 rows.append(dict(phase=r['phase'],maxHorizontalPathError=max(errors),divertedFrames=sum(e>.01 for e in errors)))
(p/'path-check.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
assert all(r['divertedFrames']==0 for r in rows),rows
print(rows)
