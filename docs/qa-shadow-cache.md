# Caché de sombras nativas

Se conserva el mapa de profundidad y su copia empaquetada de DEST cuando los inputs de la pasada no han cambiado. La comparación incluye los casters visibles, matrices, geometría/versiones, instancias activas, poses de huesos, morphs, texturas de recorte/desplazamiento y clipping, cámara/luz y tamaño/identidad del target. Las subidas repetidas de una matriz de instancias idéntica no fuerzan una pasada. Se conservan PCF, luz, escalas y estado lógico.

Los proxies de props se incorporan **antes** de comparar y se retiran incluso ante fallo; los wrappers se liberan en orden inverso. Crecimiento y puentes declaran reloj/viento/dimensiones, y DEST declara daño, agujeros, ruido y deformación. Sus uniformes de color/cámara reescritos en otras pasadas no falsean esa comparación. Un shader de profundidad o callback desconocido, líneas/puntos y VSM no se reutilizan: se recalculan. No se almacenan resultados de una pasada que arroja una excepción. La pérdida/restauración de contexto y las peticiones explícitas de actualizar sombras invalidan el mapa.

Regresión local inicial **612/612**, cero fallos/omisiones, 304,95 s. Después de evitar calcular la firma al desactivar la caché y añadir guardas de compilación/tamaño del target, pasan **18/18 dirigidas**. Build final y paquete web aprobados: 554 archivos, 379.659.379 bytes, 794 enlaces relativos y 20 GLB, sin duplicados originales. Código publicado en `f7420fd`; su CI 37071625305 estaba en curso al redactar este informe. El CI anterior `ef7cf27`, 37069616564, terminó correctamente.

La fixture permite alternar la caché conservando el muestreo de sombras. Sabana/Mapungubwe, semilla 712, media, reloj simulado fijo, Intel UHD/ANGLE, canvas 1600×900 y DPR 1,25. Cada ensayo mide 180 frames tras 30 de calentamiento. Los contadores de caché incluyen ambos períodos.

| Ensayo final de poblado | Caché activa | Caché desactivada |
| --- | ---: | ---: |
| Pasadas de sombra / reutilizaciones, 210 frames | 1 / 209 | 210 / 0 |
| Calls por frame medido, todas las pasadas | 111 | 275 |
| CPU media / p95, ms | 13,31 / 15,90 | 12,29 / 14,50 |
| GPU media, ms | 40,57 | 49,66 |
| Cadencia observada, FPS | 21,87 | 17,82 |

Ambos ensayos conservan el estado lógico y completan 180 queries GPU válidas, sin disjoint, pendientes, descartes, pérdida de contexto o errores. El escaneo tiene coste CPU; estos dos ensayos secuenciales no aíslan temperatura, carga ni planificación y no garantizan una ganancia de FPS. Los cuatro ensayos anteriores se conservan también: el primer poblado produjo GPU 56,99/66,57 ms y CPU 12,81/13,01 ms. En aquella revisión, desactivar la reutilización aún calculaba la firma; la versión final la omite. Esa variabilidad no se oculta.

Los personajes quietos (cuatro trabajadores y cinco bestias, escala nativa 1) reutilizan 210/210 pasadas; las calls pasan de 267 a 135. La vista oculta props/poblado y no representa una incursión completa. Avanzar la pose 0,1 s y cambiar crecimiento/viento o daño genera una nueva pasada. Se comprueban cambios efectivos 1024→2048→1024, retención/liberación de chunks, y día/noche. DEST mantiene el mapa empaquetado; su última pasada de humo desactiva temporalmente sombras y puede dejar el diagnóstico PCF en 0 después de haber dibujado color correctamente. Consola final sin avisos/errores.

Comparación RGB de capturas en (0,302)-(1280,650), **445.440 píxeles**, excluyendo encabezado y resumen de rendimiento: personajes, cero diferencias; primer poblado, 280 píxeles distintos y máximo 4 niveles por canal; poblado final, 670 píxeles distintos y máximo 14. Se conservan todas las capturas/JSON, sin afirmar identidad binaria del poblado ni atribuir la diferencia al driver. No acredita la matriz completa de culturas/biomas, móvil, memoria GPU residente ni rendimiento durante ataques con VFX activos. Los efectos con profundidad no declarada siguen recalculándose de forma conservadora.

Evidencia en `docs/qa/shadow-cache/`: seis informes de rendimiento, comparaciones RGB, capturas y checks finales. Continúan pendientes otros puntos del Plan Maestro, incluido el origen flotante del terreno.
