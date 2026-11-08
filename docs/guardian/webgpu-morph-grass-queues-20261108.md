# Incursión WebGPU: reutilización de morph y cobertura de hierba

Fecha: 2026-11-08. Ninguna de las variantes está activada en producción. Se usa la misma incursión guardada y perfil temporal WebGPU de producto, con la hierba habilitada y adaptador NVIDIA Turing. El instrumento recoge solo tres inspecciones asíncronas, intervalos del hilo principal e intervalos entre callbacks del Worker gráfico. El tiempo GPU y la presentación física no se miden. Las ejecuciones no alcanzan el mismo estado de simulación, y el árbol contenía modificaciones locales ajenas.

La variante de morph cambia temporalmente en QA el nombre interno de una referencia de Three para permitir reutilización de shaders; se comprobó que se interceptó el módulo. El candidato combinado añade el parche `grass-resume-reuse-experiment.patch`, que intenta conservar fragmentos sin cambios de terreno, agua, ocupación o calidad. La referencia usa ambas rutas originales. Se rechazó cualquier muestra final sin hierba visible; esta comprobación es necesaria pero no demuestra paridad visual completa.

| Ejecución | Variante | Cobertura visible inicial → final | Generaciones inicial → final | p99 rAF principal, ms | Media / máximo de intervalos Worker, ms | Retraso visual final, s |
| --- | --- | --- | --- | ---: | --- | ---: |
| A1 | Original | 8 → 8 | 15 → 15 | 667 | 541 / 1.282 | 4,55 |
| A2 | Original | 8 → 8 | 15 → 15 | 633 | 557 / 1.255 | 4,50 |
| B3 | Morph | 8 → 0 | 15 → 145 | 67 | 527 / 1.905 | 6,30 |
| B4 | Morph + reutilización | 8 → 8 | 15 → 95 | 100 | 364 / 921 | 5,55 |
| B5 | Morph + reutilización | 8 → 8 | 15 → 95 | 100 | 472 / 1.015 | 5,65 |

B1 y B2 también terminaron con cero grupos visibles y 145 generaciones; la versión previa del instrumento descartó las muestras al fallar la condición. El instrumento ahora conserva los datos e incluye `valid` e `invalidReasons` cuando falla esa condición, para impedir confundir un escenario visualmente incompleto con un resultado favorable. B3 es explícitamente inválida para una comparación de rendimiento visual. B4 y B5 cumplen solamente la condición de cobertura visible y pasaron 54 pruebas de generación, invalidación y ciclo de vida con el parche aplicado.

La combinación conservó la cobertura y evitó 50 generaciones frente a B3 en esta ventana, con un incremento de callbacks del Worker observado en esas ejecuciones. Es una señal que justifica seguir investigando, no una demostración de mejora global: los eventos y secuencias finales difieren, se observaron solo 18–27 intervalos del Worker por ejecución, no hay paridad visual completa ni mediciones GPU y el retraso visual sigue siendo de varios segundos. La optimización morph sin reutilización de hierba no se acepta, tampoco se integran ambas conjuntamente.

Datos: [A1](webgpu-morph-grass-a1-20261108.jsonl), [A2](webgpu-morph-grass-a2-20261108.jsonl), [B1](webgpu-morph-grass-b1-20261108.jsonl), [B2](webgpu-morph-grass-b2-20261108.jsonl), [B3](webgpu-morph-grass-b3-20261108.jsonl), [B4](webgpu-morph-grass-b4-20261108.jsonl), [B5](webgpu-morph-grass-b5-20261108.jsonl). Véase también [la investigación de las claves de morph](morph-label-analysis-20261108.md).

Para reproducir, iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true` y `VITE_WEBGPU_TEMPORAL_GRASS=true`. Ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_GRASS_ADMISSION_DIAGNOSTICS=1` y `QA_REQUIRE_VISIBLE_GRASS=1`. Añadir `QA_STABLE_MORPH=1` para B; aplicar además `tools/experiments/grass-resume-reuse-experiment.patch` para el candidato combinado y retirarlo al terminar. La copia de la captura de QA ajusta la versión espacial necesaria para restaurar el escenario; no constituye una campaña completa.
