import json, statistics, sys
from pathlib import Path
p=Path(sys.argv[1]); raw=json.loads((p/'benchmarks.json').read_text()); s=json.loads((p/'summary.json').read_text()); rows=s['rows']
lines=['# Coste aislado de sombras de helechos','','A: mismos helechos sin proyectar sombras. B: proyectan sombras. Ambas variantes usan mapa solar 4096, mismas geometrías, instancias, materiales, cámara y semilla. No es una comparación con producción 1024. Intel UHD, campaña pausada, 1280x720, fondo completo, cámara móvil, viento determinista. A/B/A/B; 60 warmup + 90 muestras GPU y otra pasada de cadencia.','','| Fase | GPU A / B ms | Deltas de las dos parejas | CPU A / B ms | Cadencia A / B ms |','|---|---|---|---|---|']
for phase in ['day','night']:
 a=[r for r in rows if r['phase']==phase and r['variant']=='original'];b=[r for r in rows if r['phase']==phase and r['variant']=='cards'];assert len(a)==len(b)==2
 mean=lambda rs,k:statistics.mean(r[k]['mean'] for r in rs)
 deltas=[y['gpu']['mean']-x['gpu']['mean'] for x,y in zip(a,b)]
 lines.append(f"| {phase} | {mean(a,'gpu'):.2f} / {mean(b,'gpu'):.2f} | {deltas[0]:+.2f} / {deltas[1]:+.2f} | {mean(a,'cpu'):.2f} / {mean(b,'cpu'):.2f} | {mean(a,'interval'):.2f} / {mean(b,'interval'):.2f} |")
 rr=[r for r in raw['records'] if r['phase']==phase]
 for mode in ['gpu','cadence']:
  expected=[(f['camera'],f['coverageInstances']) for f in rr[0][mode]['frames']]
  assert all([(f['camera'],f['coverageInstances']) for f in r[mode]['frames']]==expected for r in rr), 'Scene/camera mismatch'
lines+=['','Verificado: misma selección de instancias y trayectoria en todas las repeticiones. Las diferencias de triángulos/draws incluyen la pasada de sombra adicional. Auditoría y percentiles en summary.json. No sumar CPU y GPU. Dos parejas no eliminan deriva térmica ni variación del sistema; la campaña está pausada. Memoria GPU física y overdraw no medidos. La calidad visual sigue pendiente de alcanzar el mockup.']
(p/'RESULTS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
print('\n'.join(lines))
