# Filtro de sombras de carga: original frente a cuatro muestras

**Decisión: no promover esta simplificación. Conservar las sombras originales.** La candidata produce bordes más duros y escalonados en el suelo. No se descarta la mejora visual de sombras; se descarta este filtro concreto, cuya calidad es inferior.

Se comparó el diorama real de la prueba aislada, mismos modelos, cuatro plantas, cámara, resolución 1280×720, semilla 712, mapa de sombras 512², día 150/noche 350. Ninguna geometría o draw eliminado.

## Corrección de la hipótesis inicial

El suelo transparente no recibe AfricanToon y usa Three PCFSoft: nueve términos ponderados que implican **16 lecturas de profundidad empaquetada**. El maíz usa nueve consultas nativas con comparación hardware. Los archivos `nine-*` conservan el nombre de la hipótesis inicial: representan el filtro ORIGINAL de cada material, no nueve lecturas en todos ellos. `four-*` usa cuatro consultas por material. El harness inicial abortó al buscar el filtro nativo en el suelo; se corrigió identificando ambas rutas reales, sin cambiar la iluminación del material.

La conmutación es por uniform en el mismo programa: posibles costes del compilador/ramificación pertenecen a esta prueba; no generalizar a todas las implementaciones de cuatro muestras. Se mantiene la compensación de profundidad original en la ruta nativa.

## Medición ABAB

Intel UHD / ANGLE D3D11, 240 queries válidas, 40 frames de calentamiento por bloque, 30 muestras, cámara fija y reloj de viento idéntico. CPU solo render; no FPS ni duración real de carga.

| Estado | GPU original, medianas de bloques | GPU cuatro muestras |
| --- | --- | --- |
| Sin viento | 4.174 / 4.268 ms | 6.645 / 7.947 ms |
| Con viento | 5.120 / 4.631 ms | 8.788 / 6.965 ms |

Sin viento: 6 draws / 16002 triángulos en ambos. Con viento: 7 / 29882. Cero queries disjoint. La variante no muestra ahorro en este ensayo. La vigilancia parcial detectó otras cargas de 4–13 %: no atribuir un sobrecoste exacto ni asegurar causalidad de hardware sin repetir con programas separados y monitorización completa.

Capturas inspeccionadas: pérdida de suavidad en suelo diurno; las diferencias nocturnas son menores. `pixel-audit.json` compara con la variante previa y cuantifica diferencias sin usarlas como criterio de calidad. No se validó movimiento visual continuo, todos los estados de crecimiento ni capacidad completa.

## Reproducción

Vite en 5190; `node tools/experiments/capture-loading-pcf-20261021.mjs`. La herramienta reemplaza las salidas. Solo QA y sesión pausada; conserva el aislamiento de proxies de la prueba anterior. No cambios de producción.

Siguiente dirección: investigar una ruta de comparación hardware para el suelo manteniendo suavidad, o una política de actualización medida. No eliminar sombras ni sustituirlas por contacto circular para cumplir un presupuesto artificial.
