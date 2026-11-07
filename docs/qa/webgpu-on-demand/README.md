# WebGPU: compilación bajo demanda

## Decisión y alcance

**No se ha demostrado que WebGPU elimine los tirones de primera aparición.** Con los diez modelos completos y sus clips, `compileAsync` redujo los máximos frente a la aparición inmediata en WebGPU, pero todavía produjo intervalos de varios cientos de milisegundos. Preparar con las luces de la escena de destino redujo algunas variantes tardías y mejoró parcialmente el resultado, sin satisfacer el criterio de ausencia de tirones. No se cambia el renderizador del juego ni se propone migrarlo todavía.

El laboratorio adjunto vive en `webgpu-on-demand.html` y `src/labs/webgpu-on-demand.js`. Se amplió para usar por defecto los GLB completos de cinco especies, cuatro trabajadores y guardián, con sus clips reales; también permite seleccionar los LOD originales del paquete, que no contienen clips. Los materiales son los materiales estándar de los GLB. La escena tiene suelo, dos luces, sombras, un marcador animado y los personajes que van apareciendo; **no es una incursión ni reproduce AfricanToon, terreno, streaming, VFX o todos los pases del juego**. No se dibujan modelos fantasma ni se compilan sus variantes durante la carga. La preparación de cada actor se inicia al solicitarlo; el control inmediato no llama a `compileAsync`.

## Hardware y metodología

Windows, Edge headless 156, 1280×900 de ventana, canvas 960×540, DPR 1, Three 0.180.0. `nvidia-smi` identifica una GTX 1660 con controlador 581.29; WebGL informa `NVIDIA GeForce GTX 1660` y WebGPU informa adaptador NVIDIA Turing y `renderer.backend.isWebGPUBackend`. WebGPU no usa el fallback WebGL. Las doce mediciones principales usaron `--enable-unsafe-webgpu` en Edge headless, además de desactivar las cachés HTTP y de shaders en disco del navegador. Una comprobación posterior también inicializó WebGPU real sin `--enable-unsafe-webgpu`; los ensayos finales sin ese parámetro se documentan aparte. No hay una GPU integrada disponible aquí.

Cada ejecución crea un navegador/contexto nuevo, carga y decodifica los diez modelos sin compilar sus pipelines, reinicia la telemetría y añade los diez, con 650 ms de espera **después de cada incorporación**. Luego retira las instancias, conserva modelos/materiales y repite en el mismo contexto. La primera situación se denomina **contexto nuevo**, no caché de controlador fría: desactivar la caché de disco del navegador no vacía ni verifica las cachés del sistema o del driver. La segunda es **caché caliente en el mismo contexto**. Se realizaron tres ejecuciones por combinación, alternando el orden; las secuencias inmediata y asíncrona tienen duraciones y ritmos de llegada diferentes. No son reproducciones de partida sincronizadas.

Se registran intervalos RAF completos, incluidos los superiores a dos segundos, duración CPU de `renderer.render`, tareas largas, tiempos de construcción, solicitud/retorno/resolución de `compileAsync`, incorporación y primer `onBeforeRender`. El primer callback demuestra envío CPU, no presentación física ni finalización de GPU. En la matriz original `msUntilVisible` significaba incorporación; el primer dibujo se calcula con `firstDrawAt - requestedAt`. La versión actual distingue `msUntilAdded` y `msUntilFirstDraw`. Las sondas de API y perfilador se ejecutaron aparte, no en la matriz principal. Tres repeticiones no proporcionan intervalos de confianza; en WebGPU inmediato solo hubo 13–14 intervalos RAF y sus percentiles no son estadísticamente sólidos.

## Resultados: contexto nuevo

La tabla muestra medianas de las tres ejecuciones; unidades en ms. `>16,7`, `>33,3` y `>50` son los conteos por ejecución, no porcentajes. El navegador headless se estabilizó alrededor de **33,3 ms** incluso en caliente, por lo que todos los fotogramas superan 16,7 ms y la cuenta >33,3 es muy sensible al redondeo de RAF; no debe interpretarse como una medición de pantalla a 60 Hz.

| Backend / incorporación | Media | p95 | p99 | Máximo | Muestras | >16,7 | >33,3 | >50 |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| WebGL2 inmediata | 100 | 667 | 1067 | 1100 | 97/92/100 | 97/92/100 | 82/79/88 | 15/14/15 |
| WebGL2 asíncrona | 54 | 200 | 500 | 667 | 173/162/169 | 173/162/169 | 157/145/147 | 14/18/17 |
| WebGPU inmediata | 550 | 1700 | 1700 | 1700 | 14/14/13 | 14/14/13 | 14/12/13 | 9/9/9 |
| WebGPU asíncrona | 76 | 400 | 600 | 700 | 156/153/155 | 156/153/155 | 135/136/134 | 34/33/32 |

