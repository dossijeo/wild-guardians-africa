# Cachés de navegación: decisión experimental

Rama `codex/wild-engine-wasm-cache-benchmark`, base original `020b6abcaa602d51823bd477dd3cdf4de73b1e26`, sincronizada después con `main` en `8e32ce0d` (incluye puertas graduales y presupuesto de QA Windows). No cambia economía, daño ni políticas del jugador virtual. El prototipo C++ se compila aparte: el WASM distribuido por el juego no contiene `nav_cached_*`. Los resultados previos a la sincronización permanecen en el commit `279152cf`; las tablas y JSON siguientes corresponden a la repetición sobre `main` actualizado.

## Decisión

**No centralizar todas las cachés topológicas en WASM con el prototipo medido.** La caché JS evita la llamada completa y es más rápida en las consultas calientes. La caché C++ no aporta una mejora sostenida clara de `Game.tick` que compense la migración, sus nuevas estructuras e invalidaciones. La corrección sí exige arreglar las cachés JS que sobreviven a un cambio de residencia: esta rama incluye esas invalidaciones y pruebas diferenciales. La autoridad del grafo sigue siendo Wild Engine; un resultado JS reutilizado sólo es admisible mientras coincidan las revisiones de topología *y* residencia.

Esta decisión no afirma que toda caché JS sea segura ni descarta una futura API nativa de consultas por lotes. El prototipo sólo cachea conectividad y rutas discretas exactas; no equivale a migrar la selección de objetivos ni las reservas dinámicas.

## Reproducción

En este host, `em++` está en WSL `/opt/emsdk`. Ejecutar el compilador con `wsl -e bash /mnt/c/Users/PC/source/repos/wild-guardians-wasm-cache-benchmark/tools/experiments/build-nav-cache-prototype.sh`. Después:

```
node tools/experiments/benchmark-nav-cache-abc.mjs 4
node tools/experiments/benchmark-nav-cache-call-overhead.mjs
node tools/experiments/benchmark-nav-cache-tick.mjs 2 2
node tools/experiments/check-nav-cache-coherence.mjs
node --test tests/watering-route-cache.test.js tests/raid-entry-residency.test.js tests/worker-fractional-connector.test.js tests/animal-route-clearance.test.js
```

Los JSON del directorio guardan entradas congeladas, SHA-256, orden ABCCBA/CBAABC alternado, tiempos individuales, firmas de resultados y hashes de estado. CPU: Intel i7-11800H, 16 hilos lógicos; Node 20.11.0. Las rutas y respuestas `unknown`/`blocked` se compararon exactamente entre A, B y C para las consultas discretas. En los ticks, el estado serializado terminó con el mismo hash para las tres variantes en cada fixture.

### Consultas discretas (128 pares por fixture y perfil)

Medianas en milisegundos para 128 consultas; primera pasada / pasada caliente. A recalcula en WASM; B memoriza el resultado exacto en JS; C consulta siempre WASM y memoriza allí. Las pasadas frías se hicieron con el grafo y JIT ya calientes, pero con cada caché vacía.

| Fixture, perfil, consulta | A | B | C |
| --- | ---: | ---: | ---: |
| Gran Cañón d6, trabajador, ruta | 1,753 / 1,684 | 1,782 / 0,003 | 1,830 / 0,036 |
| Sabana d13, facóquero, ruta | 2,214 / 2,240 | 2,272 / 0,003 | 2,499 / 0,026 |
| Manglares d10, facóquero, ruta | 9,877 / 9,556 | 9,581 / 0,003 | 9,233 / 0,037 |
| Desierto d15, trabajador, ruta | 1,367 / 1,428 | 1,400 / 0,003 | 1,428 / 0,026 |

Las otras doce combinaciones de perfil y tipo, incluidas conectividad, están en [`abc-low-level.json`](abc-low-level.json). La preparación inicial de chunks + navegación tardó aproximadamente 461 ms (Gran Cañón), 387 ms (Sabana), 1649 ms (Manglares) y 362 ms (Desierto); ese coste compartido no se atribuye a un cruce JS↔WASM. En la carga sintética de 250.000 consultas por pasada, un hit JS tardó alrededor de 1,7 ms tras el calentamiento y un hit en `unordered_map` WASM alrededor de 4,6 ms. Una llamada trivial WASM tardó alrededor de 1,2 ms. La consulta nativa fresca sobre un grafo vacío fue incluso más barata que la caché nativa, lo que demuestra que cachear no siempre ayuda.

