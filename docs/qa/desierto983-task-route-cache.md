# Desierto 983, día 15: consultas repetidas al reservar tareas

Fixture: `tests/fixtures/desierto983-d15-partial-state.json.gz`, procedente de la campaña nativa del laboratorio de balance (fuente `1082d98ef63fa0ffecc70284df2fcbfa278494fe`). SHA-256 del JSON descomprimido: `a4ce4f042c6c153d13f92623ee6622456f42ba7da9bc17ec0f8deac01d559423`. Comparación desde `origin/main` `4cf8f841ee8ca14964d5e2661a585bfd68408c5c`, con 20 ticks de un segundo y residencia de chunks de radio 1.

La reserva de tareas consultaba `nav.path` para cada trabajador y tarea genérica en cada subpaso. En este estado, las consultas bloqueadas repetían el mismo origen, destino y topología durante muchos subpasos. El planificador de movimiento ya dispone de `workerPath`, que conserva pruebas negativas sólo mientras no cambien topología ni residencia. La reserva usa ahora esa misma consulta para trabajadores vivos; los adaptadores sin `workerPath` mantienen `path`.

La alternancia A/B/B/A, con procesos frescos y el mismo fixture, dio:

| Corrida | 20 ticks (ms) | `workerPath` | `path` | Rutas nativas bloqueadas (razones 6+7) |
| --- | ---: | ---: | ---: | ---: |
| A1: main | 4670.4 | 8400 | 32835 | 75264 |
| B1: cambio | 2207.6 | 40400 | 835 | 3282 |
| B2: cambio | 2052.7 | 40400 | 835 | 3282 |
| A2: main | 3708.9 | 8400 | 32835 | 75264 |

Las cuatro corridas terminan con el mismo SHA-256 del estado serializado: `f126cc1201a5b37d7b3769dc29b3a0795fdb1331305c026cfb1aed7eab251c5d`. La regresión `tests/spatial-task-route-cache.test.js` compara dos simulaciones de dos ticks desde el snapshot y exige estado serializado idéntico con menos de una cuarta parte de las consultas nativas. Las pruebas existentes del adaptador cubren la invalidación de pruebas negativas cuando cambia la topología. Este cambio reduce trabajo repetido; no abre el perímetro que deja sin ruta a los trabajadores de este snapshot.
