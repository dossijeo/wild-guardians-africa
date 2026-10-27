"""Summarize complete Grand River ABCCBA timing runs with explicit drift checks."""
import sys
sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path
import json,statistics,csv
root=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/continuous-grass-river/performance'
def median(values):return statistics.median(values)
def p95(values):
 s=sorted(values);i=(len(s)-1)*.95;lo=int(i);return s[lo]+(s[min(lo+1,len(s)-1)]-s[lo])*(i-lo)
rows=[];valid=0;devices=set()
for quality in ['media','baja']:
 data=json.loads((root/f'benchmarks-{quality}.json').read_text(encoding='utf-8'));records=data['records'];assert len(records)==72,(quality,len(records))
 for r in records:
  assert not r['errors'] and r['glError']==0 and r['cameraStable']
  g=r['gpu'];assert g['supported'] and not g['contextLost'] and not g['disjointEvents'] and len(g['samples'])==120
  assert r['coverage']['stats']['overflow']==0
  valid+=len(g['samples']);devices.add(r['device'])
 for region in ['vegetation','shore']:
  for view in ['close','game','elevated']:
   for phase in ['day','night']:
    group=[r for r in records if (r['region'],r['view'],r['phase'])==(region,view,phase)]
    assert [r['variant'] for r in group]==['A','B','C','C','B','A']
    assert len({(tuple(r['camera']),tuple(r['target']),r['time'],tuple(r['resolution'])) for r in group})==1
    row=dict(quality=quality,region=region,view=view,phase=phase)
    for variant in ['A','B','C']:
     rs=[r for r in group if r['variant']==variant];gpu=[s['ms'] for r in rs for s in r['gpu']['samples']];cpu=[s for r in rs for s in r['cpu']]
     row[variant]=dict(gpuMedianMs=median(gpu),gpuP95Ms=p95(gpu),cpuMedianMs=median(cpu),cpuP95Ms=p95(cpu),calls=rs[0]['calls'],triangles=rs[0]['triangles'],geometryCount=rs[0]['geometries'],textureCount=rs[0]['textures'])
    row['gpuDeltaC_A']=row['C']['gpuMedianMs']-row['A']['gpuMedianMs'];row['gpuDeltaB_A']=row['B']['gpuMedianMs']-row['A']['gpuMedianMs']
    row['baselineDriftMs']=median(s['ms'] for s in group[-1]['gpu']['samples'])-median(s['ms'] for s in group[0]['gpu']['samples'])
    rows.append(row)
(root/'summary.json').write_text(json.dumps(dict(validGpuSamples=valid,devices=sorted(devices),rows=rows),indent=2)+'\n',encoding='utf-8',newline='\n')
header='| Calidad | Región | Cámara | Luz | GPU A / B / C ms | Δ C−A ms | CPU A / C ms | Deriva A ms |\n|---|---|---|---|---:|---:|---:|---:|\n'
lines=[]
for r in rows:
 lines.append(f"| {r['quality']} | {r['region']} | {r['view']} | {r['phase']} | {r['A']['gpuMedianMs']:.2f} / {r['B']['gpuMedianMs']:.2f} / {r['C']['gpuMedianMs']:.2f} | {r['gpuDeltaC_A']:+.2f} | {r['A']['cpuMedianMs']:.2f} / {r['C']['cpuMedianMs']:.2f} | {r['baselineDriftMs']:+.2f} |")
(root/'TABLE.md').write_text(header+'\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
print(header+'\n'.join(lines));print('Validated GPU samples:',valid)
