# Diagnóstico del bloqueo de varios segundos — 4 de noviembre de 2026

Se detuvo la integración y no se aplicó ninguna optimización. Se capturaron cuatro ejecuciones del escenario que había producido el bloqueo, con trazas de Chromium, perfiles V8 de los Workers y del hilo principal, eventos internos de Dawn y marcas de solicitudes WebGPU. La última captura comienza antes de la barrera de recursos, para ver también el trabajo pendiente anterior a la incursión.

**El bloqueo largo reproducido es, principalmente, una cola de compilaciones de pipelines WebGPU en el proceso gráfico del navegador. No es una operación larga de navegación ni una tarea JavaScript equivalente en el hilo principal.** Hay además un coste CPU distinto en el Worker gráfico, provocado por consultas geométricas al terreno para los VFX. Ese trabajo contribuye al retraso de la presentación, pero no explica el comienzo del bloqueo del compositor.

## Escenario y hardware

- Partida real mediante las rutas QA existentes: sabana, 32 trabajadores y un facóquero preparado para atacar una muralla. No es una horda natural ni una prueba de todos los biomas.
- Simulación autoritativa en Worker; presentación OffscreenCanvas/WebGPU. Dibujo WebGL heredado omitido mediante `qa-webgpu-skip-legacy-draw`; sus actualizaciones CPU siguen existiendo. No se presenta esta ejecución como producto completamente migrado ni como ausencia de todos los contextos WebGL.
- Edge 156.0.4314.58, headless, 1280×720. `SystemInfo` identifica NVIDIA GeForce GTX 1660, controlador 32.0.15.8129; la solicitud de adaptador devuelve NVIDIA/Turing. El Worker comprueba backend WebGPU y Dawn registra D3D12/DXC. No se habilitó SwiftShader.
- Los tiempos de Dawn son CPU/tiempo de pared del proceso GPU, **no** tiempos de ejecución medidos mediante consultas hardware de la GPU.
- Todas las capturas notifican `dataLossOccurred: false`. El perfilado añade coste: estos datos diagnostican la causa, no son benchmarks de aceptación ni comparativas de caché fría/caliente.
- Se partió de `54f2a77061ebfeab0f4b5e474e587f1cbc73f9a4` en `codex/guardian-3d-animation`, conservando los cambios locales que ya existían. `source-provenance.json` registra hashes de los módulos relevantes; no se presenta como una medición de un checkout limpio de ese commit.

## Cronología de la captura ampliada

Archivo `requests.json.gz`; origen = `WG_RAID_TRACE_START`. Los intervalos se reconstruyen con el reloj común de Chromium y las marcas `performance`.

| Momento desde el origen | Qué sucede |
| --- | --- |
| +0,384 s | Primera solicitud registrada al Worker gráfico para `createRenderPipeline`, material de sombras. Puede haber solicitudes anteriores al comienzo de la captura. |
| +1,435 a +11,835 s | **10,400 s entre callbacks rAF**. Se solapan 289 creaciones de pipeline, todas con etiqueta `renderPipeline_ShadowMaterial_1259`. Ocupan 10,048 s de la ventana; DXC ocupa 9,312 s dentro de ellas. |
| +3,390 s | El harness declara los recursos preparados. La GPU sigue compilando: esa señal describe disponibilidad en la aplicación, no finalización del trabajo gráfico. |
| +11,835 a +16,668 s | Otro intervalo de **4,833 s**. Se solapan 90 creaciones de pipeline; 4,566 s de creación, incluidos 4,206 s de DXC. Predominan materiales de vegetación y objetos del bioma. |
| +13,407 s | Se solicita reanudar la simulación, tras diez segundos de espera posterior a la señal de recursos preparados. La compilación continúa. |
| +16,668 a +19,369 s | Otro intervalo de **2,700 s**. Se solapan 53 creaciones: 2,557 s de creación, incluidos 2,369 s de DXC. Hay sombras, materiales del mundo y materiales del facóquero, incluidos párpados y tejido oral. |
| +28,516 s | Fin de la traza. La última inspección de la ventana de incursión observa aproximadamente 7,1 segundos simulados de retraso de presentación y 128 secuencias de diferencia. No es el mismo indicador que el intervalo rAF. |