### `Game.tick` (dos ticks, 12 ejecuciones por fixture)

Mediana en milisegundos. Los brazos son comparables y los hashes coinciden, pero la intervención A/B/C está en el punto `routeActor` y elimina la prueba JS preexistente de `workerPath`; otros subsistemas conservan sus cachés. Por tanto, **A no es una ejecución global del juego sin ninguna caché**. El fixture Gran Cañón no emitió consultas de ruta en estos dos ticks; sirve para las pruebas discretas y de coherencia, no para una conclusión sobre ticks.

| Fixture | A | B | C | Consultas `routeActor` | Hits JS B / hits nativos C (1.ª ejecución) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sabana d13 | 13,6 | 8,0 | 11,2 | 31 | 19 / 0 |
| Manglares d10 | 1731,3 | 1628,1 | 1644,8 | 469 | 437 / 1350 |
| Desierto d15 | 966,0 | 714,8 | 790,0 | 4875 | 4009 / 11647 |

Los contadores nativos incluyen llamadas internas a conectividad y pueden superar `routeActor`. En Manglares, el coste total del tick domina tanto que la diferencia B/C es pequeña y variable. La memoria lineal fue 4 MiB salvo Manglares (aprox. 12,8 MiB); el incremento de heap JS por ejecución se mezcla con GC y no ofrece una comparación fiable. B retuvo hasta 866 entradas JS en Desierto; C hasta 432 entradas nativas. No se observó una ventaja sostenida de C que justifique la refactorización global.

## Coherencia y causa del fallo real

En Desierto, semilla 983, día 15, una ruta de riego guardada en `watering-route-cache.js` seguía devolviendo cinco puntos después de descargar el chunk de la puerta. La consulta nativa fresca informaba `SpatialChunkUnavailable`. `nav.version` no cambió porque sólo versiona topología confirmada; `core.chunkRevision()` sí avanzó. La caché JS no tenía esa segunda revisión en su clave. Se añadió `residencyRevision` al adaptador y a las claves de rutas de riego, prefijos de movimiento animal, recuperación local de trabajadores y selección de entrada de incursiones. `workerPath` ya incluía ambas revisiones.

La prueba diferencial [`coherence.json`](coherence.json) ejecuta puerta automática abierta → cerrada como sólido → restaurada → brecha por retirada de muralla → reconstrucción; compara la ruta JS memorizada de riego y otras consultas JS con respuestas nativas frescas. También descarga/reconstruye sectores, guarda/recarga y verifica que `unknown` no pase a `blocked`. Una revisión **sólo de portal** cambió `connected` de 1 a 0 sin incrementar `lazy_sector_updates`; el prototipo C++ invalidó correctamente por su epoch de portal. Es una prueba importante: invalidar únicamente por número de sectores sería incorrecto.

La ampliación posterior compara además la prueba negativa de `workerPath` con `routeActor` al descargar el sector de la puerta: ambos devuelven `unknown`; al volver a cargarlo, ambos encuentran ruta. La conectividad animal JS y nativa coincide en las cinco etapas de puerta/muralla, aunque ese par concreto permanece `unknown` por su perfil y no sirve para demostrar un ataque. Se comprobó que los conectores excepcionales de retirada (`animal-exit-connectors.js`, `animal-footprint-connectors.js` y `animal-grid-exit-bridge.js`) guardaban su progreso o fracaso usando sólo `nav.version`. Ahora incorporan `residencyRevision`; las pruebas repiten una búsqueda agotada tras descargar/cargar sectores sin alterar la topología. Esto elimina otra forma de conservar una respuesta negativa obsoleta.

La auditoría adicional de incursiones encontró la misma dependencia implícita en `raidRegionDecisions` y en la asociación cultivo→región de `raids.js`: ambas comparaban topología y actualizaciones de sectores, pero no la revisión de residencia. El contador de sectores mide reconstrucciones de componentes y no sustituye la revisión de chunks; una descarga puede volver desconocida una región antes de que se reconstruya un componente. Ahora las dos memorias se invalidan al cambiar `nav.residencyRevision`. Dos regresiones dirigidas mantienen deliberadamente constantes la topología y la revisión de sectores mientras la respuesta nativa simulada pasa de accesible a `unknown` y vuelve a accesible, y mientras cambia la región asignada al grupo. El selector consulta de nuevo y no usa la antigua certificación. Las 65 pruebas focales de rutas, puertas, recuperación y selección pasan, la prueba diferencial con WASM real pasa y la build web termina. Esto verifica la invalidación, pero no demuestra que todo el selector de incursiones esté libre de errores durante una campaña larga.

