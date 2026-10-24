from pathlib import Path
import json,statistics,math
for folder in ['loading-native-motion-20261022','loading-native-motion-paced-20261022']:
 root=Path('docs/qa/global-visual-lab')/folder
 if not (root/'benchmark.json').exists():continue
 data=json.loads((root/'benchmark.json').read_text());rows=[]
 for phase in ['day','night']:
  for motion in ['static','wind','orbit','both']:
   for force in [False,True]:
    fs=[f for f in data['benchmark']['frames'] if f['phase']==phase and f['motion']==motion and f['force']==force and not f['disjoint']]
    blocks=[statistics.median(f['gpu'] for f in fs if f['block']==b) for b in sorted(set(f['block'] for f in fs))]
    rows.append(dict(phase=phase,motion=motion,forced=force,samples=len(fs),gpu_median=statistics.median(f['gpu'] for f in fs),gpu_p95=sorted(f['gpu'] for f in fs)[math.ceil(len(fs)*.95)-1],cpu_median=statistics.median(f['cpu'] for f in fs),calls=sorted(set(f['calls'] for f in fs)),triangles=sorted(set(f['triangles'] for f in fs)),blocks=blocks,repeat_drift=max(blocks)/min(blocks)-1))
 result={'renderer':data['benchmark']['renderer'],'rows':rows,'errors':data['errors'],'disjoint':sum(f['disjoint'] for f in data['benchmark']['frames'])}
 (root/'summary.json').write_bytes(json.dumps(result,indent=2).encode())
 print(folder)
 for r in rows:print(r['phase'],r['motion'],r['forced'],round(r['gpu_median'],3),[round(x,3) for x in r['blocks']],round(r['repeat_drift'],2))