Los scopes de compilación DXC están **dentro** de los de creación de pipelines: no se suman. Un scope puede cruzar el límite entre dos intervalos; por eso los recuentos de scopes solapados de la tabla tampoco se deben sumar para obtener un número de pipelines únicos. Las duraciones de ventana están recortadas a sus límites.

En esos tres intervalos, la mayor tarea individual registrada en el hilo principal fue respectivamente de 32,7 / 24,3 / 37,1 ms. Durante el intervalo de 10,4 segundos, el proceso gráfico estuvo ocupado 10,398 s en scopes WebGPU y no aparecen envíos `Queue::Submit` en esa ventana: el trabajo dominante capturado es preparación/compilación, no un fotograma gigante ejecutándose en la GPU. La captura no contiene un perfil nativo completo del controlador ni consultas de duración de ejecución GPU.

## Qué se solicita y de dónde procede

La instrumentación de la última captura observa **431 llamadas a `createRenderPipeline` y ninguna a `createRenderPipelineAsync`** en el Worker gráfico observado. De ellas, 325 llevan la etiqueta del material de sombras. Se observan además 436 creaciones de módulos shader. No son contadores de toda la vida de la página.

Las 431 solicitudes registradas se producen **antes de reanudar la simulación**: 378 antes de la señal de recursos preparados y 53 durante la espera posterior. Su ejecución en el proceso gráfico se prolonga después de reanudar. Por tanto, no corresponde atribuir automáticamente este parón a la lógica del ataque: hay trabajo gráfico encolado de la preparación de la escena.

El inventario de materiales se leyó en el propio Worker y se cruzó por ID con las etiquetas nativas de Dawn. Los materiales `MeshStandardMaterial` repetidos pertenecen principalmente a los `InstancedMesh` de vegetación y objetos de sabana repartidos por chunks. Entre los ejemplos comprobados por geometría del paquete están matorral denso (24.111 vértices), arbusto espinoso (22.089), hierba amarilla alta (8.945), hierba seca corta (5.438), macollas de hierba (11.795), rocas, ramas y troncos. Varios de esos materiales son compartidos por 20–25 mallas instanciadas. La etiqueta común de sombras corresponde al pase generado por Three.js; no identifica un único objeto del mundo.

La captura con inventario también identifica los materiales del facóquero: `Material_0`, `Actor eyelid original fur`, `Warthog oral tissue` y `Mane repairs`, sobre sus mallas esqueléticas respectivas. En la captura ampliada sus creaciones aparecen dentro del tercer episodio de bloqueo.

La inspección del código instalado de Three.js 0.180.0 explica por qué compartir un objeto Material no garantiza una cantidad pequeña de pipelines:

1. `src/renderers/common/RenderObject.js`, `getMaterialCacheKey()`, incluye el UUID del objeto cuando es `InstancedMesh` y también datos de geometría/estado de sombras.
2. `src/nodes/accessors/InstanceNode.js`, `setup()`, construye para estos tamaños un buffer de matrices cuyo número de elementos depende de `instanceMatrix.count`.
3. `src/renderers/webgpu/nodes/WGSLNodeBuilder.js` escribe ese tamaño en la declaración del array de uniforms WGSL.
4. `src/renderers/webgpu/utils/WebGPUPipelineUtils.js` utiliza `device.createRenderPipeline()` en el camino normal sin lista de promesas. La traza de solicitudes confirma que ese es el camino utilizado en esta ejecución.

El código del juego en `webgpu-biome-props.js:22` crea un `InstancedMesh` por slot y chunk con capacidad `items.length`, y activa recepción y emisión de sombras. Esa combinación introduce diferencias estructurales aunque comparta material y geometría. **No se afirma que cada etiqueta repetida represente un descriptor idéntico compilado de nuevo**: las trazas conservan etiquetas y solicitudes, no todos los descriptores/shaders completos. La relación exacta de cada variante con su clave requeriría un inventario adicional de descriptores; no es necesario para establecer que la compilación capturada domina el bloqueo.