Las cargas GLB registradas fueron de 3,87–4,24 s, sin contar la descarga inicial de la página y los módulos. En caliente, las doce repeticiones tuvieron media, p95 y p99 alrededor de 33,3–33,5 ms y cero intervalos >50 ms, con 231–237 muestras por secuencia. El resultado muestra reutilización efectiva **en este contexto y con estos materiales**, no ausencia de compilaciones de nuevas variantes durante una partida.

Una ejecución adicional de cada combinación con la versión final del laboratorio y **sin** `--enable-unsafe-webgpu` verificó de nuevo WebGPU real. Los máximos en contexto nuevo fueron 1.067 ms WebGL inmediato, 667 ms WebGL asíncrono, 2.100 ms WebGPU inmediato y 900 ms WebGPU asíncrono; en caliente, todos quedaron en 33–34 ms. La ejecución WebGPU inmediata solo contiene 16 intervalos, de los que nueve superaron 50 ms; no permite estimar percentiles estables. El valor de 2.100 ms confirma por qué se eliminó el filtro original que descartaba intervalos de más de dos segundos. Estos cuatro controles adicionales no sustituyen las tres repeticiones de la tabla. Datos: `results/wg-unforced-*.json`.

En las seis ejecuciones asíncronas, tanto en contexto nuevo como caliente, los diez actores se añadieron después de resolver la promesa y se observaron sus primeros dibujos sin detectar incorporación prematura. Esto comprueba el orden respecto a la promesa, no que todas las variantes finales de color y sombra estén listas: la traza identifica creaciones adicionales tras la incorporación. En una ejecución WebGPU se observaron 5–11 callbacks de render entre el retorno de la promesa y su resolución por modelo: la escena continuó avanzando, pero no necesariamente de forma fluida. El segmento desde terminar la preparación del actor hasta retornar `compileAsync` alcanzó 161–167 ms en las tres mediciones WebGPU asíncronas; incluye la incorporación a la escena de preparación y una actualización de texto. Pruebas posteriores con marcas exactas dentro de la llamada midieron hasta 184 ms con destino real y 186 ms con luces separadas. La promesa no convierte en asíncrono todo el trabajo previo a devolverla.

`check_webgpu_on_demand_failclosed.mjs` también ejecutó controles: con `navigator.gpu` ausente y con el adaptador deliberadamente no disponible, la página notificó error sin declarar WebGPU; el control WebGL informó explícitamente WebGL2. La segunda prueba cubre el caso en que Three intenta su fallback. Una pausa sintética de más de dos segundos produjo un intervalo registrado de 2.133 ms, comprobando que la telemetría ya no descarta esos casos. Resultado: `results/wg-failclosed.json`.

Datos completos, con todos los conteos, tiempos de carga, muestras y latencias: [summary.json](summary.json) y `results/wg-full-*.json`. Las capturas [WebGPU](webgpu-full.png) y [WebGL2](webgl-full.png) son ilustrativas, de momentos distintos; no prueban equivalencia visual ni equivalencia con el juego.

## Qué trabajo permanece

Una ejecución de diagnóstico WebGPU asíncrona con la escena de preparación separada observó 17 llamadas `createRenderPipelineAsync` y 82 `createRenderPipeline` durante la secuencia. Las llamadas síncronas retornaron individualmente en menos de 0,1 ms en esa traza, lo que **no demuestra** que el compilador o la GPU hayan terminado entonces. También se observaron 31 `copyExternalImageToTexture`; la mayor tardó unos 121 ms en CPU. El perfil de CPU incluyó muestras en esa copia. Otra traza WebGL2 asíncrona observó 33 `getProgramInfoLog` que sumaron aproximadamente 2,09 s de tiempo de llamada, y llamadas `texSubImage2D` de hasta 268 ms. Son trazas instrumentadas separadas; los tiempos se solapan con otras mediciones y no deben sumarse como tiempo de fotograma ni atribuir todos los picos a una única causa.

En otra prueba diagnóstica WebGPU se solicitó `queue.onSubmittedWorkDone()` después del primer dibujo de cada actor. Con contexto nuevo sus promesas se resolvieron 426–929 ms después de solicitarlas; en caliente, aproximadamente 2–15 ms. Es latencia de cola y entrega de promesa: incluye trabajo previo y planificación del hilo, **no es una medición del tiempo GPU de ese actor**. No se midieron timestamps GPU ni memoria residente, y no se puede aislar completamente compilación, subida y contención del controlador. Los perfiles y trazas `results/wg-{trace,profile}-*.json` conservan marcas y limitaciones.

