# Cachés de navegación: decisión experimental

Rama `codex/wild-engine-wasm-cache-benchmark`, base `020b6abcaa602d51823bd477dd3cdf4de73b1e26`. No cambia economía, daño ni políticas del jugador virtual. El prototipo C++ se compila aparte: el WASM distribuido por el juego no contiene `nav_cached_*`.

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
| Gran Cañón d6, trabajador, ruta | 1,741 / 1,789 | 1,911 / 0,010 | 2,157 / 0,045 |
| Sabana d13, facóquero, ruta | 2,496 / 2,360 | 2,450 / 0,003 | 2,345 / 0,025 |
| Manglares d10, facóquero, ruta | 10,626 / 10,066 | 10,189 / 0,004 | 11,090 / 0,043 |
| Desierto d15, trabajador, ruta | 2,467 / 1,642 | 2,894 / 0,003 | 1,619 / 0,030 |

Las otras doce combinaciones de perfil y tipo, incluidas conectividad, están en [`abc-low-level.json`](abc-low-level.json). La preparación inicial de chunks + navegación tardó aproximadamente 528 ms (Gran Cañón), 397 ms (Sabana), 1763 ms (Manglares) y 472 ms (Desierto); ese coste compartido no se atribuye a un cruce JS↔WASM. En la carga sintética de 250.000 consultas por pasada, un hit JS tardó 1,7–3,4 ms tras el calentamiento y un hit en `unordered_map` WASM 4,3–4,9 ms. Una llamada trivial WASM tardó 1,3–1,5 ms. La consulta nativa fresca sobre un grafo vacío fue incluso más barata que la caché nativa, lo que demuestra que cachear no siempre ayuda.

### `Game.tick` (dos ticks, 12 ejecuciones por fixture)

Mediana en milisegundos. Los brazos son comparables y los hashes coinciden, pero la intervención A/B/C está en el punto `routeActor` y elimina la prueba JS preexistente de `workerPath`; otros subsistemas conservan sus cachés. Por tanto, **A no es una ejecución global del juego sin ninguna caché**. El fixture Gran Cañón no emitió consultas de ruta en estos dos ticks; sirve para las pruebas discretas y de coherencia, no para una conclusión sobre ticks.

| Fixture | A | B | C | Consultas `routeActor` | Hits JS B / hits nativos C (1.ª ejecución) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sabana d13 | 15,4 | 8,9 | 9,9 | 31 | 19 / 0 |
| Manglares d10 | 1752,6 | 1738,4 | 1681,3 | 469 | 437 / 1350 |
| Desierto d15 | 974,3 | 749,0 | 783,7 | 4875 | 4009 / 11647 |

Los contadores nativos incluyen llamadas internas a conectividad y pueden superar `routeActor`. En Manglares, el coste total del tick domina tanto que la diferencia B/C es pequeña y variable. La memoria lineal fue 4 MiB salvo Manglares (aprox. 12,8 MiB); el incremento de heap JS por ejecución se mezcla con GC y no ofrece una comparación fiable. B retuvo hasta 866 entradas JS en Desierto; C hasta 432 entradas nativas. No se observó una ventaja sostenida de C que justifique la refactorización global.

## Coherencia y causa del fallo real

En Desierto, semilla 983, día 15, una ruta de riego guardada en `watering-route-cache.js` seguía devolviendo cinco puntos después de descargar el chunk de la puerta. La consulta nativa fresca informaba `SpatialChunkUnavailable`. `nav.version` no cambió porque sólo versiona topología confirmada; `core.chunkRevision()` sí avanzó. La caché JS no tenía esa segunda revisión en su clave. Se añadió `residencyRevision` al adaptador y a las claves de rutas de riego, prefijos de movimiento animal, recuperación local de trabajadores y selección de entrada de incursiones. `workerPath` ya incluía ambas revisiones.

