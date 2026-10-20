# Campaña nativa tras la separación de trabajadores

El 20 de octubre de 2026 se ejecutó Sabana/Mapungubwe/712 con la estrategia `good` y la política laboral `legacy` sobre `main` `44da3cac6b883685dc45e52bc717648f8022f4e5`. El WASM de producción tiene SHA-256 `0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`. El checkout no tenía modificaciones registradas. La corrida previa de 14 noches utilizó `11ed124cb`, cuyo árbol es idéntico al del merge `44da3cac`. Los comandos usaron exclusivamente reglas y compras normales, sin crédito QA ni cambios de balance.

| Horizonte solicitado | Resultado observado | Dinero | Cultivos vivos | Trabajadores | Centro | Incursiones finalizadas | Entregas físicas |
| ---: | --- | ---: | ---: | ---: | --- | ---: | ---: |
| 14 noches | Horizonte alcanzado, `result=null` | 949 | 126 | 23 | 600/600 PV | 14 | 1.464 |
| 30 noches | Horizonte alcanzado, `result=null` | 388 | 46 | 9 | 600/600 PV | 30 | 2.738 |
| 100 noches | Derrota tras 44 noches | 27 | 0 | 1 | 402/600 PV | 44 | 3.011 |

La prueba de 100 noches terminó por la condición económica `dawnMinimum`: tras el amanecer de la noche 44 no quedaba ningún cultivo y 27 monedas no permitían costear otra jornada. El centro no estaba destruido. Hubo 906 destrucciones de cultivos y 186 eventos `ActorMobileCollisionRecovery` acumulados. El informe del runner registra cero incidencias de incursión; esto no demuestra que toda trayectoria individual estuviera libre de solapamientos. El diagnóstico separado en [worker-mobile-recovery](worker-mobile-recovery/README.md) muestra esa limitación.

La estrategia solicitó defensas, pero no compró ninguna pieza de muralla en esta campaña: las cotizaciones completas quedaron fuera de presupuesto. Tampoco efectuó reparaciones. Por tanto, la derrota describe esta política económica y defensiva concreta; no refuta las victorias de 100 noches de otras políticas y revisiones, ni certifica que la versión actual pueda ganarse con esta estrategia.

Los 30 primeros registros diarios de las corridas de 30 y 100 noches coinciden exactamente en día, dinero, plantilla, siembras, entregas, destrucciones, cultivos vivos y tareas pendientes. El prefijo de 14 noches comparte el mismo árbol fuente y reproduce su cierre conocido. Los tiempos de CPU no son un A/B de algoritmos: `Game.tick` acumuló 155,77 s hasta la noche 30 y 171,63 s hasta la derrota en la corrida de 100; las decisiones acumularon 8,38 s en esta última. Las ejecuciones se hicieron en momentos distintos y con cargas de trabajo divergentes.

Reproducir desde ese commit, con una carpeta de salida nueva para cada intento:

```sh
node tools/run_native_campaign.mjs --out test-results/post-worker-good30 --days 30 --seed 712 --strategy good --biome sabana --culture mapungubwe
node tools/run_native_campaign.mjs --out test-results/post-worker-good100 --days 100 --seed 712 --strategy good --biome sabana --culture mapungubwe
```

El runner escribe `source.json`, `days.jsonl`, `report.json`, `receipt.json` y el estado comprimido. `observed-native-defeat` es un resultado válido del juego y produce código de salida 2; `incomplete-harness-error` indica una prueba técnica inconclusa y debe tratarse por separado. La prueba responsable de 100 noches en CI se lanzó adicionalmente para comprobar una política distinta sobre el mismo `main`; su resultado no forma parte de esta tabla.
