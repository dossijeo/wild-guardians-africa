# Hierba WebGPU: espera en admisión y prioridad experimental

Fecha: 2026-11-08. La variante Worker y la política de prioridad se instrumentaron únicamente en QA; ninguna está activada en producción.

## Causa observada

La prueba anterior generó geometrías sin llegar a mostrarlas. En una incursión WebGPU con el perfil temporal de producto, se identificaron las solicitudes de admisión de hierba y su posición y antigüedad en la cola. En dos ejecuciones FIFO, las doce seguían en espera al final. La primera llevaba aproximadamente **24,7 s** en cola y tenía respectivamente ocho y siete solicitudes delante. La entrada ya estaba en cola unos 14–15 s antes de comenzar la ventana de medición, que sigue a la preparación y diez segundos de espera inicial. Esto demuestra espera en la cola de admisión; no demuestra cuál de las compilaciones precedentes domina el tiempo ni cuánto corresponde a CPU o GPU.

La alternativa de QA selecciona hasta dos solicitudes de hierba por cada solicitud normal cuando hay ambas, manteniendo FIFO dentro de cada clase. No interrumpe la operación activa ni garantiza un límite de tiempo si una preparación queda bloqueada. Se usa el mismo Worker de generación experimental en todas las ejecuciones: la comparación aísla la selección de la cola instrumentada, no compara el Worker con la implementación original de producción.

| Ejecución | Selección | Grupos visibles al inicio → final | Hierba pendiente en cola al final | Total cola al final | Intervalo medio Worker gráfico, ms | Máximo Worker, ms |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| B1 | FIFO | 0 → 0 | 12 | 88 | 545 | 1.334 |
| B2 | Prioridad | 12 → 12 | 0 | 72 | 606 | 1.316 |
| B3 | Prioridad | 12 → 12 | 0 | 76 | 601 | 1.388 |
| B4 | FIFO | 0 → 0 | 12 | 87 | 496 | 1.397 |

La cola siguió completando otras compilaciones después de despachar las solicitudes de hierba en B2 y B3; ello no acredita ausencia de inanición en todos los escenarios ni acota el tiempo de espera. La prioridad restaura la aparición de hierba en estas dos ejecuciones, pero no elimina los tirones ni demuestra una mejora de rendimiento global. Se observaron aproximadamente 15–19 intervalos del Worker gráfico por ejecución; son callbacks instrumentados, no tiempos de presentación confirmados por GPU. La cronología temporal llegó a 32 publicaciones pendientes y el retraso visual rondó 4–5 s en las cuatro ejecuciones. Los escenarios avanzaron a ritmos distintos y no hay mediciones GPU, memoria ni comparación visual completa. Había cambios locales ajenos; las cifras no son reproducibles desde un commit limpio sin restaurar ese entorno.

Datos: [FIFO B1](webgpu-grass-admission-b1-20261108.jsonl), [prioridad B2](webgpu-grass-admission-b2-20261108.jsonl), [prioridad B3](webgpu-grass-admission-b3-20261108.jsonl), [FIFO B4](webgpu-grass-admission-b4-20261108.jsonl). La captura del candidato se revisó para confirmar que había hierba; no constituye una prueba de paridad visual completa.

## Reproducción

Aplicar primero `git apply --unidiff-zero tools/experiments/grass-worker-owner-experiment.patch`. Iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true` y `VITE_WEBGPU_TEMPORAL_GRASS=true`. Ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_GRASS_ADMISSION_DIAGNOSTICS=1` y `QA_GRASS_WORKER=1`. Para la alternativa añadir `QA_GRASS_PRIORITY=1`. La instrumentación modifica las respuestas de desarrollo, no los módulos de producción; la identidad de cada grupo se usa solo para el experimento. `QA_REQUIRE_VISIBLE_GRASS=1` rechaza una ventana sin hierba visible al final.

Antes de integrar una política de prioridades hay que definir una clasificación general de trabajos visibles, verificar equidad y cancelaciones, comprobar que no perjudica a personajes o terreno y medir el coste total en escenas equivalentes. También queda por resolver el crecimiento de la cola temporal y los bloqueos del Worker gráfico. No se ha aceptado una mejora global ni completado la migración.