La prueba diferencial nativa ampliada compara **resultado, código de causa y ruta completa** de la caché C++ con consultas frescas para cinco pares de celdas y dos perfiles (trabajador y facóquero). Repite los diez casos tras abrir/cerrar la puerta, abrir/reparar la brecha, descargar/recargar un sector y cambiar sólo portales. También inserta una muralla de vista previa sin confirmarla, compara durante la vista previa y después de descartarla, y exige nuevos fallos de caché en ambos cambios de grafo. No hubo discrepancias en esta matriz; sus recuentos por etapa están en [`coherence.json`](coherence.json). `tests/nav-cache-coherence.test.js` ejecuta la misma comparación sin escribir evidencia y forma parte de `test:playable`, la suite de CI. Este control refuerza la comprobación de invalidación del prototipo, sin convertir sus cachés en parte del WASM distribuido.

Una revisión posterior encontró que la excepción de retirada por pendiente
`animalSlopeRecoveryClear` conservaba un comprobante de segmento válido con
`nav.version`, pero sin la revisión de residencia. Una prueba roja reprodujo
que el comprobante permitía seguir por el segmento tras aparecer una colisión
al cambiar los sectores residentes sin cambiar la topología confirmada. Ahora
el comprobante positivo y el rechazo memorizado se invalidan por ambas
revisiones. La regresión y los 27 tests focales de salida animal, despeje y
coherencia diferencial pasan; se añadió el archivo de recuperación animal a
`test:playable`, que ahora pasa 209/209 casos localmente. Es una ruta
excepcional heredada, no una
migración de las cachés ordinarias a WASM.

## Inventario de responsabilidades

| Estado JS | Función | Resultado |
| --- | --- | --- |
| `watering-route-cache.js` | Rutas exactas de riego | Bug de residencia corregido; cache local conservada por rendimiento. |
| `spatial-navigation-movement.js` `failedWorkerRoutes` | Prueba negativa exacta | Ya incluía topología + chunks; `unknown` no se memoriza como bloqueo. |
| `animal-route-clearance.js` | Prefijo físico barrido | Se añadió revisión de residencia; colisiones dinámicas siguen fuera de caché. |
| `animal-exit-connectors.js` / `animal-footprint-connectors.js` / `animal-grid-exit-bridge.js` | Búsqueda de salida excepcional y su resultado fallido | Se añadió revisión de residencia: un sector vuelto a cargar puede ofrecer una salida válida. |
| `worker-fractional-connector.js` | Intentos locales fallidos/en curso | Se añadió revisión de residencia. |
| `worker-slope-recovery.js` / `animal-slope-recovery.js` | Fallos de recuperación excepcional en pendiente | La prueba negativa se reinicia tras un cambio de residencia; las colisiones físicas siguen comprobándose. |
| `raid-entry-data.js` / `entrySelections` | Entrada exterior certificada | La clave ahora incluye residencia. |
| `raids.js` `raidRegionDecisions` y pertenencia cultivo→región | Decisiones por grupo/región durante la incursión | Ahora mantienen topología, residencia y revisión de sectores; las regresiones evitan que una certificación JS sobreviva a una descarga/carga de chunks. |
| `raids.js` `cropTargetIndexes` y reservas | Agrupación agrícola y ocupación dinámica | No son cachés topológicas. |
| `gate-passages.js`, `building-route-shortcut.js` | Geometría derivada de objetos | No certifican conectividad; las rutas propuestas se validan físicamente. |
| `worker-return-route.js`, `raid-navigation-warmth.js` | Recuperación/navegador JS heredado | No son el planificador ordinario de Wild Engine; se conservaron como fallback legacy. |
| `fractional-walkability-cache.js`, `animal-segment-clearance.js`, `worker-route-clearance.js`, `actor-motion.js`, `hiring-route-preparer.js` | Pruebas de terreno y desvíos del navegador JS heredado | El adaptador espacial no ofrece las API que activan esas cachés; no certifican la conectividad de Wild Engine. Su validez depende de `nav.version` en el navegador heredado. |
| `raid-exterior-connectivity.js`, `raid-exterior-detour.js` | Certificados y respuestas parciales de preparación de una entrada exterior | Los mapas se crean y descartan dentro de una única evaluación de formación, sin persistir entre ticks. La ruta del desvío se valida con `walkable` y `segmentClear` antes de escogerla. |
| `raid-contention.js` | Cola de espera y revisión de ocupación dinámica | No conserva rutas ni certificados; combina revisión topológica, reservas y progreso, con reintento periódico para cambios dinámicos. |
| `raid-agricultural-impact.js` | Índice espacial de plantas vivas y sólidos para impactos | Índice de daño físico, no de rutas; descarta plantas retiradas y reconstruye los sólidos tras cambios de topología o identidad de estructuras. |
| `spatial-game-session.js` portales | Proyección del estado confirmado al grafo | Ya compara muros, centros, props, terreno y residencia; se probó una mutación exclusiva de portal. |

