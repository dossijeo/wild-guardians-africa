# Reutilización de hierba: comparación prolongada y equivalencia de datos

Fecha: 2026-11-08. El parche `grass-resume-reuse-experiment.patch` no está integrado en producción.

## Equivalencia controlada

`tools/experiments/check_grass_reuse_equivalence.mjs` compara el propietario del parche con el código original de `d539d86ef`. Genera tres fragmentos adyacentes de terreno y contrasta exactamente los buffers de instancias visibles y sus cantidades tras el inicio, reanudación sin cambios, modificación de alturas y revisión, agua junto al borde entre vecinos y cambio de ocupación. La referencia preparó 15 grupos y el candidato 10; se comprobó expresamente que existían tres grupos visibles al inicio y que el candidato reutilizaba sus geometrías al reanudar sin cambios. Son pruebas de datos y ciclo de vida con terreno controlado, no capturas GPU ni equivalencia de todos los biomas. Las 54 pruebas de generación y cronología ejecutadas con el parche también pasaron.

## Incursión WebGPU

Se comparó A/B/B/A en la incursión guardada de ocho animales con perfil temporal de producto y adaptador NVIDIA Turing. A carga el módulo original de hierba mediante una ruta de QA; B usa el parche local. No se activó la modificación experimental de shaders de morph. La ventana nominal fue de 25 s, con tres inspecciones asíncronas. Los datos se guardan incluso cuando falla la condición de cobertura visible al final.

| Ejecución | Cobertura visible inicial → final | Generaciones inicial → final | Intervalos Worker, cantidad / media / máximo ms | p99 rAF principal ms | Retraso visual final s |
| --- | --- | --- | --- | ---: | ---: |
| A1 | 8 → 0 | 15 → 314 | 44 / 565 / 1.996 | 633 | 8,05 |
| B1 | 8 → 8 | 15 → 140 | 69 / 359 / 2.101 | 667 | 7,85 |
| B2 | 8 → 8 | 15 → 165 | 70 / 349 / 1.571 | 600 | 7,55 |
| A2 | 8 → 0 | 15 → 340 | 39 / 651 / 2.233 | 600 | 8,05 |

Las dos referencias terminan sin cobertura y están marcadas inválidas para comparar rendimiento visual completo. Las variantes conservan ocho grupos en las inspecciones y registran menos generaciones y más callbacks del Worker en esta ventana; no se midió visibilidad continua. El número de callbacks y su intervalo no son presentación física ni tiempos GPU. Las secuencias finales fueron distintas, los eventos y tiempos de inspección no están alineados exactamente y los datos proceden de una sola captura y hardware. El p99 principal sigue alto, los máximos gráficos siguen superando 1,5 s y la cronología llegó a 32 publicaciones pendientes en los cuatro ensayos. No se demuestra que el juego sea fluido ni que haya mejora de GPU, ni se ha probado paridad visual para todos los biomas o escenarios. En consecuencia la solución sigue fuera de producción.

Datos: [A1](webgpu-grass-reuse-long-a1-20261108.jsonl), [B1](webgpu-grass-reuse-long-b1-20261108.jsonl), [B2](webgpu-grass-reuse-long-b2-20261108.jsonl), [A2](webgpu-grass-reuse-long-a2-20261108.jsonl). La copia QA de la captura corrige su versión espacial para restaurarla y el árbol contenía cambios ajenos sin confirmar; el commit no reproduce por sí solo ese entorno.

## Reproducción

Aplicar el parche experimental y ejecutar `.cache/tooling/node20.exe tools/experiments/check_grass_reuse_equivalence.mjs`; el comparador crea un módulo temporal junto al original y lo borra al terminar. Para la incursión iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true` y `VITE_WEBGPU_TEMPORAL_GRASS=true`. Ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=25000`, `QA_QUEUE_DIAGNOSTICS=1` y `QA_REQUIRE_VISIBLE_GRASS=1`; añadir `QA_GRASS_BASELINE=d539d86ef` para A. Retirar el parche al finalizar.

Queda pendiente comparar otros terrenos y biomas, preservar evidencia visual a tiempo de simulación equivalente y medir GPU. La acumulación temporal y las pausas máximas requieren un tratamiento independiente antes de declarar resuelta la fluidez.
