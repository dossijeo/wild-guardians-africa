# Referencia diurna actual de los seis biomas

Dos ejecuciones consecutivas por bioma, Chrome/Intel UHD 0x9A60 (ANGLE D3D11),
1280×720, calidad media, escenas pobladas guardadas, cámara quieta y simulación
pausada. Receta globalCurrentReviewQuery, pthreads y Global Frame Scheduler.
Opciones normales de streaming, sin los overrides antiguos del harness.
Manglares se midió en el pase previo; los otros cinco en 0b2570102. Las fuentes
medidas se conservan con sus huellas en cada archivo .sources.json.

No es A/B contra main ni una prueba de carga en frío. Las escenas de distintos
biomas tienen geometría y materiales distintos; esta tabla es una referencia de
costes absolutos, no una clasificación de optimizaciones equivalentes.

| Bioma | GPU media r1/r2 (ms) | CPU render media r1/r2 (ms) | Presentación P95 r1/r2 (ms) | Máximo presentación r1/r2 (ms) |
|---|---:|---:|---:|---:|
| sabana | 16.79/16.72 | 5.66/5.50 | 33.31/33.30 | 33.52/33.83 |
| gran-rio | 18.45/18.27 | 5.37/5.39 | 33.38/33.37 | 33.71/33.54 |
| manglares | 22.23/21.62 | 6.33/5.95 | 33.44/33.42 | 50.14/49.88 |
| desierto | 15.15/15.31 | 3.71/4.12 | 16.90/16.84 | 33.48/33.58 |
| volcanes | 16.82/16.93 | 5.17/5.28 | 33.32/33.28 | 33.73/33.64 |
| gran-canon | 14.12/14.61 | 5.00/5.04 | 16.85/16.87 | 17.04/33.43 |

Cada ejecución contiene 125 muestras GPU válidas sin disjoint y 372 intervalos
de presentación (360 de prueba y 12 de confirmación tras 60 de calentamiento).
El verificador comprueba igualdad entre repeticiones de cámara, objetivo,
trabajadores, elapsed, opciones y residencia nativa; no hay creación de chunks
durante la medición y la preparación lejana queda asentada. No se registran
errores distintos de las advertencias X4000 existentes. Los bytes de memoria
lineal WASM no representan VRAM. GPU elapsed incluye burbujas de pipeline; CPU
render incluye draw y no se debe sumar a él. Los máximos no se ocultan: Cañón r2
pierde un intervalo aunque r1 no lo hace, y Manglares alcanza unos 50 ms.

Las doce capturas finales se inspeccionaron a resolución nativa en los dos pases.
Sabana conserva fibras secas y sombras; Gran Río conserva cobertura verde densa
y caminos; Manglares conserva musgo y helechos; Desierto mantiene relieve y
sombras de dunas; Volcanes mantiene roca/ceniza y lava; Cañón mantiene ribera,
estratificación, agua y cultivos. El HUD está presente. No son pares contra main.
Las pequeñas diferencias de píxeles entre repeticiones quedan registradas en los
resúmenes: no se afirma identidad exacta ni se deduce su causa sin aislarla.

## Recomendación y límites

Conservar las seis selecciones artísticas. La referencia diurna ya cargada no
aporta un motivo para reducir la vegetación aprobada. Tampoco demuestra que se
hayan eliminado los picos de streaming o que todos los biomas sostengan 60 FPS.
Manglares sigue siendo el más costoso de estas escenas, alrededor de 22 ms GPU.
La variación pequeña entre dos repeticiones no constituye una mejora respecto
a mediciones antiguas hechas con otras cámaras o condiciones.

Quedan por completar bajo este protocolo la noche y calidad baja, y reconciliar
la evidencia de movimiento/simulación con la receta final. Las validaciones
previas de movimiento son complementarias; no se renombran como benchmarks
actuales. La matriz diurna cierra únicamente este hueco de evidencia y no el
objetivo global. No se modifica main, materiales, densidad ni reglas del juego.

## Reproducción

Vite en 5190; ejecutar por bioma `run-current-resident-cost.py --biome <nombre>`
y `summarize-current-resident-cost.py --biome <nombre>` desde tools/experiments.
El runner se niega a sobrescribir informes; usar una ubicación nueva para otra
serie. Mantener las ejecuciones en serie. Los resúmenes enlazan por nombre con
los JSON originales y sus PNG del mismo prefijo.
