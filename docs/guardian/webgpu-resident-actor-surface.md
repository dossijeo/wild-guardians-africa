# Resident ground samples for WebGPU actors

The WebGPU animal and worker presentation already owns the Wild Engine
chunk payloads. `WebGpuTerrainResidency` exposes their `SpatialSurfaceView`,
which evaluates the same two ground triangles as the mesh. Actor placement
now uses that resident view instead of raycasting the same ground mesh. The
existing raycast remains the fallback if the view has no finite sample and at
cell edges, diagonals and chunk seams. The cache still follows mesh identity,
so replacement invalidates the prior result.

The edge fallback preserves a real behavior of the previous raycaster: at an
exact mangrove chunk corner the ray can miss and return zero even though the
resident surface is about 3.32 m. This change deliberately retains that
behavior instead of silently changing placement. It samples the same **ground**
as the old WebGPU path. It does not implement `nav.actorSurface` water support:
the authority may raise actors above water in mangroves and canyons.

`tests/webgpu-actor-terrain.test.js` compares the view against the actual
rendered Wild Engine geometry in six biomes, across two resident chunks and
five seam points per biome; the tolerance is 0.00005 m. It also checks fallback
and caching. The existing animal, worker and terrain residency tests pass.
This is geometric CPU validation, not a visual comparison of a running game.

Two alternating-order Node CPU runs on a real seed-712 mangrove chunk sampled
256 varied non-edge coordinates per batch, with four warm-up batches and 16
measured batches. Raycast mean/p95/p99 were 144.16/253.02/253.02 ms and
131.56/188.07/188.07 ms per batch; the resident view was
0.101/0.156/0.156 ms and 0.099/0.163/0.163 ms. All 256 values matched in those
runs. These are repeated CPU samples, not a frame, a GPU measurement or a
gameplay FPS claim. With 16 batches, p95 and p99 are the maximum and do not
characterize a reliable tail. Results are retained in
`gpu-animation/actor-surface-sampling-ab-20261105.json`; reproduce with
`node tools/experiments/audit_actor_surface_sampling.mjs` from the repository.

For eventual GPU trajectory support, a packed R32F grid needs 9,604 bytes per
49×49 chunk. The existing Three.js position buffer is created for vertex use;
sharing it directly as storage is not established, and Three's storage path
pads vec3 attributes to vec4 and changes their layout. A separate packed
buffer costs a copy and upload on chunk changes but avoids per-segment WASM
queries. Neither that GPU grid nor its per-revision lifetime has been
implemented. The terrain channel can arrive independently of state; old
residency versions are currently discarded. A causal chunk-revision manifest,
retention until a window finishes, water coverage and edge validation remain
necessary before this data can support an autonomous global timeline.

## Water triangle index: not integrated

A diagnostic index reused the positions already present in the rendered water
mesh, with per-cell lists of triangle offsets. It evaluated the visible water
height without calling Wild Engine for each actor. A 5 cm ambiguity margin
fell back to the existing ground-only placement when water could not be
confirmed. This is **not** an authoritative fluid query: the mangrove mesh
clips a nonlinear `wetlandMask` using vertex and centroid samples, and canyon
water geometry also approximates its continuous shoreline.

In two identical seeded canyon fixtures, 200,000 deterministic points were
compared with native ground and `fluidLevelAnywhere`. With only the central
chunk available, seeds 28 and 712 had respectively 181 and 105 points with
over 5 cm error, up to **0.82 m**, where the ambiguity margin reached a
missing neighbouring chunk. With all 3×3 neighbours available, neither seed
had an error over 5 cm in these samples. This is finite evidence, not a proof
of shoreline equality or a guarantee that a neighbour is resident. The
candidate was therefore **not connected or enabled**, even behind QA.

Across two runs, building the nine indexes took 2.38/3.48 ms for seed 28 and
0.29/0.44 ms for seed 712. For 10,000 points, ground-only sampling took
3.14/3.34 ms and 2.64/1.43 ms respectively; adding the diagnostic water index
took 6.88/6.03 ms and 12.80/11.27 ms. These are Node CPU observations, not
frame, GPU, memory-residency or gameplay measurements. Inputs and results are
in `gpu-animation/resident-water-index-20261105.json`; reproduce with
`node tools/experiments/audit_resident_water_index.mjs`.

