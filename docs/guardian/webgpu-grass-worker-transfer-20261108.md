# Copias y cola del Worker de hierba

Fecha: 2026-11-08. Se midió la ruta optativa real `VITE_WEBGPU_GRASS_WORKER=true` en dos ejecuciones de la incursión de sabana, con WebGPU y hierba visible. El instrumento modifica solo en QA la cola del Worker gráfico: cronometra `structuredClone` y `postMessage`, estima el tamaño de los objetos clonados y cuenta los bytes de los tres buffers recibidos. La contabilidad recorre las solicitudes y añade trabajo; **estas ejecuciones no sirven para comparar FPS ni para afirmar una mejora de fluidez**.

Los contadores comienzan al crear la cola e incluyen carga inicial, espera de preparación y la ventana de 10 s; no son exclusivamente los 10 s de partida. En ambas ejecuciones se registraron 40 solicitudes, 35 envíos y 35 respuestas observadas; las solicitudes pueden cancelarse o reemplazarse antes del envío. Los tiempos de ida y vuelta se calculan entre la llamada `postMessage` y la recepción en el Worker gráfico, incluidos ejecución, copias internas, planificación y cualquier espera para procesar la respuesta. No se pudo interceptar el script del Worker anidado, por lo que **no se ha separado su tiempo de cálculo ni el coste exacto de transferencia**.

| Medida | Ejecución A | Ejecución B |
| --- | ---: | ---: |
| Copia explícita media / p95 / máximo, ms | 0,60 / 0,87 / 1,23 | 0,56 / 0,80 / 1,12 |
| Llamada `postMessage` media / p95 / máximo, ms | 0,44 / 0,98 / 1,25 | 0,44 / 0,62 / 1,30 |
| Ida y vuelta media / p95 / máximo, ms | 165 / 310 / 1.817 | 162 / 325 / 1.701 |
| Pico estimado de solicitudes retenidas | 3.674.188 bytes | 3.674.188 bytes |
| Máximo de solicitudes pendientes | 10 | 10 |
| Tamaño medio / máximo estimado por solicitud | 246.087 / 576.416 bytes | 246.087 / 576.416 bytes |
| Buffers de respuesta observados, total | 15.077.040 bytes | 15.077.040 bytes |

Los p95 se calculan sobre 35 o 40 operaciones, con el método de rango inferior, y son solo descriptivos. Las estimaciones de memoria cuentan objetos alcanzables en solicitudes activa y pendientes; no incluyen las fuentes originales del terreno, otras copias o búferes internos del navegador, memoria en el Worker auxiliar, GPU ni memoria de toda la partida. Los bytes de respuesta son acumulados, no memoria máxima residente. El máximo de ida y vuelta puede incluir la inicialización y no debe interpretarse como tiempo de cálculo puro. La propia estimación tardó una media de 0,36–0,38 ms por solicitud y puede alterar las colas observadas.

Estos resultados no justifican activar la opción por defecto: falta medir memoria total y cálculo en el Worker, probar saturación y recuperación en navegador y comparar cámaras y biomas. Para reducir copias hay que estudiar propiedad de snapshots y datos compartidos versionados; transferir las matrices del propietario destruiría su acceso local y no es una sustitución segura sin cambiar ese contrato. El límite actual de 64 solicitudes sigue siendo un límite de cantidad, no de bytes.

[Datos A](webgpu-grass-worker-transfer-a-20261108.jsonl), [datos B](webgpu-grass-worker-transfer-b-20261108.jsonl). Ambas indicaron WebGPU, Worker activo, ausencia de errores y 12/12/13 grupos visibles. La copia QA del guardado incluye una versión espacial y una pausa; había cambios locales ajenos. La prueba automática verifica la instrumentación con una cola simulada, no la precisión de memoria real del navegador.

Para reproducir, iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true`, `VITE_WEBGPU_TEMPORAL_GRASS=true`, `VITE_WEBGPU_GRASS_WORKER=true`. Ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_REQUIRE_VISIBLE_GRASS=1`, `QA_GRASS_TRANSFER=1` y un `QA_OUT_FILE`. La instrumentación exige que la cola se haya interceptado y que las muestras indiquen Worker activo. Ejecutar `node --test tests/grass-transfer-instrumentation.test.js tests/grass-generation-queue.test.js` para los contratos.