En las trazas calientes no se observaron nuevas creaciones de shader ni de pipeline WebGPU, ni nuevos programas WebGL. Sí continuaron las asignaciones por instancia: 692–890 llamadas `createBuffer` en WebGPU y 39 `createTexture` en WebGL en las dos variantes trazadas. El laboratorio libera los esqueletos de las instancias al retirarlas, pero conserva los assets y materiales. Estas cifras son llamadas API, no tamaños de memoria ni prueba de que las mismas asignaciones ocurran en la partida real.

## Variante con luces de la escena de destino

La opción `target=live` pasa la escena visible como tercer argumento a `compileAsync` y no duplica sus luces en la escena de preparación. Sigue siendo preparación individual bajo demanda, sin dibujos ocultos. En una secuencia A/B/B/A WebGPU asíncrona, los máximos de contexto nuevo fueron 800/700 ms con luces separadas y 533/633 ms con destino real; los p99 fueron 700/633 y 400/433 ms, respectivamente. En una traza diagnóstica, el total de llamadas síncronas a creación de pipeline bajó de 82 a 42, mientras las asíncronas subieron de 17 a 53. Las cargas y la distribución de frames no están completamente controladas y la instrumentación modifica el coste. La variante es prometedora para estudiar variantes posteriores, pero aún tiene tirones perceptibles y no justifica producción. Datos: `results/wg-target-*.json` y `results/wg-profile-webgpu-async-live.json`.

## Compatibilidad para una posible migración

- `src/rendering/african-toon.js` y otros 21 archivos de rendering contienen `onBeforeCompile` o claves personalizadas. Three 0.180 documenta esos hooks como específicos de `WebGLRenderer`; requieren una traducción visualmente equivalente a TSL/NodeMaterial, incluidos tintes, piel, terreno y sus variantes.
- Al menos 17 archivos de rendering/UI utilizan `ShaderMaterial` o `RawShaderMaterial`; los shaders GLSL de agua, cielo, guardián, vegetación y VFX necesitan adaptación y validación, no basta con el fallback WebGL de `WebGPURenderer`.
- `native-shadow.js`, `depth-capture.js`, `destruction-native.js` y los pases de agua, postprocesado y máscaras dependen de destinos de render, texturas de profundidad, estado y recetas GL. Hay que portar sombras PCF/cacheadas y profundidad de destrucción manteniendo sus resultados.
- Instancing, rigs, morph targets y `AnimationMixer` existen en Three WebGPU y los diez modelos completos se dibujaron aquí, pero eso no valida los lotes, LOD, ragdolls, efectos, reconciliación ni CPU/GPU de la partida.
- La gestión actual usa pérdida/restauración del contexto WebGL, extensiones, fences y contadores propios; WebGPU usa pérdida de dispositivo y necesita reconstrucción y fallback probados. El laboratorio registra la pérdida, pero no implementa recuperación.

La evaluación previa `origin/codex/webgpu-renderer-evaluation` estudió rendimiento sostenido en Intel integrada y tampoco probó esta hipótesis de compilación bajo demanda. Su auditoría de Three r180 y materiales es útil, pero sus resultados no sustituyen la matriz nueva en NVIDIA.

## Reproducción

Con las dependencias del repositorio instaladas, iniciar Vite en `127.0.0.1:5175` y abrir `/webgpu-on-demand.html`. Los selectores preservan backend, modelos y destino de compilación. Para automatizar la matriz, instalar o localizar Playwright y ajustar `NODE_PATH`/`PLAYWRIGHT_MODULE` si procede:

```powershell
$env:WG_BASE_URL='http://127.0.0.1:5175'
node tools/experiments/run_webgpu_on_demand_matrix.mjs docs/qa/webgpu-on-demand/results
node tools/experiments/summarize_webgpu_on_demand.mjs docs/qa/webgpu-on-demand/results
```

El runner actual no fuerza WebGPU por defecto; `WG_UNSAFE_WEBGPU=1` reproduce el parámetro usado en la matriz principal. Para una única ejecución usar `WG_BACKEND=webgl|webgpu`, `WG_MODE=direct|async`, `WG_SOURCE=full|lod`, `WG_TARGET=separate|live` y `WG_OUTPUT`. `WG_TRACE=1`, `WG_CPU_PROFILE=1` y `WG_QUEUE_FENCE=1` activan instrumentación diagnóstica y no deben mezclarse con las mediciones limpias.