Wild Engine already builds 48×48 water flags and levels at **cell centres**,
but the current chunk payload transfers neither array. Centre samples alone
cannot certify the continuous water boundary. A possible next native
contract is a conservative per-cell classification (water, ground, ambiguous)
generated alongside existing chunk data, with the chunk's authoritative
revision and explicit fallback for ambiguous or missing cells. It requires a
proof against the native continuous predicates, versioned transport and tests
at shoreline/settlement boundaries before use. It has not been implemented,
and neither the rendered water nor game physics has been changed.

### Manifiesto causal de terreno para capturas de movimiento (QA, 2026-11-05)

El publicador de terreno ya asigna revisiones por chunk. Cuando se solicita la captura experimental de movimiento mundial, el Worker añade el mapa de revisiones comprometidas y una época exclusiva del canal. La residencia solo acepta una coincidencia exacta de época y revisión para todos los chunks, después de confirmar el estado; chunks pendientes, reemplazados o restaurados mediante checkpoint sintético hacen que la coincidencia falle. Un canal no admite dos épocas. El mapa se reutiliza mientras no cambia el terreno; no se añaden consultas WASM. Una reconexión comienza otra época y falla de forma conservadora hasta reconstruir un estado verificable. La captura sigue siendo histórica y `safeForAutonomousPlayback` permanece en `false`: este contrato no certifica alturas sobre agua, historia del terreno, física, ni horizonte de ejecución.

Pruebas dirigidas: 39/39. La fixture `tests/browser/authority-terrain-manifest.html`, ejecutada con `tools/experiments/audit_terrain_manifest_worker.mjs`, compara dos Workers reales y Wild Engine, ambos con canal de terreno. Dos pasadas independientes dieron 24 chunks, manifiesto de 761 bytes, 42 actores y 3652 segmentos, con estados y eventos idénticos en 20 lotes. Sobre 16 muestras por pasada, el tiempo de ida y vuelta más validación fue 29,56/30,63 ms y 22,58/23,33 ms (base/captura); p95/p99 37,90/40,35 ms y 31,52/32,94 ms. La variante observada además construye y valida trazas y actualiza su feed; por tanto no son una medida aislada del coste del manifiesto. No se usa render, GPU, FPS ni física Rapier y la muestra es pequeña; no demuestra mejora de rendimiento. En esas dos pasadas el feed no recibía `terrainReady`, por lo que las 20 capturas quedaban no representables. Tras conectar la coincidencia real del canal en una tercera pasada, 20/20 manifiestos coincidieron y 17/20 capturas fueron representables con física explícitamente desactivada en la fixture; las tres restantes se invalidaron por cambios o eventos. Los tiempos base/captura fueron 21,54/22,22 ms de media y 27,15/27,04 ms p95/p99. Que sean representables no autoriza reproducirlas autónomamente. Para reproducir, servir Vite en 5175 y configurar `NODE_PATH` o `PLAYWRIGHT_MODULE` hacia Playwright.

### Fases observadas por tick interno (QA, 2026-11-05)

La captura mundial opt-in observa para las hienas, al inicio y después de cada tick de `advanceReal`, la fase `motionPhase` cruda, tiempo, estado, presencia de ruta y condiciones de caída, recuperación e impacto. El Worker gráfico valida los valores finales contra el estado confirmado y rechaza secuencias de tiempo o valores inválidos. Cambios de identidad o roster, valores incompletos, alteraciones después de la última muestra o fallos de instrumentación descalifican la captura. Son muestras en fronteras de tick: no demuestran qué ocurrió dentro de un tick ni constituyen una interpolación, una pose validada, un historial de física o un horizonte seguro. El callback solo se instala con el observador QA; si falla, la simulación continúa y la captura se marca incompleta. No se ha activado reproducción GPU a partir de estos datos.

La fixture real `tests/browser/authority-terrain-manifest.html`, ejecutada dos veces con `tools/experiments/audit_terrain_manifest_worker.mjs`, mantuvo idénticos el estado y los eventos de control durante 20 lotes; observó 42 actores, una hiena y 140 muestras (siete por lote), con 24 chunks coincidentes. En 16 muestras por pasada, el coste completo de ida y vuelta más validación fue 22,12/22,23 y 24,57/26,07 ms de media y 32,31/27,27 y 32,43/37,74 ms p95/p99 (base/observación). La ruta observada incluye toda la captura global, manifiesto y feed, por lo que estos tiempos no aíslan el coste de las fases. No se midieron FPS, GPU ni Rapier; la muestra es pequeña y no demuestra mejora de rendimiento.

