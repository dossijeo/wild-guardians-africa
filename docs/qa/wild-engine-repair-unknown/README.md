# Reparación pendiente con conectividad nativa desconocida

La campaña experimental defendida Desierto/983, tras la noche 6 y sobre `42964418`, se detenía técnicamente al comienzo del día 7. `repairRoute` consultaba un punto de una muralla dañada y Wild Engine respondía `unknown` (`native-graph`, `missing: []`); el error salía de la reserva de tareas y detenía `Game.tick`. No era una derrota de la campaña.

La captura congelada `tests/fixtures/desierto983-pr42-d7-repair.json.gz` procede de la campaña de la PR #36 (`20ae09547d55253e384c4322df428b319d247e85`), sin editar su estado. El replay `node tools/experiments/replay-desierto983-repair.mjs 2 --ticks=50` carga sectores acotados y mantiene sus colisiones. El trabajador `worker-3519` alcanza ambos lados de la puerta automática `structure-3072`, pero el grafo no certifica una ruta a las piezas dañadas `structure-1586` y `structure-1869`: los puntos de servicio válidos pertenecen a otros componentes con frontera abierta. Cargar un radio de cuatro chunks alrededor tampoco resolvió la incertidumbre. No se convierte `unknown` en `blocked`, ni se inventa una ruta.

La reserva de tareas admite ahora un resultado pendiente distinto de una prueba física negativa. Una ruta nativa inconclusa deja la reparación sin trabajador y con `blocked: false`, para volver a consultarla en una pasada futura. Si una ruta asignada deja de poder resolverse, se libera la tarea sin cobrar la reparación ni mover al trabajador a través de obstáculos. Las excepciones distintas se siguen propagando.

La prueba `tests/spatial-repair-unknown.test.js` reproduce el `SpatialChunkUnavailable` original, comprueba la puerta y ejecuta 50 ticks sin fallo; las dos tareas siguen pendientes, sin asignación falsa. En el replay local, esos 50 ticks tardaron 65 ms de `Game.tick` aproximadamente. También se añadió una prueba de reserva de tareas que distingue explícitamente `unknown` de `blocked`.

Esto corrige la detención técnica. **No demuestra todavía que los dos tramos puedan repararse físicamente ni valida una campaña defendida de 21 noches.** Hay que repetir esa cohorte con el mismo jugador y parámetros antes de interpretar su balance.
