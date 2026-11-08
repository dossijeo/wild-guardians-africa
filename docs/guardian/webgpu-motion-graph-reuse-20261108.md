# Reutilización del grafo de movimiento por actor

Se ensayó reutilizar, dentro de cada actor, el nodo TSL de desplazamiento para materiales que parten exactamente del mismo nodo de posición. Cada actor conservaba sus propios uniforms y texturas de trayectoria. El candidato se probó en el roster real, pero **se ha retirado del código de producción** al no demostrar mejora reproducible.

La prueba de aislamiento verificó que dos materiales de un actor comparten el nodo cuando comparten la entrada, que otro nodo de entrada produce otro grafo y que otro actor no comparte su estado. La batería de movimiento y bindings pasó 32 pruebas con el candidato. En una incursión instrumentada, para cuatro familias de materiales y el tramo posterior a la primera inspección, se observaron 24 construcciones de nodos tanto en la referencia como en la candidata; las identidades de nodo de posición pasaron de 24 a 6, pero las 24 claves de caché de construcción siguieron siendo diferentes. Las duraciones instrumentadas no son una comparación limpia de rendimiento.

## Comparación A/B/B/A

Incursión guardada de sabana, ocho animales, WebGPU en NVIDIA Turing, Worker auxiliar de hierba y admisión con iluminación compartida activados en ambos casos. A usó el código anterior interceptado por QA y B el candidato en el módulo real. Las cuatro ejecuciones fueron válidas, sin errores de recursos, con 12/12/13 grupos de hierba visibles. Los callbacks gráficos son intervalos entre ejecuciones del Worker, no fotogramas presentados ni tiempos GPU.

| Ejecución | rAF media / p95 / p99 / máximo, ms | Worker: cantidad / intervalo medio / máximo, ms | Retraso visual final, s |
| --- | --- | --- | --- |
| A1 | 37,92 / 66,67 / 66,72 / 100,01 | 82 / 122,86 / 759,23 | 4,20 |
| B1 | 38,44 / 66,68 / 66,72 / 100,02 | 78 / 128,52 / 737,99 | 4,15 |
| B2 | 37,77 / 66,68 / 99,95 / 100,03 | 75 / 137,24 / 787,97 | 4,30 |
| A2 | 38,03 / 66,68 / 66,71 / 100,01 | 78 / 129,28 / 683,52 | 4,35 |

Los estados y secuencias finales no coinciden exactamente, las inspecciones son asíncronas y no se midieron tiempo GPU, memoria ni equivalencia visual completa. La serie no permite atribuir pequeñas diferencias al cambio; tampoco muestra una mejora global. La copia QA del guardado añade pausa y versión espacial, y había modificaciones locales ajenas.

La reducción de identidades por sí sola no resuelve la compilación: siguen variando las claves de material y los grafos finales por actor. Hay que abordar conjuntamente los datos de trayectoria, fase y materiales, con pruebas de propiedad y presentación, en lugar de confiar en esta reutilización local.

## Datos y reproducción

[Datos A/B/B/A y captura de identidades](motion-graph-reuse-20261108/). Para volver a ejecutar, iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true`, `VITE_WEBGPU_TEMPORAL_GRASS=true`, `VITE_WEBGPU_GRASS_WORKER=true` y `VITE_WEBGPU_ADMISSION_SHARED_LIGHTS=true`. Ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_REQUIRE_VISIBLE_GRASS=1` y una ruta `QA_OUT_FILE`; añadir `QA_MOTION_CANDIDATE=1` para aplicar el candidato exclusivamente en QA y verificar `motionCandidateOverrides`. Para la sonda añadir `QA_NODE_BUILD_DIAGNOSTICS=1`. La reproducción utiliza ahora el código anterior como ruta normal y transforma el módulo servido para la candidata, al contrario que la serie original. Las pruebas dirigidas se ejecutan con `node --test tests/motion-graph-baseline.test.js tests/confirmed-gpu-motion.test.js tests/webgpu-actor-motion-binding.test.js`.