### Ventanas reales en sabana y selección de superficie GPU (QA, 2026-11-05)

La fixture `tests/browser/authority-terrain-manifest-savanna.html`, reproducible con `tools/experiments/audit_savanna_world_motion.mjs`, observó 20 lotes de una captura determinista de sabana: 25 actores, 995 segmentos, tres chunks con actores y dos cruces de chunk. Coincidieron los 12 chunks del manifiesto y los 20 lotes fueron representables por el feed con física desactivada; ninguno tenía el mundo entero inmóvil ni todos sus actores en un único chunk. Esto no constituye una certificación de reproducción. La media base/observación fue 8,79/9,53 ms, p95/p99 10,20/13,13 ms en 16 muestras; se trata del coste de captura y validación, sin render, GPU ni Rapier.

Se descarta activar una ruta limitada a un solo chunk porque no aparece en estos lotes. Compartir el atributo de posiciones como `StorageBufferAttribute` parece evitar otro buffer, pero Three.js cambia en CPU un atributo vec3 a vec4 y sustituye su array al crear el buffer WebGPU; aún no se han validado sus efectos en sombreado, raycast o consumidores que dependen de esa identidad. Un atlas GPU de alturas por chunk conservaría la geometría y permitiría selección por actor, a costa de otra copia de aproximadamente 9,6 KB por chunk de 49×49 floats y su transferencia. Ambas opciones necesitan manejar versiones históricas, selección segura en cruces, sombras y ventanas globales; no se ha habilitado ninguna ni se ha aproximado el agua.

No se construyó un atlas aislado: hoy el actor confirmado coloca su raíz con altura muestreada en CPU y el picker realiza raycasts sobre esa raíz. Hacer que un shader repita la altura no retiraría ese trabajo ni permitiría desplazar una trayectoria en GPU. Su integración útil requiere reproducir una ventana global coherente, componer el desplazamiento con skinning y sombras, y hacer que el picker consulte la posición temporal; además faltan orientación y estados intermedios de todos los trabajadores y el hold actual conserva el ACK pendiente. Una opción es evaluar posiciones para picking solo ante interacción, pero no se ha implementado ni validado.

Una pasada adicional examinó el apoyo inicial de cada actor frente a los puntos donde cada segmento cruza una línea de cuadrícula o una diagonal de triángulo. En esta superficie seca lineal por triángulos, esos puntos y los extremos acotan la variación de altura a lo largo de cada segmento. Ninguno de los 20 lotes quedó por debajo de 1 o 2 cm para todos sus actores; los 20 quedaron por debajo de 5 cm y el máximo fue 4,253 cm. Una tolerancia de 5 cm podría justificar una prueba visual, pero esta medición no demuestra que el efecto sea imperceptible, no evalúa agua, obstáculos o física, y no habilita playback. Esta pasada incluye cálculos adicionales en la medición observada, por lo que sus tiempos no son comparables con el A/B anterior.

La observación QA se amplió a los estados y dirección calculable de todos los actores en cada tick. En la misma incursión de sabana, 8/20 lotes conservaron estado y orientación estables bajo el filtro experimental y cumplieron la cota de 5 cm; eso es solo elegibilidad preliminar. La traza completa creció de aproximadamente 15,2 KB a 72 KB por lote, y la prueba no demuestra una mejora de rendimiento. Un enlace QA reversible compone el desplazamiento con `positionNode` existente usando copias de materiales por actor, conserva los materiales compartidos originales y rechaza overrides de sombra incompatibles. La prueba dirigida cubre rigs y restauración en CPU; todavía no valida visualmente sombras, picking ni una ventana de mundo completa, y no activa ninguna trayectoria.

La composición QA de trayectoria ahora conserva y restaura el `positionNode` previo y utiliza copias de materiales por actor para no desplazar a otros rigs que comparten recursos. Se rechazan propietarios concurrentes y overrides personalizados de posición/sombra incompatibles; las copias se liberan al retirar el actor o la vinculación. Las pruebas Node cubren `SkinnedMesh`, compartición, restauración y rollback. Una fixture WebGPU mínima de 256×256 confirmó composición, límite temporal y restauración sobre una caja; el adaptador reportó NVIDIA, arquitectura Turing. No se verificaron en esa fixture las sombras, el picking ni la apariencia de un rig real, y la vinculación no se activa por sí sola ni certifica una ruta segura.

