# Crecimiento sin arrays temporales de riego

Referencia: `312a2ca`, `src/simulation/crops.js`. La simulación mantiene el mismo orden de checkpoints, agotamiento de tolerancia, crecimiento mágico, penalización de plaga y vencimiento del bonus de temporada. Sustituye los arrays de `filter`/`map` y el spread del mínimo por un contador y un mínimo escalar; solamente recorre los riegos para incrementar su espera cuando existe deuda. No introduce cachés persistentes ni modifica guardados, reglas, tasas o FIFO.

La sonda compara ambos estados completos después de 9.600 pasos con las ocho especies, pasos de 0,1/1/17 segundos y saltos grandes, riego manual/mágico, deuda, temporada, plaga y reconstrucción JSON. También compara 500 pares de lotes de 1.200 plantas, alternando el orden de ejecución. Cada medición contiene diez pasos de 0,1 segundos; clones, comprobaciones y hashes quedan fuera del tiempo medido. Los hashes de fuentes y los tiempos individuales están en los JSON.

Medianas CPU de los dos ensayos finales, en ms por lote de diez pasos:

| Estado | Referencia, primero/repetición | Cambio, primero/repetición |
| --- | --- | --- |
| Crecimiento | 3,35 / 4,72 | 2,28 / 3,41 |
| Tolerancia pendiente | 8,62 / 9,93 | 3,43 / 4,28 |
| Magia activa | 3,28 / 4,58 | 2,74 / 3,44 |
| Maduro | 0,89 / 0,92 | 0,82 / 0,85 |
| Primer riego pendiente | 1,10 / 1,19 | 1,02 / 1,11 |

`pilot.json` conserva el primer candidato: recorría de nuevo los riegos incluso sin deuda y su mediana con magia empeoraba ligeramente. Ese candidato se corrigió antes de adoptar el cambio. `final-first.json` y `final-repeat.json` corresponden al código final; la repetición incluye las 9.600 comparaciones de checkpoints.

Límites: prueba aislada de CPU, no frametime, FPS, RAM ni campaña integrada. Los dos procesos de campañas largas permanecían activos; los tiempos absolutos varían y no se presenta un porcentaje de mejora del juego completo. Las rutas maduras y sin primer riego retornan antes del código modificado: sus pequeñas diferencias son ruido de control, no una optimización atribuible.

Validación: 59 pruebas dirigidas de reglas, eventos, cadenas físicas, reconstrucción nativa de los ocho cultivos y FIFO correctas. Tras la corrección final se repiten las 44 de reglas/eventos/cadenas, además de build y paquete web: 641 archivos, 859 enlaces relativos, 20 GLB runtime. La comprobación del paquete no acredita experiencia móvil ni calidad visual.

Reproducción: extraer los bytes de `git show 312a2ca:src/simulation/crops.js` a un archivo temporal conservando LF; ejecutar `node tools/benchmark_crop_water_scan.mjs <archivo-referencia> <salida.json>` desde la raíz. La sonda importa las reglas actuales para ambas versiones y aborta ante cualquier diferencia de estado.
