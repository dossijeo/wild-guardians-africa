# Reparación: puntos de servicio físicamente ocupados

La PR #44 hizo que `repairRoute` probara todos los puntos alrededor de una muralla cuando el primer camino nativo es inconcluso. Esto evita descartar una alternativa válida, pero en el estado Desierto/983 del día 7 repite búsquedas hacia puntos donde el trabajador no puede situarse. `actorCanStand` devuelve falso también para un chunk descargado; por eso este experimento confirma primero la residencia de toda la huella del trabajador. Solo entonces descarta el punto no transitable. Una residencia desconocida sigue dejando la tarea pendiente.

El benchmark `node tools/experiments/benchmark-repair-service-points.mjs docs/qa/repair-route-pruning/ab-benchmark.json` carga la captura congelada, calienta el núcleo y alterna A/B/B/A y B/A/A/B durante ocho pares. En cada brazo repite 50 veces las dos reparaciones afectadas desde el mismo trabajador, sin modificar el estado físico ni el balance. Los 100 resultados de cada brazo siguen siendo `unknown`, sin ruta falsa.

| Variante | Búsquedas nativas por 100 consultas | Mediana de ocho pasadas |
| --- | ---: | ---: |
| Todos los puntos | 400 | 107,15 ms |
| Descartar puntos no transitables con residencia confirmada | 250 | 100,16 ms |

La reducción de búsquedas es del 37,5 % en este caso; la mediana de tiempo baja un 6,5 %. Es un microbenchmark de dos tareas, no una estimación de la mejora de una campaña completa ni del juego interactivo. Las pruebas focales, las 186 pruebas jugables y la compilación web pasaron. Se mantiene el comportamiento normal de reparación y los errores distintos de `SpatialChunkUnavailable` siguen propagándose.

## Campaña sostenida y decisión

Se ejecutó la misma política defendida Desierto/983 durante 21 noches sobre tres variantes, sin modificar economía, incursiones ni estrategia. Los archivos `input.json`, `config.json`, `summary.json` y las 21 filas diarias de cada variante están en [`campaigns/`](campaigns/). La huella SHA-256 de las filas diarias excluyendo solo `gameTickMs` coincide en las tres: `111d6b3f8429fadd50f70a464e4f255812b3dd3961263d6f5e2b12a3ded51f8d`.

| Variante | Commit de la ejecución | Noches | Cultivos / monedas finales | `Game.tick` acumulado |
| --- | --- | ---: | ---: | ---: |
| Diferir rutas inconclusas | `75daffa7` | 21 | 149 / 965 | 73,15 s |
| Probar todos los puntos | `17ac6595` | 21 | 149 / 965 | 85,29 s |
| Comprobar ocupación y residencia | `a06ded8c` | 21 | 149 / 965 | 84,80 s |

Ninguna variante registró reparaciones pagadas; el trazado del jugador virtual deja las piezas dañadas detrás de una pendiente. La diferencia de 0,49 s entre las dos últimas campañas (0,57 %) es pequeña y las tres ejecuciones no son una comparación AB/BA completa del host. Por tanto, **no integrar esta poda en `main`**: el ahorro local de consultas no ha demostrado una mejora sostenida que compense las comprobaciones y la lógica adicionales. Conservar la rama y estos resultados como experimento negativo. La corrección de `unknown` ya integrada en `main` permanece vigente.
