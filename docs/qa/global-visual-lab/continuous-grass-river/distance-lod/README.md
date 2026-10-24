# Gran Río: LOD por distancia real a cámara

Variante QA independiente, derivada de aa9073c28. No sustituye el piloto ni modifica Sabana o el viento 8×.

La selección de geometría refinada y la interpolación de hojas usan distancia 3D a cámara. El radio de cobertura y su desvanecimiento conservan distancia horizontal. No cambia la distribución, máscaras, ocupación o exclusión de agua.

## Evidencia visual

12 capturas reales, dos variantes, tres cámaras, día/noche; media, semilla 712, 1280×720. Cada variante arranca en una página nueva. Cámara/objetivo/hora y número total de módulos coinciden en los seis pares. Sin errores WebGL ni overflow. WebP sin pérdida verificado contra PNG.

| Cámara | Triángulos originales | Distancia 3D | Módulos en ambas |
|---|---:|---:|---:|
| Cercana | 199580 | 198332 | 9146 |
| Normal | 258388 | 170508 | 8528 |
| Elevada | 341656 | 91640 | 11455 |

[Normal](game-comparison.png) · [Elevada](elevated-comparison.png) · [Cercana](close-comparison.png) · [Datos](captures-media.json).

Inspección visual: se conserva la cubierta continua en normal y elevada; el patrón de fibras cambia ligeramente. La imagen elevada nocturna mantiene la integración de sombra. No se declara equivalencia perceptual ni ausencia de popping con imágenes estáticas.

## Decisión y límites

Conservar como candidata independiente. Pendientes: GPU/CPU aislados, vídeo con ascenso/descenso de cámara y viento, validación baja y streaming. La reducción de triángulos no demuestra por sí sola aceleración. La revisión interactiva estaba abierta durante las capturas; no se usan sus tiempos como benchmark. El objetivo global sigue abierto.

La primera ejecución del comparador desmontaba/reutilizaba un helper con referencias residuales y produjo cobertura vacía. Esas capturas fueron invalidadas y reemplazadas; el comparador final usa páginas independientes y falla si falta cobertura. No se atribuye ese fallo al LOD ni se afirma haber reparado el ciclo de vida general del helper.

Reproducir: `node tools/experiments/capture-continuous-grass-river-distance.mjs` con Vite del worktree en 5190. El script genera PNG y manifiesto; los WebP publicados se convierten sin pérdida posteriormente.

## Medición aislada posterior

Intel UHD 0x9A60, ANGLE D3D11, media, 1280×720. Revisión interactiva cerrada y comprobación de procesos antes de medir. Orden original/distancia/distancia/original, páginas independientes; 30 renders de calentamiento y 120 muestras por bloque. 16 bloques, **1.920 muestras GPU válidas**. Misma cámara, hora y número de módulos; sin errores, overflow o disjoint. Mundo pausado, CPU de render y GPU de todas las pasadas; no equivale a una partida completa.

| Vista | Luz | GPU original / distancia ms | Delta ms | Deriva original ms | CPU original / distancia ms |
|---|---|---:|---:|---:|---:|
| Normal | Día | 15,613 / 15,564 | −0,049 | +0,518 | 3,10 / 3,15 |
| Normal | Noche | 17,079 / 16,459 | −0,620 | +0,600 | 3,10 / 3,20 |
| Elevada | Día | 12,960 / 11,888 | −1,072 | −0,095 | 3,60 / 4,00 |
| Elevada | Noche | 13,889 / 12,900 | −0,989 | +0,051 | 3,20 / 3,90 |

El ahorro elevado resulta más sólido que el normal: su deriva de control es pequeña frente al delta. Normal diurna no mejora de forma demostrable; normal nocturna tiene deriva comparable al ahorro. La CPU de render aumenta en elevada y debe seguir observándose; no se presenta como mejora gratuita. Los draw calls totales pasan de 53 a 52 en elevada y permanecen en 70 en normal. No extrapolar a baja, otras regiones o dispositivos.

[Datos completos](benchmarks-media.json) · [Resumen validado](timing-summary.json). Reproducir con `node tools/experiments/measure-continuous-grass-river-distance.mjs` y `python tools/experiments/summarize-continuous-grass-river-distance.py`.

La primera ejecución se abortó por servir un módulo sin transformación Vite. Se corrigió la ruta para obtener el módulo transformado del servidor y se repitió la secuencia completa. No se mezclan muestras de aquella ejecución parcial.

## Secuencia de cámara y viento

[Vídeo comparativo](camera-comparison.mp4): izquierda original, derecha distancia 3D; seis segundos a 30 FPS codificados offline, no rendimiento de reproducción en tiempo real. Ascenso y descenso de 12 a 32 metros sobre el objetivo, viento 8×. 180 fotogramas por variante, poses y conteos de módulos iguales en cada par; sin errores WebGL ni overflow. [Fotogramas de control](camera-contact.webp), [registro original](camera-original.json), [registro candidato](camera-distance.json).

Se inspeccionaron los fotogramas de inicio, máxima altura y final: mantienen continuidad de cubierta. Esto no acredita ausencia de todo salto temporal entre fotogramas. La revisión completa de transiciones, perfil bajo y streaming sigue pendiente; no se promueve automáticamente la variante. Script: `node tools/experiments/video-continuous-grass-river-distance.mjs`.
