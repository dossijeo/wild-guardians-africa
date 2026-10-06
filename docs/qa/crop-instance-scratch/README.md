# Reutilización de tuplas de subida de cultivos

`crop-batch.js` conserva un array local de cuatro números por lote y lo rellena antes de escribir los atributos de etapa o puente. `writeValues` lo consume de forma síncrona y copia los valores en Float32; ningún atributo ni rango pendiente conserva referencias al array. La matriz/pose, recetas botánicas, reloj de viento, alturas, reglas, orden y límites no cambian. No se activa la caché por entidad del experimento anterior.

Pruebas: 32 correctas, incluida comparación de buffers con la receta anterior, cuarenta originales y treinta y dos puentes del asset nativo, reconstrucción de las ocho especies, ciclos físicos de entrega y colas. Build correcto, 211 módulos; permanece la advertencia de tamaño del bundle. Esto no sustituye la aceptación visual móvil ni toda la suite.

CPU aislada con geometría sintética: 1200 plantas, 60 actualizaciones de calentamiento y 600 medidas por caso en cada proceso. Orden A1/B1/B2/A2. A usa producción 7f9812b; B cambia únicamente las tuplas temporales. Los hashes finales de todos los buffers coinciden para cada modo en los cuatro procesos. Los tres estados estables también conservan versiones/hashes durante el ensayo. Cambiaron comentarios/formato antes del archivo final, sin cambiar las operaciones medidas. Había campañas de fondo; no se mide frametime integrado, GPU, GC ni RAM.

| Caso | A1 p50 ms | B1 | B2 | A2 |
|---|---:|---:|---:|---:|
| Maduras | 0.5553 | 0.2513 | 0.2648 | 0.5548 |
| Pausa en morph | 0.3030 | 0.2649 | 0.2998 | 0.2954 |
| Pausa heterogénea | 0.5533 | 0.5182 | 0.5258 | 0.5299 |
| Creciendo homogéneas | 0.3813 | 0.3703 | 0.3846 | 0.3963 |
| Creciendo heterogéneas | 0.6462 | 0.6617 | 0.6433 | 0.6626 |

El caso maduro reduce consistentemente el coste aislado; no se declara mejora en todos los casos ni FPS. La técnica elimina una asignación de array por planta escrita, sin conservar datos adicionales por planta. Memoria/GC reales e integración con fincas mayores pendientes.

Reproducción: guardar `src/rendering/crop-batch.js` de 7f9812b en `.cache/crop-upload-buffer-baseline.mjs`, cambiando únicamente el import de reglas a `../src/simulation/rules.js`. Ejecutar `node tools/benchmark_crop_uploads.mjs 1200 600 .cache/crop-upload-buffer-baseline.mjs synthetic` para A y el mismo comando con `src/rendering/crop-batch.js` para B. JSONL originales y hashes de archivo final en proof.json.
