# Caché experimental de recetas por cultivo

Se conserva un candidato aislado, sin activarlo en producción. La prueba compara todos los buffers Float32, cantidades y visibilidad de etapas y puentes con la versión f806e29, incluyendo crecimiento, pausa, cambios de especie, altas/bajas, orden, terreno y origen.

Diagnóstico CPU sintético: 1200 plantas, 60 frames de calentamiento y 240 medidos por modo, orden A1/B1/B2/A2, procesos separados. A es producción f806e29; B es el candidato archivado. Los hashes visuales finales coinciden en los cinco modos y los buffers pausados no cambian. No mide GPU, RAM ni una partida nativa. Había campañas CPU y una medición del subagente activas: los resultados requieren cautela.

| Modo | A1 mediana ms | B1 | B2 | A2 |
|---|---:|---:|---:|---:|
| Maduras | 0.578 | 0.527 | 0.533 | 0.562 |
| Pausa misma edad | 0.277 | 0.312 | 0.351 | 0.297 |
| Pausa edades distintas | 0.577 | 0.427 | 0.465 | 0.538 |
| Creciendo misma edad | 0.383 | 0.425 | 0.404 | 0.376 |
| Creciendo edades distintas | 0.803 | 0.893 | 0.964 | 0.827 |

La pausa heterogénea mejora en este ensayo, pero otros casos empeoran. No se adopta por prioridad de rendimiento. El candidato retiene además una receta por entidad viva (memoria no medida). Pendiente una alternativa con menor coste activo y medición aislada/integrada antes de incorporarla.

Reproducción: `node tools/benchmark_crop_uploads.mjs 1200 240 src/rendering/crop-batch.js synthetic` para A, y el mismo comando con `tests/browser/crop-batch-sample-cache-candidate.js` para B. `node --test tests/crop-sample-cache.test.js tests/crop-upload.test.js` verifica equivalencia. Los JSONL conservan datos originales; proof.json identifica fuentes y orden.