## Segundo fenómeno: CPU visual y retraso de publicaciones

La primera captura, analizada independientemente, muestra unos 2,5 s de muestras inclusivas de CPU visual en:

`confirmed-presentation-stream.port.onmessage → webgpu-agriculture-vfx.sync → vfx-native.floorAt → localSurface → surface → Raycaster.intersectObject`.

El muestreo sitúa casi todo ese episodio entre +3,85 y +6,5 s; las tareas individuales más largas del Worker son de aproximadamente 502 y 376 ms. La saturación inicial del proceso gráfico comienza antes, alrededor de +11 ms. Son fenómenos solapados con inicio diferente; no se suman como si fueran un único bloqueo secuencial.

Recepción, sincronización de VFX y renderizado comparten el bucle de eventos del Worker gráfico. Ese coste puede retrasar los ACK y la aplicación de estados. El host alcanza su límite de publicaciones pendientes. No se ha demostrado aquí cuánto del retraso total corresponde a raycasts, mantenimiento de claves de materiales, renderizado u otras tareas; no se presenta la discrepancia de tiempo simulado como una duración de compilación.

## Corrección de las cifras anteriores

El registrador antiguo de rAF conserva el timestamp anterior aunque se active la medición después. Su primer intervalo puede empezar antes de la ventana solicitada. En la segunda ejecución, el máximo publicado por el harness fue 12,167 s, mientras que el intervalo inicial observado desde la marca de traza hasta el primer rAF fue aproximadamente 3,301 s. No son ventanas iguales. La captura ampliada sí registra un intervalo completo de 10,400 s, ocurrido durante la preparación pausada, y lo atribuye a scopes concretos de sombras/DXC.

Las métricas agregadas antiguas se conservan como datos crudos, pero no deben emplearse como duración precisa de un bloqueo dentro de la incursión. No se ha cambiado el registrador anterior durante el diagnóstico; el nuevo análisis usa timestamps y marcas explícitas.

## Evidencia y reproducción

Carpeta [raid-stall-traces-20261104](raid-stall-traces-20261104/), con cuatro trazas comprimidas, metadatos, muestras crudas y resúmenes. `manifest.json` contiene SHA-256 del JSON original; se verificó la descompresión contra los originales. Las trazas se pueden abrir en un visor de trazas Chromium/Perfetto; para un visor que no acepte gzip, descomprimir primero. Se incluye una [revisión independiente](raid-stall-trace-independent.md) de las dos primeras capturas.

Con Vite en `http://127.0.0.1:5175`:

```powershell
$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:QA_ONLY_SKIP_LEGACY='1'
$env:QA_REPEATS='1'
$env:QA_WINDOW_MS='15000'
$env:QA_TRACE_INVENTORY='1'
$env:QA_TRACE_EARLY='1'
$env:QA_OUT_FILE='.cache/raid-stall-reproduction-run.jsonl'
$env:QA_TRACE_PATH='.cache/raid-stall-reproduction.json'
.\.cache\tooling\node20.exe tools/experiments/measure_webgpu_stable_raid.mjs
.\.cache\tooling\node20.exe tools/experiments/analyze-raid-stall-trace.mjs .cache/raid-stall-reproduction.json
```

El helper sólo instrumenta la sesión de prueba: las sondas se insertan en la respuesta del módulo Worker mediante Playwright y no modifican módulos del juego. Las categorías incluyen `gpu.dawn` y `disabled-by-default-gpu.dawn`, conforme al [registro de Dawn en Chromium](https://chromium.googlesource.com/experimental/chromium/src/+/HEAD/gpu/command_buffer/service/dawn_platform.cc). La creación de pipelines permanece tal como la ejecuta el juego; no se precalienta, no se dibujan objetos fantasma y no se sustituyen algoritmos.

Conclusión del alcance pedido: se ha localizado y documentado la cadena dominante del bloqueo reproducido. Quedan límites de instrumentación del controlador y de atribución individual de cada variante, expresados arriba. No se ha aplicado ni evaluado una solución en este trabajo.
