# Sabana/712: campaña de 30 noches, política `good`

Esta evaluación usa el juego y la política de producción, sin alterar economía, daño ni incursiones. La revisión de juego es `c4daa72348fcd0624e125d6beaaaca35c35fded0`; la revisión del runner de QA es `c3d621d3318b49e410b883f7653ae1717462dbbb` más la opción `--continuous` descrita abajo. Semilla 712, bioma Sabana, cultura Mapungubwe.

## Ejecución con recarga de incursiones

Comando: `node tools/experiments/compare-active-farm-14-nights.mjs 30 good`.

El runner tenía `reloadRaids=true` por defecto: serializa y restaura la partida al comenzar cada incursión. Esta prueba es útil para supervivencia y estrés de persistencia, pero **no representa una campaña de balance estrictamente continua**. La traza cruda está en [good30-reloaded-c3d621d3.jsonl](good30-reloaded-c3d621d3.jsonl), SHA-256 `01c1be3a26bbad0b1e5c77d466f5975574919deb8db46ae82aa192d2d4ac606b`.

Terminó con `result=defeat` en la noche 29: cero cultivos vivos, 23 monedas y el único centro a 232/600 HP. La derrota se activó al cerrar la noche por la comprobación de `dawnMinimum`; las 23 monedas estaban por debajo incluso de la reserva mínima de contratación de 30. El máximo simultáneo fue de 151 cultivos vivos. Los 29 días acumularon 389,67 s en `Game.tick` y 11,07 s en decisiones del jugador virtual; el día 19 fue el más costoso para `Game.tick` (36,17 s). Son tiempos observados de una sola ejecución, no un benchmark A/B. Hubo 161 eventos `CropDestroyed`, 179 `StructureRuined` y 322 `AnimalRouteUnavailable`; estos contadores no prueban por sí solos la causa estratégica de la derrota.

## Ejecución continua

La opción `--continuous` pasa `reloadRaids=false` al runner y anota `mode=continuous` y el número de recargas en la salida final. Mantiene sin cambios el modo anterior para reproducir las trazas históricas.

Comando: `node tools/experiments/compare-active-farm-14-nights.mjs 30 good --continuous`.

La traza completa está en [good30-continuous-c3d621d3.jsonl](good30-continuous-c3d621d3.jsonl), SHA-256 `26f1e58af7c8ebb0c2a81561eae6254aae18b749a2153675cd231e6851fcc1d4`. Terminó el horizonte de 30 noches con `result=null`, `completedNights=30` y `reloads=0`: no es una victoria de campaña. El cierre de la noche 30 dejó cero cultivos vivos, 164 monedas y el centro a 318/600 HP; hará falta observar las jornadas siguientes para comprobar si se recupera. El máximo simultáneo fue de 151 cultivos vivos. `Game.tick` acumuló 481,94 s y las decisiones 27,10 s; el día 14 fue el más costoso para `Game.tick` (43,83 s). Hubo 292 eventos `CropDestroyed`, 216 `StructureRuined` y 302 `AnimalRouteUnavailable`.

Las trayectorias diarias se separan por primera vez en la noche 12 (120 cultivos y 762 monedas con recarga; 84 cultivos y 830 monedas sin ella). Por eso **la diferencia de tiempos no mide el coste de serializar/restaurar**: ambas ejecuciones terminaron simulando cargas diferentes. Esta discrepancia requiere una prueba de persistencia dirigida para distinguir estado derivado reconstruido, decisiones del bot e invalidación de rutas. Ninguna de las dos ejecuciones certifica que la política pueda ganar 100 noches.

## Horizonte continuo ampliado a 60 noches

Comando: `node tools/experiments/compare-active-farm-14-nights.mjs 60 good --continuous`. La traza está en [good60-continuous-c3d621d3.jsonl](good60-continuous-c3d621d3.jsonl), SHA-256 `b9298d4fe1dbf0a93b1a90ac7a1dd6f71674996479c7e593dbdc043c90ac5626`.

Terminó antes del horizonte: la fila del día 32 registra `result=defeat`, `completedNights=31` y `reloads=0`, con cero cultivos vivos, 20 monedas y ningún centro operativo. El día 31 conservaba un centro a 252 HP y 50 monedas, pero no hubo nueva plantación. El registro no explica por sí solo si el impedimento fue económico, laboral o espacial; requiere captura del estado y de las decisiones del bot para atribuirlo.

Las primeras 30 filas coinciden con la ejecución continua de 30 noches en cultivos vivos, dinero, plantaciones y destrucciones (0 discrepancias en 30 días); los tiempos de CPU difieren por ejecución. Esto demuestra reproducibilidad de esos resultados diarios en la misma versión y semilla, sin afirmar equivalencia de todos los estados internos.