El roster de trabajadores y el de animales exponen `bindMotion` únicamente en desarrollo, cuando el actor está cargado y se proporciona una trayectoria ya instalada. El enlace clona materiales por actor y restaura materiales y raycasts al retirarse. Una sesión de picking QA congela un único tiempo durante la consulta completa, evalúa bajo demanda el desplazamiento de la misma trayectoria y revoca después incluso si el raycast falla. La sesión cubre los raycasts internos de `createWebGpuPicker.pick`, incluidos terreno y oclusores, pero no cancela por sí sola otros tipos de interacción: el futuro coordinador debe hacerlo. El estado de pose sigue en CPU y no se ha validado visualmente con sombras ni con una ventana global; no hay ningún llamador de producción y el movimiento permanece desactivado.

En el modo QA de reloj confirmado, las partículas de bendición comparten ahora directamente el mismo nodo TSL utilizado por la animación baked de la hiena. El modo normal conserva su fuente anterior. El reloj solo cambia al aplicar una publicación confirmada: la prueba de un Worker WebGPU con un efecto mínimo comprobó que modificar únicamente el estado no confirmado no cambia la imagen, mientras que confirmar el reloj sí anima las partículas (3392 componentes de píxel diferentes). Se trata de una prueba aislada, no de paridad de partida ni de avance autónomo entre publicaciones. Las capas de luz, cielo, trabajadores, guardián y otros efectos todavía no comparten este reloj; las acciones y pausas siguen requiriendo una cancelación coordinada antes de habilitar una ventana global.

El guardián confirmado también consume el reloj compartido QA para edad del gesto, reconciliación, clips secundarios y cara. Los eventos siguen procesándose con el estado confirmado y el feedback provisional conserva su reloj real para responder inmediatamente. Las pruebas dirigidas cubren pausa, avance no confirmado, reconciliación y activación del haz; el reloj sigue avanzando exclusivamente al confirmar publicaciones. Esto no sincroniza todavía la iluminación, las poses de trabajadores ni los demás efectos durante una ventana interpolada.

Los efectos confirmados de agricultura, trabajo, combate, escudo e impactos de muralla también toman del reloj compartido QA el tiempo usado para retener eventos y construir planes. No se adelantan entre publicaciones: sus duraciones, posiciones y demás datos siguen procediendo del estado confirmado. El modo ordinario conserva su reloj previo; las pruebas comprueban que un cambio de tiempo no confirmado no expire un impacto y que el commit sí lo haga. Quedan pendientes la sincronización temporal de las poses y de todos los parámetros del efecto durante una futura ventana.

Las poses y expresiones de trabajadores WebGPU aceptan el reloj confirmado compartido en el modo QA; el roster lo transmite a cada rig y el modo ordinario conserva `state.elapsed`. Una prueba con un rig mínimo comprueba que cambios de estado no confirmados no adelantan la pose, y otra conserva el fallback. Las raíces siguen actualizándose desde publicaciones; todavía no existe reproducción de trayectorias ni actualización autónoma de la pose entre ellas.

La pose normal no baked de animales WebGPU consume también el reloj confirmado compartido QA. Las fases explícitas y los temporizadores de ataque mantienen prioridad, el muestreo provisional sigue usando su tiempo autoritativo y las poses físicas conservan prioridad. Las pruebas cubren esos caminos y el fallback; no se evalúa la pose en GPU ni se ha habilitado una ventana de movimiento.

Se evaluó una cerca de interacción por el mismo puerto ordenado de publicaciones para revocar una ventana antes de aplicar estados posteriores a una orden. El experimento se retiró: las interacciones provisionales y el picking llegan por otro canal, mientras que los cambios de velocidad y el reenganche no disponen todavía de una frontera correlacionada que permita reabrir ventanas sin riesgo ni esperas indefinidas. Para continuar hace falta correlacionar todas esas entradas con versiones de presentación y confirmar sus fronteras sin bloquear render ni autoridad; una notificación independiente no garantiza ese orden. No se ha activado reproducción de trayectorias.
