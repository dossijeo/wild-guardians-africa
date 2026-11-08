# Grafo compartido de trayectoria y fase

Se ha conectado al roster real de animales una opción experimental para compartir el grafo de fase precocinada y un buffer de muestras WebGPU, junto al almacén de trayectorias existente. Cada personaje conserva ranuras y parámetros independientes; las muestras se marcan por rangos, se mantiene el horizonte de tiempo confirmado y el ciclo de vida sigue la liberación diferida del roster. Con 64 actores y 64 segmentos, el nuevo buffer reserva 64 KiB de datos, además de las copias y estructuras internas del navegador; no se ha medido la memoria GPU real ni los bytes de transferencia. La liberación usa `_attributes` privado de Three r180.

La opción `VITE_WEBGPU_SHARED_PHASE_POOL=true` está **desactivada por defecto** y puede utilizarse con `VITE_WEBGPU_SHARED_MOTION_POOL=true`. Si se agotan las ranuras se conserva la vía de fase individual. No cambia la autoridad de simulación ni sus reglas. El cambio prepara una presentación que comparte el grafo completo, pero no elimina todas las variantes de materiales ni cubre todavía trabajadores, expresiones y casos físicos.

## Validación funcional

Dos rigs reales de hiena comparten el grafo compuesto de movimiento y fase manteniendo ranuras distintas. La [comparación WebGPU con lectura de píxeles](shared-phase-motion-20261108/) reprodujo dos hienas con fases y trayectorias diferentes en cinco instantes, actualizó la fase de una de ellas a mitad de la secuencia y detuvo la fase de la otra antes del final. La referencia y la candidata coincidieron píxel a píxel tanto sin sombras como con sombras visibles; en esta última prueba 613 píxeles cambiaron al desactivar los emisores de sombra. No se notificaron errores GPU. Esto cubre una especie, una cámara y una secuencia controlada; no demuestra paridad de ataques, contactos, recuperación, morphs o todos los biomas. La primera ejecución tras forzar la reoptimización de Vite falló con `Unsupported actor material`; la repetición con el servidor estabilizado pasó. No se ha aclarado la causa y debe investigarse antes de activar la vía por defecto.

Pasaron 195 pruebas dirigidas y la compilación Vite. La prueba de GPU completa y las pruebas aisladas están incluidas en los datos. Una incursión instrumentada mantuvo ocho ranuras de fase y ocho de movimiento activas, ocho animales visibles y cinco con marcha precocinada al final, sin errores de recursos notificados.

## Trabajo y rendimiento

En dos ejecuciones con la sonda de nodos, para cuatro familias de materiales y las mallas precocinadas sin rig, se registraron 113 construcciones en la referencia y 17 en la candidata. Ambas alcanzaron cinco animales precocinados y la misma cobertura de hierba en las inspecciones. Las cuentas incluyen la preparación anterior a la primera inspección; las secuencias no fueron idénticas y la sonda añade trabajo, por lo que no son una comparación limpia de FPS o tiempo CPU. Son evidencia de reducción de construcciones en este escenario, no de mejora global.

La comparación A/B/B/A sin esa sonda usó la misma incursión guardada de sabana, WebGPU en NVIDIA Turing, Worker auxiliar de hierba, admisión de iluminación compartida y almacén de movimiento activados en ambos casos. A desactiva únicamente el almacén de fase mediante QA; B usa la integración. Los intervalos gráficos son callbacks del Worker, no tiempo GPU ni fotogramas presentados físicamente.

| Ejecución | rAF media / p95 / p99 / máximo, ms | Worker: cantidad / intervalo medio / máximo, ms | Retraso visual final, s | Precocinados al final |
| --- | --- | --- | --- | --- |
| A1 | 37,60 / 66,67 / 66,70 / 100,02 | 101 / 100,75 / 296,84 | 3,60 | 4 |
| B1 | 38,03 / 66,67 / 66,71 / 100,00 | 99 / 101,99 / 401,37 | 4,15 | 5 |
| B2 | 38,71 / 66,68 / 100,01 / 100,06 | 99 / 101,44 / 374,17 | 3,75 | 5 |
| A2 | 37,82 / 66,68 / 66,70 / 66,71 | 95 / 106,01 / 271,07 | 3,75 | 5 |

Las cuatro ejecuciones fueron válidas y no notificaron errores de recursos. Los estados y secuencias finales difieren, las inspecciones son asíncronas y no se midieron tiempo GPU, memoria ni transferencia efectiva. La serie no demuestra una mejora global de fluidez: el p95 principal y el retraso siguen siendo elevados. La copia QA del guardado añade pausa y versión espacial; había cambios locales ajenos.

## Reproducción

Los [datos de la serie, las sondas y las pruebas GPU](shared-phase-motion-20261108/) incluyen los resultados sin resumir. Iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true`, `VITE_WEBGPU_TEMPORAL_GRASS=true`, `VITE_WEBGPU_GRASS_WORKER=true`, `VITE_WEBGPU_ADMISSION_SHARED_LIGHTS=true`, `VITE_WEBGPU_SHARED_MOTION_POOL=true` y `VITE_WEBGPU_SHARED_PHASE_POOL=true`. Ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_REQUIRE_VISIBLE_GRASS=1` y `QA_OUT_FILE`; añadir `QA_PHASE_POOL_BASELINE=1` para A y verificar `phasePoolBaselineOverrides`. Para la sonda añadir `QA_NODE_BUILD_DIAGNOSTICS=1` en ejecuciones separadas.

Con Playwright y Edge WebGPU, `QA_COMBINED_ONLY=1 node tools/experiments/audit_confirmed_gpu_motion_webgpu.mjs` ejecuta la comparación de rigs; añadir `QA_COMBINED_SHADOWS=1` prueba las sombras. Las pruebas dirigidas usan `node --test tests/three-webgpu-pipeline-patch.test.js tests/confirmed-gpu-phase-pool.test.js tests/confirmed-gpu-animation-phase.test.js tests/confirmed-gpu-motion-pool.test.js tests/confirmed-gpu-motion.test.js tests/webgpu-actor-motion-binding.test.js tests/webgpu-pipeline-admission.test.js tests/webgpu-animal-roster.test.js tests/webgpu-baked-walk.test.js`.
