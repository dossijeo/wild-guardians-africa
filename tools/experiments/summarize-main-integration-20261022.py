from pathlib import Path
import json
root=Path('docs/qa/global-visual-lab/main-integration-20261022')
lines=['# Nueva línea base tras integrar main','', 'Estado: seis series medidas. Gran Cañón en calidad media requiere aislar diferencias de carga entre repeticiones; sus tiempos son provisionales. Streaming y cierre de integración pendientes.','', 'Main: b2497b069 (PR #212). Laboratorio: merge 5cf14fc65, validación 5248ea85b. Intel UHD, 1280×720, semilla712, escena poblada guardada, día/noche, misma cámara móvil, streaming habilitado. A/B/A/B por perfil. GPU y cadencia medidos por separado; CPU es tiempo de render, no toda la simulación.','', 'Main y laboratorio tienen distinta dirección gráfica: el segundo añade cobertura geométrica, iluminación y fondo lejano. Son costes del producto completo, no una optimización de imágenes equivalentes.','', '| Bioma | Calidad / fase | GPU main (ms) | GPU laboratorio (ms) | CPU main (ms) | CPU laboratorio (ms) |','|---|---|---:|---:|---:|---:|']
pending=[]
for biome in ['sabana','gran-rio','manglares','desierto','volcanes','gran-canon']:
 p=root/f'{biome}-benchmark/summary.json'
 if not p.exists():pending.append(biome);continue
 d=json.loads(p.read_text(encoding='utf-8'))
 for quality in ['media','baja']:
  for phase in ['day','night']:
   r=[x for x in d['rows'] if x['quality']==quality and x['phase']==phase]
   def interval(variant,metric):
    a=[x[metric]['mean'] for x in r if x['variant']==variant];return f'{min(a):.2f}–{max(a):.2f}'
   lines.append(f"| {biome} | {quality} / {phase} | {interval('main','gpu')} | {interval('lab','gpu')} | {interval('main','cpu')} | {interval('lab','cpu')} |")
lines+=['',('Series pendientes: '+', '.join(pending)+'.') if pending else 'Las seis series contienen 16 registros cada una. Medición completada no implica comparabilidad aceptada.','','Los rangos son las medias de las dos repeticiones, no intervalos de confianza. Percentiles, muestras y comprobaciones de carga están en cada summary.json/benchmarks.json. Una secuencia de cámara por fotogramas no equivale a un recorrido de velocidad fija en tiempo real. No convertir estos resultados en FPS de una partida activa.','','Sabana: las repeticiones de calidad media conservan exactamente la secuencia de llamadas/triángulos y los recursos iniciales. En baja, tres fotogramas GPU diurnos y uno nocturno difieren en1519triángulos; diferencia acumulada absoluta relativa0,0133% y0,00444%. Las secuencias de cadencia/CPU son idénticas. La interpolación de ocultación usa dt real; es una explicación plausible del desfase, no una causalidad aislada por esta prueba. No se eliminan muestras.','','La comprobación visual postmerge preserva los12primeros planos aprobados de Manglares píxel a píxel. Las referencias pobladas de Volcanes anteceden al ajuste de alineación del fondo y no bastan por sí solas para atribuir sus diferencias al merge.']
lines += ['', 'Gran Cañón, calidad media: las repeticiones GPU diurnas difieren en ocho fotogramas, hasta 667262 triángulos en laboratorio y 772361 en main; diferencia acumulada absoluta relativa de 5,69% y 8,37%. También hay diferencias de cadencia. No atribuirlas a la interpolación de ocultación sin aislar la causa. Calidad baja conserva las secuencias. Mantener media como diagnóstico provisional, no evidencia de una ventaja o penalización cuantificada.', '']
(root/'BASELINE.md').write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
