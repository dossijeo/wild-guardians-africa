# Generación auxiliar de hierba con reutilización temporal

Fecha: 2026-11-08. Se adaptó el prototipo de Worker auxiliar a la reutilización de hierba integrada después del experimento anterior. Las solicitudes transportan los nueve fragmentos vecinos y obstáculos clonados, y transfieren los buffers resultantes. Antes de admitir cada resultado se comprueban identidad y revisión del terreno, ocupación, calidad, visibilidad y cancelación. La suspensión cancela la generación pendiente y la reanudación conserva la reutilización existente. El parche está archivado en [grass-worker-reuse-experiment.patch](../../tools/experiments/grass-worker-reuse-experiment.patch); **no está activado en producción**.

La prueba dirigida añade rechazo de resultados anteriores a cambios de ocupación, suspensión y retirada de terreno. Con el parche pasaron 20 pruebas de generación, transferencia, cola, propietario y recuperación; al restaurar producción pasaron 19. La comparación de datos incluye sabana, gran río y manglares, pero no cubre todas las situaciones de juego ni verifica por sí sola la imagen.

## Incursión WebGPU

Se comparó A/B/B/A con la incursión guardada de sabana, ocho animales, WebGPU temporal y el parche de morph integrado. A genera en el Worker gráfico; B utiliza el Worker auxiliar mediante una inyección de QA. Ambas variantes usan la **misma prioridad experimental de admisión**: hasta dos solicitudes de hierba por una normal cuando ambas esperan. La prioridad no interrumpe una compilación ni garantiza un tiempo máximo. Este ensayo compara la generación con esa política, no demuestra qué ocurriría con la cola FIFO de producción. En B se verificó la intercepción; las cuatro ejecuciones fueron válidas y mantuvieron hierba visible.

| Ejecución | rAF principal media / p95 / p99 / máximo, ms | Callbacks gráficos: cantidad / intervalo medio / máximo, ms | Retraso intermedio / final, s | Pendientes finales | Hierba visible inicio → final |
| --- | --- | --- | --- | --- | --- |
| A1 | 38,3 / 66,7 / 100,0 / 133,3 | 28 / 351 / 727 | 2,45 / 5,60 | 18 | 12 → 12 |
| B2 | 37,6 / 66,7 / 66,7 / 100,0 | 37 / 271 / 751 | 2,50 / 5,40 | 27 | 12 → 13 |
| B3 | 37,6 / 66,7 / 66,7 / 100,0 | 40 / 264 / 724 | 2,10 / 5,20 | 26 | 12 → 13 |
| A2 | 36,4 / 66,7 / 100,0 / 100,1 | 31 / 332 / 762 | 2,20 / 5,75 | 28 | 12 → 13 |

Hay más callbacks gráficos en B en esta serie y un p99 principal menor; el máximo gráfico y el retraso siguen siendo importantes. Las secuencias y generaciones alcanzadas difieren, las lecturas de retraso son asíncronas y solo hay 28–40 callbacks entre inspecciones. Estos intervalos no son fotogramas presentados físicamente. No se midieron GPU, memoria ni coste completo de clonación y transferencia; no hay evidencia suficiente de mejora global y ausencia de regresiones bajo carga o en otros biomas.

En capturas separadas con la simulación pausada, ambas variantes tenían 12 grupos visibles, 25 fragmentos y el mismo tiempo de simulación, aunque las secuencias eran 55 y 59. La comparación de 1.280 × 720 encontró 28.459 píxeles distintos; 73 estaban en el rectángulo central (x=200–1059, y=175–584), y la interfaz animada explica una parte visible de las diferencias. Las imágenes [A](webgpu-grass-worker-reuse-paused-a-20261108.png) y [B](webgpu-grass-worker-reuse-paused-b-20261108.png) muestran cobertura similar, pero no prueban paridad completa ni los cambios de cámara, terreno y calidad.

Datos: [A1](webgpu-grass-worker-reuse-a1-20261108.jsonl), [B2](webgpu-grass-worker-reuse-b2-20261108.jsonl), [B3](webgpu-grass-worker-reuse-b3-20261108.jsonl), [A2](webgpu-grass-worker-reuse-a2-20261108.jsonl), [pausada A](webgpu-grass-worker-reuse-paused-a-20261108.jsonl), [pausada B](webgpu-grass-worker-reuse-paused-b-20261108.jsonl). La copia QA del guardado recibe la versión espacial y una pausa; había cambios locales ajenos al experimento.

## Decisión y reproducción

La señal justifica continuar: es necesario convertir la prioridad en un contrato justo y verificable, estudiar fallos y saturación del Worker, cuantificar transferencia y memoria, y repetir con cámaras, revisiones, manglares, helechos y otros escenarios. Hasta entonces se conserva la generación anterior. Mover trabajo de hierba no elimina la preparación síncrona de nodos Three.js ni resuelve por sí solo la acumulación temporal.

Aplicar el parche experimental con `git apply --unidiff-zero tools/experiments/grass-worker-reuse-experiment.patch` y ejecutar `node --test tests/grass-generation-queue.test.js tests/grass-chunk-data.test.js tests/webgpu-grass-owner.test.js tests/webgpu-grass-local-readmission-integration.test.js`. Para reproducir la incursión iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true`, `VITE_WEBGPU_TEMPORAL_GRASS=true`; ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_REQUIRE_VISIBLE_GRASS=1`, `QA_GRASS_ADMISSION_DIAGNOSTICS=1`, `QA_GRASS_PRIORITY=1` y una ruta `QA_OUT_FILE`. Añadir `QA_GRASS_WORKER=1` para B. `QA_PAUSED_SCREENSHOT` captura la vista pausada. Retirar el parche tras las pruebas.
