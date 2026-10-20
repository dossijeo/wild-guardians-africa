# Llegada de trabajadores a la entrada del poblado

En Sabana/Mapungubwe/712, con apertura de Wild Engine, intenciones nativas y estrategia `good`, seis trabajadores huían en fila hacia `(60, 0)` el día 13. Entre los segundos 540 y 570 ninguno avanzaba. El primero, `worker-13000`, estaba a 0,228 m del punto de entrada, conservaba una ruta nativa activa y su tramo final era transitable para el terreno. La comprobación dinámica rechazaba el movimiento exacto hasta `(60, 0)` porque ese punto quedaba a menos de 0,56 m del trabajador siguiente. Los cinco que venían detrás esperaban al primero. Una ruta de otro trabajador estuvo ausente unos tres segundos y se recuperó; ese episodio no explica la cola sostenida.

Con el planificador nativo de intenciones activo, la llegada al poblado acepta el centro del trabajador dentro de su radio corporal (0,28 m por defecto) del punto de entrada **solo si el segmento final supera la comprobación estática de Wild Engine**. La transición lo sitúa en la coordenada exacta de entrada y lo retira del conjunto de obstáculos móviles en la misma frontera de tick. Esta regla se aplica únicamente a `fleeing`, `returning` e `incapacitated`; las tareas, los ataques, las rutas ordinarias y el navegador JavaScript heredado conservan su criterio de llegada. La intención nativa de regreso se libera y el trabajador pasa a `home`. Una muralla o terreno inválido en esos centímetros sigue impidiendo la llegada. La prueba dirigida verifica ambos lados de la regla y que el siguiente trabajador no se desinstancia anticipadamente.

Comparación con la misma sonda `probe-worker-overlaps.mjs`, 14 noches, semilla 712, Sabana/Mapungubwe, estrategia `good`, política nativa (`createSpatialCampaignOpening`, `nativeIntents:true`, `nativeWallPlans:true`, `reloadRaids:false`). Base `aa1baf3a9`; variante `0b6a0209d`. Ambas usan el mismo WASM SHA-256 `0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`.

| Medida | Base | Entrada por radio |
| --- | ---: | ---: |
| Noches completadas | 14 | 14 |
| Ticks con solapamiento | 154 | 72 |
| Ticks con solapamiento tras 30 s | 117 | 35 |
| Ticks con solapamiento, día 13 | 91 | 20 |
| Último solapamiento, día 13 | 600 s | 390 s |
| Recuperaciones móviles | 161 | 164 |
| Entregas | 1.314 | 1.317 |
| Cultivos vivos | 132 | 145 |
| Monedas | 873 | 899 |

En la variante no quedaban trabajadores a menos de 5 m de esa entrada en las muestras de los segundos 540, 570 y 590 del día 13. La medición se hizo antes de restringir explícitamente la nueva regla al flujo nativo; esa restricción no cambia el flujo Wild Engine medido. Los 57 tests dirigidos de movimiento, regresos, logística y política intensiva pasan tras la restricción, incluidos los escenarios heredados cuyos resultados económicos debían preservarse. No cambia el balance, el daño, la navegación nativa ni el presupuesto de movimiento. Los resultados económicos son observaciones de una campaña divergente, no una afirmación de equivalencia de hashes. `Game.tick` acumuló 95,92 s en la base y 83,46 s en la variante, pero una corrida por brazo y las trayectorias distintas no permiten atribuir esa diferencia de tiempo al cambio.

Reproducción:

```sh
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine
node --test tests/actor-motion.test.js
WILD_ENGINE_NATIVE_ROUTE_WASM=src/world/wild-engine/spatial-savanna.wasm node --test tests/spatial-native-worker-home.test.js
```

Las apariciones simultáneas de trabajadores y la recuperación móvil que puede solapar cuerpos durante un intervalo acotado siguen siendo problemas separados. La tolerancia de entrada no los resuelve ni autoriza atravesar obstáculos estáticos.
