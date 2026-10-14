# Validación aislada del cambio de rutas de trabajadores

Este directorio contiene una comparación de una campaña nativa continua de
14 noches en Manglares/Mapungubwe, semilla 123, con el genoma candidato
`eee9529b306e0091` congelado. Es una prueba de rendimiento y paridad para
el cambio de Wild Engine `2486ba01076e8e221c3ec413167937a49b2fd401`,
no una búsqueda genética ni un ajuste de balance.

El worktree temporal partió de la PR #36 en
`de719e0bdda877fe4ee183fb7107f69db4f7b585` y aplicó sólo ese commit
runtime mediante cherry-pick (`723ff991e2de3ed0149236ce069b33d698c958c4`).
`stamp.json` registra ambos hashes, los genes, el SHA-256 del runner QA y el
SHA-256 del reporte baseline (`6efacb58…`). La rama de la PR #36 no se alteró.
El primer intento de arrancar este worktree no encontró `three` porque aún no
tenía `node_modules`; se enlazó la misma instalación usada por el laboratorio
y se lanzó la campaña. Aquel error de dependencias ocurrió antes de simular
ninguna jornada y no se contó como derrota.

El runner `tools/experiments/run-worker-ab-candidate14.mjs` llama a
`evaluateOne` sin recargas artificiales ni observador QA, guarda progreso por
jornada en `progress.jsonl` y el reporte nativo en `candidate.json.gz`
(archivo sin pérdida e índice SHA-256 en `archive-index.json`). Compara
todas las filas diarias salvo el tiempo medido y las síntesis de incursión con
`management-search/paired-14-manglares-123/evolved-manglares-123-14.json.gz`
(compresión sin pérdida; SHA del JSON original en `archive-index.json`).
No cambia genes, precios, daños, RNG, navegación física ni balance.

| Noches | Estado diario físico/económico | Incursiones | `Game.tick` baseline | `Game.tick` cambio |
|---:|---|---|---:|---:|
| 14/14 | Idéntico en las 14 filas | Idénticas | 139,805 s | 111,282 s |

El ahorro acumulado es **28,523 s (20,4 %)** en esta corrida. Ambos informes
terminaron con 905 monedas, 167 cultivos vivos y cinco destruidos; no hubo
resultado terminal ni error técnico.

| Día | Baseline `Game.tick` | Con cambio |
|---:|---:|---:|
| 1 | 0,7 s | 0,6 s |
| 2 | 1,5 s | 1,6 s |
| 3 | 1,7 s | 1,7 s |
| 4 | 2,1 s | 2,1 s |
| 5 | 2,1 s | 2,0 s |
| 6 | 2,4 s | 2,3 s |
| 7 | 3,5 s | 3,7 s |
| 8 | 3,3 s | 3,6 s |
| 9 | 17,8 s | 11,6 s |
| 10 | 28,7 s | 18,2 s |
| 11 | 26,8 s | 22,2 s |
| 12 | 32,4 s | 24,4 s |
| 13 | 6,9 s | 7,0 s |
| 14 | 10,1 s | 10,2 s |

La mayor mejora ocurre en los días 9–12, cuando el perfil previo había
observado muchas rutas fallidas de trabajadores. Los días 13–14 siguen siendo
costosos y no mejoraron en esta muestra. Esta única pareja de campañas permite
afirmar equivalencia de los campos diarios e incursiones comparados y una
mejora temporal observada; no estima variación entre repeticiones, rendimiento
de otros biomas ni viabilidad de 30/60/100 noches. No se inició una campaña
larga ni se fusionó la PR #36.
