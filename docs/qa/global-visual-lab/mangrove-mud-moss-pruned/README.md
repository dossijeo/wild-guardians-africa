# Mezcla barro/musgo: preparación sin trabajo duplicado

Conservar la preparación optimizada en el helper QA. No cambia el shader, imágenes de origen, posiciones, índices ni receta artística. La candidata sigue sin integración ni aprobación GPU.

La caché local reutiliza resultados para coordenadas x/z exactamente iguales, sin cuantizar. Se libera al terminar cada chunk. La búsqueda de contorno procesa primero el rectángulo más cercano y omite los restantes únicamente cuando su distancia mínima no puede mejorar la mejor distancia a segmentos. No reduce la resolución ni ignora arbitrariamente parches.

## Comprobaciones

Doce parejas contra la receta anterior, cámaras/horas/draws/triángulos iguales, media/baja y día/noche. Once son RGB idénticas. La vista normal diurna media tiene cuatro píxeles distintos (máximo14/255), en coordenadas(640,56),(639,57),(640,57),(638,58); no se declara identidad absoluta ni se atribuyen a la optimización sin aislar su causa. MAE de esa imagen0,0000228. Cero errores registrados. [Comparación](comparison.json), [capturas y métricas](captures.json).

Capturas: [día media](media-day-0.webp), [oblicua media](media-day-1.webp), [noche baja](baja-night-0.webp). Doce WebP RGB sin pérdida, verificados contra PNG.

## Preparación medida

Valores acumulados hasta las capturas normal diurna/nocturna, que incluyen preparación de nuevos chunks al cambiar cámara. Son ejecuciones sucesivas, no ABBA controlado de CPU; no se atribuye toda la diferencia de tiempo al algoritmo. El contador de operaciones sí verifica que se evita trabajo.

| Calidad | Original inicial / posterior | Solo caché inicial / posterior | Caché y descarte por distancia inicial / posterior |
| --- | ---: | ---: | ---: |
| Media | 423 / 569,4ms | 281,4 / 362,4ms | 157,9 / 212,0ms |
| Baja | 459,7 / 586,0ms | 217,7 / 276,9ms | 179,0 / 234,1ms |

Primera captura:29 builds,113283 vértices;89977 hits y23306 únicos. Se evalúan279804 segmentos. Tras cámaras adicionales:39 builds,122277 hits,31701 únicos y380544 segmentos. El chunk máximo medido tarda12,3ms en media y10,8ms en baja. Todavía importa al streaming; no es preparación gratuita ni se ha distribuido en Worker.

Los atributos GPU conservan3.171.924bytes creados acumulados inicialmente; no es memoria residente. No cambian samplers, draws, triángulos o coste de shading. No se mide una mejora de GPU/FPS. La etapa de caché intermedia queda documentada en [sus datos](../mangrove-mud-moss-cached/captures.json).

## Siguiente puerta

Aislar la transición de borde del aclarado/brillo del interior antes de aprobar la dirección artística final. Después medir GPU y validar streaming/lifecycle de esa receta. No continuar refinando preparación por sí sola mientras queden decisiones visuales pendientes. El musgo repetitivo y la calidad global siguen abiertos.

Reproducir con WG_SAND_OUTPUT=docs/qa/global-visual-lab/mangrove-mud-moss-pruned y `node tools/experiments/capture-mangrove-mud-moss-blend.mjs`; luego `python tools/experiments/compare-mangrove-mud-preparation.py`. La comparación requiere los PNG de referencia anterior; esa receta está en commit2a356b877. El helper conserva options.cache=false para medir búsqueda exhaustiva, pero el capturador usa la optimizada por defecto. Los JSON históricos de caché son evidencia de una etapa anterior, no del helper actual.