## Límites

El benchmark nativo es un prototipo separado. La prueba completa del juego estática y los ticks congelados no equivalen a una campaña de varias noches con streaming continuo. No se migraron todas las cachés JS porque los datos medidos no cumplen el umbral solicitado. La corrección de residencia se limita a los certificados localizados; futuros caches deberán declarar explícitamente qué revisiones del grafo y de los chunks necesitan. El JSON de Manglares es una captura de QA, no una victoria de campaña. No se modificó ni fusionó `main`.

## Validaciones y fallos de la suite general

La build web terminó correctamente. Las 33 pruebas focales iniciales pasaron y se conserva su salida en [`focused-all.tap`](focused-all.tap). Tras ampliar la invalidación de salidas animales, se ejecutaron 49 pruebas focales con 49 aprobadas. La suite jugable usada por CI pasó 186/186 casos ([`playable-tests.tap`](playable-tests.tap)). La prueba diferencial con la partida congelada también pasó.

Para el código de `2f776081`, los workflows de GitHub **Validate game** y **Build Windows desktop** finalizaron correctamente. El segundo compiló la aplicación, verificó ejecutable e instalador, probó el juego empaquetado en WebView2 y superó las comprobaciones nativas de minimizar/restaurar y salir/volver a arrancar con persistencia ([ejecución 38680504390](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38680504390)). Esto valida el empaquetado de esta rama; no sustituye una campaña larga ni una prueba física en todos los dispositivos.

La suite completa del repositorio terminó con **4294 aprobadas y 46 fallidas**. Se conserva la salida íntegra comprimida en [`test-suite-diagnostics.zip`](test-suite-diagnostics.zip) y un índice de fallas en [`test-suite-failures.txt`](test-suite-failures.txt). Las fallas observadas se concentran en expectativas de balance/victoria, coste fijo de poblados, desbloqueos/cooldowns y alcance antiguos de las magias, tutorial, interfaz de poderes y catálogo de audio. Ninguna prueba focal de las invalidaciones o rutas cambiadas falló. Esas áreas no fueron modificadas en esta rama; no se declara verde la suite completa ni se atribuye causalidad sin una comparación integral con `main`.

Tras sincronizar con `main` en `8e32ce0d`, se repitieron la comparación diferencial contra consultas nativas frescas, las pruebas de puertas y reparaciones incorporadas por `main`, 105 pruebas focales y la build web: todas pasaron. La nueva prueba diferencial se incorporó después a la puerta de CI y `test:playable` pasó localmente 188/188. Los cuatro fixtures AB/BA mantuvieron el mismo hash de estado entre A/B/C. En los tres que realmente emitieron rutas, B (caché JS) conservó una mediana de `Game.tick` inferior a C (caché WASM): 8,0 frente a 11,2 ms en Sabana; 1628,1 frente a 1644,8 ms en Manglares; 714,8 frente a 790,0 ms en Desierto. Gran Cañón no emitió rutas en esos dos ticks y no informa esa comparación. La conclusión experimental sigue siendo conservar la caché JS con invalidación por revisiones nativas, pendiente de revisión humana; no se ha fusionado en `main`.
