# Decodificador HUD: reevaluación tras integrar la hierba

La [nueva traza](webgpu-grass-integrated-trace-20261108.md) vuelve a mostrar copias del HUD en el hilo principal y compilación gráfica simultánea. Se reevaluó la alternativa de reducir copias manteniendo una preparación transaccional; también se consideraron compartir estructuralmente entidades y proyectar en otro Worker, opciones que requieren contratos de propiedad y sincronización adicionales. La alternativa ensayada no modifica el protocolo ni el orden de eventos.

Durante la revisión se detectó que el candidato anterior permitía a un validador retener la referencia de una preparación pendiente. El candidato reforzado hace una copia de aislamiento antes de exponer y confirmar la preparación. Se añadió una prueba específica, además de pruebas de rechazo y reintento. El parche reversible está en `tools/experiments/hud-decoder-isolated-experiment.patch` y el módulo de comparación en `tools/experiments/hud-decoder-isolated-candidate.mjs`. El código de producción permanece en su versión anterior.

## Componente

El benchmark usa 41 publicaciones generadas por Wild Engine real y compara exactamente las salidas en cuatro pasadas A/B/B/A; incluye validación de esquema. Se hicieron dos ejecuciones de 160 muestras por variante. En la primera, media/p95/p99 fueron 78,12/81,29/86,99 ms para la referencia y 56,23/58,37/59,19 ms para el candidato. En la segunda fueron 77,00/78,86/95,31 y 59,03/76,61/131,87 ms respectivamente. El candidato elimina 121 llamadas `structuredClone` de 90.148, incluidas copias completas, pero siguen siendo numerosas; la segunda ejecución mostró un p99 mayor. Son medidas aisladas de Node, no tiempos de fotograma. La primera coincidió parcialmente con otras pruebas; la segunda se ejecutó después. [Primera](webgpu-hud-isolated-component-20261108.json), [segunda](webgpu-hud-isolated-component-repeat-20261108.json).

Pasaron 128 pruebas dirigidas con el candidato, incluidas nuevas comprobaciones de rechazo, reintento, aislamiento frente a un validador que conserva referencias, orden de publicaciones y eventos. Tras restaurar la producción pasaron 126 pruebas de la misma selección; las dos nuevas están incluidas en el parche experimental.

## Incursión WebGPU

Con la hierba integrada se repitió A/B/B/A sobre la captura de sabana, 25 s nominales, perfil temporal de producto y consultas GPU de QA. A sustituye el módulo por la referencia `168fb9d4f`; B usa el candidato reforzado aplicado al árbol en el momento de la prueba. Se verificaron dos intercepciones en cada A, WebGPU y ocho grupos visibles en las tres inspecciones. El adaptador informó NVIDIA/Turing; no se obtuvo el modelo exacto.

| Ejecución | rAF principal media / p95 / p99 / máximo ms | Worker gráfico media / máximo ms | GPU media ms (muestras) | Retraso visual intermedio / final s |
| --- | --- | --- | --- | --- |
| A1 | 53,1 / 100,0 / 633,3 / 1.133 | 378 / 2.067 | 65,7 (8) | 6,05 / 7,15 |
| B1 | 49,2 / 66,7 / 600,0 / 1.100 | 307 / 1.570 | 55,2 (10) | 7,20 / 6,85 |
| B2 | 48,3 / 66,6 / 633,3 / 1.200 | 342 / 2.037 | 43,0 (8) | 7,65 / 7,50 |
| A2 | 50,8 / 66,7 / 633,3 / 1.100 | 353 / 1.573 | 61,8 (9) | 6,25 / 7,30 |

Los intervalos del Worker son callbacks instrumentados, no tiempos de presentación física. El GPU corresponde a muestras válidas entre la primera y segunda inspección, con 8–10 muestras por ejecución: no permite establecer p95/p99 fiables ni concluir una mejora GPU. Los retrasos son consultas asíncronas y las simulaciones alcanzaron secuencias distintas. El p95 de una referencia coincide con el de las candidatas, los p99 siguen siendo grandes y las dos lecturas intermedias de retraso son mayores en B. No se puede atribuir causalidad ni demostrar una mejora global y ausencia de regresión; la cola temporal terminó con 32 publicaciones pendientes en las cuatro ejecuciones. Se ha descartado la integración por ahora.

Datos: [A1](webgpu-hud-isolated-a1-20261108.jsonl), [B1](webgpu-hud-isolated-b1-20261108.jsonl), [B2](webgpu-hud-isolated-b2-20261108.jsonl), [A2](webgpu-hud-isolated-a2-20261108.jsonl). Las mediciones de una variante anterior sin la copia de aislamiento no se usan para esta decisión. La captura QA añade temporalmente la versión espacial necesaria para restaurarla y el árbol tenía modificaciones locales ajenas sin confirmar.

## Reproducción

Ejecutar `.cache/tooling/node20.exe --expose-gc tools/experiments/benchmark-hud-decoder.mjs` para el componente. Para las pruebas de contrato, aplicar `git apply --unidiff-zero tools/experiments/hud-decoder-isolated-experiment.patch`, ejecutar la selección de tests HUD y publicaciones y retirar el parche después. Para WebGPU iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true`, `VITE_WEBGPU_TEMPORAL_GRASS=true` y ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=25000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_GPU_TIMESTAMPS=1`, `QA_REQUIRE_VISIBLE_GRASS=1`. Alternar `QA_HUD_BASELINE=168fb9d4f` con `QA_HUD_CANDIDATE=1` y `QA_HUD_CANDIDATE_PATH=tools/experiments/hud-decoder-isolated-candidate.mjs`, sin definir ambas variantes simultáneamente.
