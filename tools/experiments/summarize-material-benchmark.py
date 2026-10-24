"""Summarize paired fixture timings; preserve blocks to expose drift."""
import json,sys
from pathlib import Path
root=Path(sys.argv[1]);records=json.loads((root/'paired.json').read_text(encoding='utf-8'))['records'];out=[]
for r in records:
 assert r['report']['cameraStable'] and r['report']['simulationUnchanged']
 assert not r['report']['errors'],r['report']['errors']
for case,phase in sorted({(r['sceneCase'],r['phase']) for r in records}):
 rows=[r for r in records if r['sceneCase']==case and r['phase']==phase]
 values=[[r['report']['gpuElapsedMs']['mean'] for r in rows if r['variant']==v] for v in [0,1]]
 assert all(len(v)>=2 for v in values),'At least two blocks per variant required'
 a,b=[sum(v)/len(v) for v in values]
 out.append({'case':case,'phase':phase,'base':a,'candidate':b,'delta':b-a,'blockMeans':values})
(root/'performance-summary.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(out,indent=2))
