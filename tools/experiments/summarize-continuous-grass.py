from pathlib import Path
import json,statistics
ROOT=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/continuous-grass'
rows=[];lines=['# Benchmarks de cobertura continua','', 'Intel UHD 0x9A60, ANGLE/D3D11, Chrome headless, 1280×720, DPR 1. Semilla 712. A/B/C/C/B/A por vista y hora, 30 frames de calentamiento + 120 muestras por bloque. GPU incluye todas las pasadas; CPU es envío/render, no tiempo total de simulación. No se suman CPU y GPU. Mediana de 240 muestras por celda; p95 no es garantía de FPS.','', '| Calidad | Vista | Hora | Variante | GPU mediana / p95 ms | CPU mediana / p95 ms | Draws | Triángulos totales |','|---|---|---|---|---:|---:|---:|---:|']
def p95(a):return sorted(a)[int(.95*(len(a)-1))]
for quality in ['media','baja']:
 records=json.loads((ROOT/f'benchmarks-{quality}.json').read_text(encoding='utf-8'))['records']
 assert len(records)==36
 for view in ['close','game','elevated']:
  for phase in ['day','night']:
   variants={}
   for v in 'ABC':
    group=[r for r in records if r['view']==view and r['phase']==phase and r['variant']==v]
    assert len(group)==2 and all(not r['errors'] and r['glError']==0 and r['cameraStable'] and not r['gpu']['disjointEvents'] for r in group)
    gpu=[s['ms'] for r in group for s in r['gpu']['samples']];cpu=[s for r in group for s in r['cpu']];assert len(gpu)==240
    variants[v]=dict(gpuMedian=statistics.median(gpu),gpuP95=p95(gpu),cpuMedian=statistics.median(cpu),cpuP95=p95(cpu),calls=group[0]['calls'],triangles=group[0]['triangles'],samples=len(gpu),blockGpuMedians=[statistics.median(s['ms']for s in r['gpu']['samples'])for r in group])
    z=variants[v];lines.append(f"| {quality} | {view} | {phase} | {v} | {z['gpuMedian']:.3f} / {z['gpuP95']:.3f} | {z['cpuMedian']:.3f} / {z['cpuP95']:.3f} | {z['calls']} | {z['triangles']:,} |")
   rows.append(dict(quality=quality,view=view,phase=phase,variants=variants))
(ROOT/'benchmark-summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
lines+=['','72 bloques, 8.640 muestras GPU válidas. Orden simétrico para reducir deriva; las diferencias pequeñas o negativas se consideran ruido, no una mejora de velocidad. Comparar dentro de esta ejecución, no contra ejecuciones históricas con distinta temperatura/carga.','', 'Los contadores coverage.near/far conservan la última asignación cuando A está oculta: active=false. Para el coste real de A se utilizan los draws/triángulos del renderer, no esos buffers retenidos.']
(ROOT/'BENCHMARKS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
print('Validated 8640 GPU samples; wrote benchmark summary.')
