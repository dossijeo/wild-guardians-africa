# Reutilización de hierba: integración, reversión y medición GPU

La presentación WebGPU reutiliza la geometría de hierba ya admitida tras una suspensión cuando coinciden la ocupación, la calidad y las dependencias de terreno y agua. Las revisiones e identidades de los fragmentos y sus vecinos se comprueban antes de reutilizar. Los cambios de agua y terreno invalidan los fragmentos afectados; los candidatos pendientes siguen sujetos a cancelación y validación de sus dependencias. La simulación y su física no cambian.

La optimización se aplica únicamente si el propietario exige revisiones de terreno. Sin ese contrato se conserva la reconstrucción completa, porque una malla podría cambiar en memoria sin cambiar de identidad. Para volver a la reconstrucción completa aun con revisiones, establecer `VITE_WEBGPU_GRASS_RESUME_REUSE=false` y reiniciar Vite o reconstruir el producto; la variable se incorpora en el build. La ruta de referencia también puede inyectarse durante QA con `QA_GRASS_BASELINE=d539d86ef`.

## Comprobaciones

Pasaron 54 pruebas de generación, propietario y cronología. `tools/experiments/check_grass_reuse_equivalence.mjs` comparó los buffers de la referencia, la ruta integrada, la reversión y la ruta sin revisiones para sabana, gran río, manglares y helechos. Usa terreno controlado y generado por Wild Engine; el manglar generado activa `mangroveNetwork:true`. Comprueba cambios de altura, máscara, agua entre vecinos y ocupación, además de una mutación en memoria sin revisión. En las fases comunes, la referencia y la reversión ejecutaron 18 admisiones y la ruta integrada 13 en cada configuración; la fase final adicional comprueba el fallback sin revisión.

En una incursión real WebGPU se forzó una reanudación mientras la simulación estaba pausada: con la integración, ocho grupos permanecieron visibles; con el interruptor de reversión pasaron de ocho a cero y se reconstruyeron después. Son comprobaciones de arranque y transición, no una campaña completa. [Integración](webgpu-grass-reuse-integrated-smoke-20261108.jsonl), [reversión](webgpu-grass-reuse-rollback-smoke-20261108.jsonl). El build WebGPU de Vite pasó; advierte de chunks grandes.

La comparación A/B/B/A previa de 25 s observó 314 y 340 generaciones en la referencia frente a 140 y 165 con reutilización, y la cobertura se mantuvo en las inspecciones candidatas mientras desaparecía al final de las referencias. No se observaron los mismos estados exactos y la referencia visualmente incompleta no es una comparación válida de FPS. Véanse [datos y límites](webgpu-grass-reuse-long-20261108.md) y [capturas y paridad parcial](webgpu-grass-reuse-visual-20261108.md). Los máximos y el retraso de presentación siguen siendo altos.

## Consultas de tiempo GPU

Se añadió una instrumentación exclusivamente de QA: `QA_GPU_TIMESTAMPS=1` solicita `timestamp-query`, muestrea como máximo una vez cada 500 ms y resuelve la consulta asincrónicamente sin esperar en el bucle de dibujo. Solo se incluyen muestras con pares y offsets completos; cuando Three expone estados de consulta, también exige que todos hayan terminado. Se miden los pases WebGPU incluidos en el renderizado muestreado, no el tiempo de compilación del driver ni la memoria. La instrumentación altera la carga y los tiempos de resolución no fijan con exactitud los límites de la ventana.

En la primera mitad de cuatro ejecuciones A/B/B/A, ambas rutas mostraban ocho grupos en las inspecciones que delimitan el intervalo. El adaptador reportó NVIDIA/Turing y soporte de `timestamp-query`; el navegador no informó del modelo exacto. La referencia perdió cobertura después, por lo que no se compara la segunda mitad:

| Ejecución | Muestras GPU | Media / máximo GPU ms | Intervalos Worker: media / máximo ms | p95 / p99 rAF principal ms |
| --- | ---: | --- | --- | --- |
| A1 | 8 | 62,5 / 96,9 | 589 / 2.167 | 66,7 / 566,7 |
| B1 | 8 | 61,5 / 92,2 | 354 / 2.023 | 66,7 / 600,1 |
| B2 | 9 | 46,3 / 98,9 | 348 / 1.952 | 66,7 / 666,6 |
| A2 | 8 | 67,8 / 99,9 | 521 / 2.068 | 66,7 / 566,6 |

Los intervalos del Worker y el rAF de la tabla cubren la ventana completa, incluida la pérdida de cobertura en A, y no son equivalentes a presentación física ni a CPU o tiempo GPU. Con solo ocho o nueve muestras GPU no se puede establecer p95/p99 fiables ni demostrar una mejora o ausencia de regresión GPU. Las secuencias finales y el trabajo de las dos rutas también difieren. Al final persistían retrasos de presentación de aproximadamente 8–9 s; no se declara resuelta la fluidez ni una mejora global de FPS.

Datos: [A1](webgpu-grass-gpu-a1-20261108.jsonl), [B1](webgpu-grass-gpu-b1-20261108.jsonl), [B2](webgpu-grass-gpu-b2-20261108.jsonl), [A2](webgpu-grass-gpu-a2-20261108.jsonl). La captura QA ajusta temporalmente su versión espacial para restaurarla y había modificaciones locales ajenas sin confirmar.

Los archivos de esta serie contienen las muestras en `samples[].gpuTimestamps`; su campo textual `scope` conservó por error la frase anterior «no GPU timestamps». Se ha corregido para las ejecuciones posteriores; los datos numéricos archivados no se han modificado.

## Reproducción

Ejecutar `.cache/tooling/node20.exe tools/experiments/check_grass_reuse_equivalence.mjs` desde la rama actual. Para el ensayo real, iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true` y `VITE_WEBGPU_TEMPORAL_GRASS=true`. Ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=25000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_GPU_TIMESTAMPS=1` y `QA_REQUIRE_VISIBLE_GRASS=1`; añadir `QA_GRASS_BASELINE=d539d86ef` para la referencia. La telemetría conserva `valid` e `invalidReasons`, muestras, soporte e incidencias. Para comprobar el interruptor con el ciclo pausado usar `QA_FORCE_GRASS_RESUME=1` y `QA_PAUSED_SCREENSHOT=<archivo>` sin consultas GPU.

Las siguientes tareas son reducir la acumulación temporal y los bloqueos restantes, ampliar las capturas a otros biomas y obtener mediciones GPU más numerosas y comparables. Esta integración no concluye el objetivo general de rendimiento.
