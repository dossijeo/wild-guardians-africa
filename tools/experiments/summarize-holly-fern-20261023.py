import json,statistics,sys
from pathlib import Path
p=Path(sys.argv[1]);s=json.loads((p/'summary.json').read_text());raw=json.loads((p/'benchmarks.json').read_text());rows=s['rows']
lines=['# Resultado A/B/A/B: helechos radiales','','A: cobertura aprobada. B: variante indicada en cardStudy de benchmarks.json. Intel UHD 0x9A60 / ANGLE D3D11, Chrome, 1280×720. Escena poblada guardada, cámara oscilante de 8 m, impostores y fondo activos, simulación pausada. 60 fotogramas de calentamiento + 90 medidos por modo; GPU por EXT_disjoint_timer_query_webgl2. CPU render y cadencia se miden en otra pasada sin query GPU.','','| Perfil/fase | GPU A (ms) | GPU B (ms) | Delta B−A, parejas (ms) | CPU A / B (ms) | Cadencia A / B (ms) |','|---|---:|---:|---:|---:|---:|']
pairs=[]
for quality in ['media','baja']:
 for phase in ['day','night']:
  a=[r for r in rows if r['quality']==quality and r['phase']==phase and r['variant']=='original'];b=[r for r in rows if r['quality']==quality and r['phase']==phase and r['variant']=='cards']
  mean=lambda rs,k:statistics.mean(r[k]['mean'] for r in rs)
  delta=[y['gpu']['mean']-x['gpu']['mean'] for x,y in zip(a,b)]
  pairs.append(dict(quality=quality,phase=phase,gpuDelta=delta,gpuBefore=mean(a,'gpu'),gpuAfter=mean(b,'gpu'),cpuBefore=mean(a,'cpu'),cpuAfter=mean(b,'cpu'),intervalBefore=mean(a,'interval'),intervalAfter=mean(b,'interval')))
  lines.append(f"| {quality}/{phase} | {mean(a,'gpu'):.2f} | {mean(b,'gpu'):.2f} | {' / '.join(f'{x:+.2f}' for x in delta)} | {mean(a,'cpu'):.2f} / {mean(b,'cpu'):.2f} | {mean(a,'interval'):.2f} / {mean(b,'interval'):.2f} |")
  rr=[r for r in raw['records'] if r['quality']==quality and r['phase']==phase]
  for mode in ['gpu','cadence']:
   if '--different-populations' in sys.argv:
    for variant in ['original','cards']:
     same=[r for r in rr if r['variant']==variant]
     assert [f['coverageInstances'] for f in same[0][mode]['frames']]==[f['coverageInstances'] for f in same[1][mode]['frames']],'Repeat selection mismatch'
   else:
    expected=[f['coverageInstances'] for f in rr[0][mode]['frames']]
    for r in rr[1:]:assert [f['coverageInstances'] for f in r[mode]['frames']]==expected,'Native anchor selection mismatch'
checks=s['repeatChecks'];bad=[c for c in checks if not c['sameDrawSequence']]
population_note=('La poblacion cambia deliberadamente por el margen de exclusion y el descarte periferico. Se verifica igualdad entre repeticiones de cada variante.' if '--different-populations' in sys.argv else 'Poblacion de anclajes nativos igual entre A/B.')
lines+=['','Controles: '+population_note+' Recorrido de camara identico. Sin errores GL, queries disjuntas o cambios de estado de simulacion segun auditor. '+('Repeticiones con secuencias de draws/triangulos identicas.' if not bad else 'Hay diferencias de carga entre repeticiones: revisar repeatChecks de summary.json antes de atribuir variaciones de tiempo.'),'','Limitaciones: dos parejas por condicion, carga termica/sistema no bloqueados, campana pausada. No equivale a FPS de juego activo; no sumar CPU+GPU. Percentiles y contadores completos en summary.json. VRAM fisica y overdraw de pantalla no medidos; numero de texturas y estimaciones de bytes no los sustituyen. Menos triangulos no demuestra por si solo mejor frametime.']
(p/'RESULTS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
(p/'paired-results.json').write_text(json.dumps(pairs,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(pairs,indent=2))