La prueba diferencial [`coherence.json`](coherence.json) ejecuta puerta automática abierta → cerrada como sólido → restaurada → brecha por retirada de muralla → reconstrucción; compara la ruta JS memorizada de riego y otras consultas JS con respuestas nativas frescas. También descarga/reconstruye sectores, guarda/recarga y verifica que `unknown` no pase a `blocked`. Una revisión **sólo de portal** cambió `connected` de 1 a 0 sin incrementar `lazy_sector_updates`; el prototipo C++ invalidó correctamente por su epoch de portal. Es una prueba importante: invalidar únicamente por número de sectores sería incorrecto.

La ampliación posterior compara además la prueba negativa de `workerPath` con `routeActor` al descargar el sector de la puerta: ambos devuelven `unknown`; al volver a cargarlo, ambos encuentran ruta. La conectividad animal JS y nativa coincide en las cinco etapas de puerta/muralla, aunque ese par concreto permanece `unknown` por su perfil y no sirve para demostrar un ataque. Se comprobó que los conectores excepcionales de retirada (`animal-exit-connectors.js`, `animal-footprint-connectors.js` y `animal-grid-exit-bridge.js`) guardaban su progreso o fracaso usando sólo `nav.version`. Ahora incorporan `residencyRevision`; las pruebas repiten una búsqueda agotada tras descargar/cargar sectores sin alterar la topología. Esto elimina otra forma de conservar una respuesta negativa obsoleta.

La auditoría adicional de incursiones encontró la misma dependencia implícita en `raidRegionDecisions` y en la asociación cultivo→región de `raids.js`: ambas comparaban topología y actualizaciones de sectores, pero no la revisión de residencia. El contador de sectores mide reconstrucciones de componentes y no sustituye la revisión de chunks; una descarga puede volver desconocida una región antes de que se reconstruya un componente. Ahora las dos memorias se invalidan al cambiar `nav.residencyRevision`. Dos regresiones dirigidas mantienen deliberadamente constantes la topología y la revisión de sectores mientras la respuesta nativa simulada pasa de accesible a `unknown` y vuelve a accesible, y mientras cambia la región asignada al grupo. El selector consulta de nuevo y no usa la antigua certificación. Las 65 pruebas focales de rutas, puertas, recuperación y selección pasan, la prueba diferencial con WASM real pasa y la build web termina. Esto verifica la invalidación, pero no demuestra que todo el selector de incursiones esté libre de errores durante una campaña larga.

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
| `spatial-game-session.js` portales | Proyección del estado confirmado al grafo | Ya compara muros, centros, props, terreno y residencia; se probó una mutación exclusiva de portal. |

## Límites

El benchmark nativo es un prototipo separado. La prueba completa del juego estática y los ticks congelados no equivalen a una campaña de varias noches con streaming continuo. No se migraron todas las cachés JS porque los datos medidos no cumplen el umbral solicitado. La corrección de residencia se limita a los certificados localizados; futuros caches deberán declarar explícitamente qué revisiones del grafo y de los chunks necesitan. El JSON de Manglares es una captura de QA, no una victoria de campaña. No se modificó ni fusionó `main`.

## Validaciones y fallos de la suite general

La build web terminó correctamente. Las 33 pruebas focales iniciales pasaron y se conserva su salida en [`focused-all.tap`](focused-all.tap). Tras ampliar la invalidación de salidas animales, se ejecutaron 49 pruebas focales con 49 aprobadas. La suite jugable usada por CI pasó 186/186 casos ([`playable-tests.tap`](playable-tests.tap)). La prueba diferencial con la partida congelada también pasó.

La suite completa del repositorio terminó con **4294 aprobadas y 46 fallidas**. Se conserva la salida íntegra comprimida en [`test-suite-diagnostics.zip`](test-suite-diagnostics.zip) y un índice de fallas en [`test-suite-failures.txt`](test-suite-failures.txt). Las fallas observadas se concentran en expectativas de balance/victoria, coste fijo de poblados, desbloqueos/cooldowns y alcance antiguos de las magias, tutorial, interfaz de poderes y catálogo de audio. Ninguna prueba focal de las invalidaciones o rutas cambiadas falló. Esas áreas no fueron modificadas en esta rama; no se declara verde la suite completa ni se atribuye causalidad sin una comparación integral con `main`.
