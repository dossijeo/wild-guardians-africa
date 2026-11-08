# Incursión WebGPU: cola de presentación y reconstrucción de hierba

Fecha: 2026-11-08. Investigación de rendimiento; no es una integración de producción.

## Hallazgos

La traza previa de la incursión nativa contiene una tarea del Worker gráfico de aproximadamente 2.187 ms. En su perfil CPU aparecen muestras atribuidas a `sampleGrassTerrain` (~779 ms), `generateGrassTile` (~499 ms), `nearGrassWater` (~172 ms) y `nearWaterChunk` (~95 ms). Son tiempos aproximados de muestras de pila, no medidas independientes sumables ni tiempos GPU. La ruta observada pasa por `onGroundContactChange`, `biome`, `confirmed`, `flush`, `resume`, `syncState` y `refreshAll`: al reanudar el subsistema se regenera hierba para muchos fragmentos aunque parte de sus dependencias no haya cambiado. Hay también acumulación de publicaciones confirmadas entre el host y el Worker gráfico.

Los intervalos de `requestAnimationFrame` del hilo principal **no miden** la frecuencia de presentación del Worker gráfico. El instrumento opcional registra además intervalos entre entradas a `draw` dentro de ese Worker; son intervalos de callbacks instrumentados, no presentaciones confirmadas por GPU ni timestamps GPU.

## Comparación exploratoria

Se probó una propuesta que conserva geometría visible cuando coinciden terreno, revisión, agua, ocupación y calidad, e invalida vecinos afectados. El parche y su prueba unitaria quedan en `tools/experiments/grass-resume-reuse-experiment.patch`; no se aplica a producción. La comparación usa la misma incursión guardada de ocho animales, un inicio pausado durante la preparación, WebGPU real en adaptador NVIDIA Turing, 10 s de ventana nominal, y la variante experimental `QA_STABLE_MORPH=1` en **ambas** ejecuciones. Esa variante no forma parte del producto. El escenario de QA modifica la versión del mundo de la captura para permitir la restauración; no es una campaña completa. También había cambios locales ajenos a esta investigación, por lo que no puede afirmarse reproducción exacta desde un commit limpio.

| Medida exploratoria | Referencia A3 | Candidato B3 |
| --- | ---: | ---: |
| Candidatos de hierba, primera → última inspección | 15 → 119 | 15 → 95 |
| Grupos visibles en la última inspección | 0 | 8 |
| Intervalos entre callbacks del Worker, número | 16 | 24 |
| Intervalo medio Worker, ms | 567 | 427 |
| Intervalo máximo Worker, ms | 2.119 | 932 |
| p99 del rAF principal, ms | 100,0 | 100,0 |
| Publicaciones pendientes en la cronología del Worker al final | 14 | 26 |

Los dos recorridos no alcanzan exactamente el mismo estado ni reciben los mismos eventos durante la ventana. Hay solo tres inspecciones asíncronas, pocas muestras del Worker y una ejecución por variante; la latencia de inspección introduce incertidumbre. No se puede atribuir una mejora global ni demostrar equivalencia visual a partir de esta pareja. Las colas y los intervalos del Worker siguen siendo excesivos. Se descarta su integración por ahora, no se declara cerrado el problema y no se modifica el comportamiento de la hierba en producción.

Datos completos: [referencia A3](webgpu-grass-resume-a3-20261108.jsonl) y [candidato B3](webgpu-grass-resume-b3-20261108.jsonl). La traza original está descrita en [el informe de la incursión](webgpu-native-horde-trace-20261108.md).

## Reproducción

Con un servidor Vite y el entorno de Playwright del repositorio configurados, ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1` y `QA_STABLE_MORPH=1`. `QA_GRASS_BASELINE=d539d86ef` sustituye solo el módulo de hierba por la referencia en el servidor de prueba; sin ese parámetro se usa el módulo local. Para probar el candidato hay que aplicar previamente el parche experimental sobre su base compatible y ejecutar sus pruebas; debe retirarse después. El script comprueba que se aplicó la sustitución y que el backend reporta WebGPU. Los diagnósticos de cola no pueden combinarse con `QA_TRACE_INVENTORY=1` en la misma ejecución.

El siguiente obstáculo es reducir o sacar del Worker gráfico el trabajo de preparación que sigue bloqueando su bucle, y controlar el crecimiento de las publicaciones sin perder eventos confirmados. Antes de integrar una solución deben repetirse las comparaciones con estados equivalentes, condiciones normales de shaders, comprobación visual y medición separada de tiempos de presentación, latencia de simulación y GPU.
