# Hierba y retraso de presentación: sondeos de máscara

Fecha: 2026-11-08. Esta investigación no modifica la generación de producción. La incursión posterior a la integración del nombre estable de morph mostró retraso creciente, 23 publicaciones temporales pendientes y numerosas preparaciones gráficas. La traza anterior atribuye muestras del Worker gráfico a `sampleGrassTerrain` y `generateGrassTile`, además de construcción de nodos Three.js; son muestras estadísticas, no tiempos GPU ni prueba de causalidad para cada fotograma. En la ruta temporal observada, el bombeo de publicaciones se ejecuta en el callback de dibujo del mismo Worker: un dibujo o preparación que lo ocupe retrasa también el consumo, sin que eso por sí solo identifique la causa de toda la cola.

Se valoraron tres alternativas: evitar regeneraciones cuando no han cambiado las dependencias (reutilización ya integrada, insuficiente para cambios reales); generar en un Worker auxiliar con transferencia y validación de revisiones (prototipo existente, aún sin validación integral y con espera de admisión); y simplificar cada comprobación necesaria. Se ensayó la tercera: los ocho sondeos de huella calculan solo desgaste y, para helechos, cobertura, evitando altura, pendiente y canales descartados. Se conserva el orden de operaciones de interpolación y no cambian decisiones de cobertura ni geometría.

## Componente

`check-grass-mask-probe.mjs` compara exactamente objetos y estadísticas de 144 teselas por variante, con cuatro fragmentos sintéticos, hierba, río, helechos, distribución variable, obstáculos y agua simulada. Las cinco comparaciones coinciden. No es una comparación visual de todos los biomas ni utiliza datos reales de terreno. En una pasada A/B/B/A, el lote sintético de hierba tardó 135,5/62,2/64,1/138,1 ms y el de helechos 51,0/27,7/28,0/52,1 ms. Miden el componente en Node, no FPS ni GPU; [datos](webgpu-grass-mask-probe-component-20261108.json).

## Incursión real

Se usó la misma captura de sabana con ocho animales, WebGPU y perfil temporal de producto, hierba y reutilización de morph activas. La variante B se inyectó solo en QA, con una intercepción confirmada por ejecución. Las cuatro ejecuciones son válidas y terminaron con ocho grupos de hierba visibles. El adaptador comunicó NVIDIA/Turing sin modelo exacto. La ventana nominal fue de 10 s y se hicieron tres inspecciones asíncronas.

| Ejecución | rAF principal media / p95 / p99 / máximo, ms | Intervalo medio / máximo de callback gráfico, ms | Retraso intermedio / final, s | Pendientes finales |
| --- | --- | --- | --- | --- |
| A1 | 38,0 / 66,7 / 99,9 / 100,0 | 444 / 893 | 2,20 / 5,05 | 19 |
| B1 | 36,6 / 66,7 / 66,7 / 100,0 | 402 / 760 | 2,30 / 5,95 | 30 |
| B2 | 36,8 / 66,7 / 66,8 / 100,0 | 380 / 773 | 2,25 / 5,85 | 25 |
| A2 | 37,1 / 66,7 / 66,8 / 100,0 | 413 / 977 | 2,55 / 6,20 | 29 |

Los callbacks gráficos son solo 21–27 muestras entre inspecciones y no equivalen a presentación física. Las ejecuciones alcanzaron secuencias y cantidades de generaciones diferentes; el retraso se calcula con lecturas asíncronas, sin distribución de latencia. No se registraron consultas de tiempo ni memoria GPU. Las observaciones sugieren menos tiempo de trabajo por tesela en el componente, pero no permiten atribuir una mejora global reproducible ni demostrar reducción de la cola: A2 y B se solapan. Por ello el candidato **no se integra**. El siguiente obstáculo sigue siendo separar y medir la ocupación del Worker gráfico por preparación, dibujo y publicación, evitando descartar eventos o adelantar la presentación sin las garantías temporales.

Datos: [A1](webgpu-grass-mask-probe-a1-20261108.jsonl), [B1](webgpu-grass-mask-probe-b1-20261108.jsonl), [B2](webgpu-grass-mask-probe-b2-20261108.jsonl), [A2](webgpu-grass-mask-probe-a2-20261108.jsonl). El guardado QA ajusta en una copia la versión espacial y añade una pausa; el árbol contenía cambios locales ajenos sin confirmar, por lo que el commit del experimento no reproduce exactamente ese entorno.

## Reproducción

Ejecutar `node tools/experiments/check-grass-mask-probe.mjs`. Para la incursión iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true` y `VITE_WEBGPU_TEMPORAL_GRASS=true`; ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_REQUIRE_VISIBLE_GRASS=1` y un `QA_OUT_FILE` distinto. Añadir `QA_GRASS_MASK_PROBE=1` solo en B. El instrumento exige que la intercepción haya ocurrido y registra su número. El candidato permanece en `tools/experiments/grass-mask-probe-candidate.mjs`.
