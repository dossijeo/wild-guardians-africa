# Trayectorias confirmadas con almacén compartido

Se ha conectado al roster real de animales una vía experimental que comparte el grafo de movimiento y dos buffers de almacenamiento WebGPU. Cada actor conserva una ranura, parámetros, secuencia, trayectoria, orientación y horizonte independientes; las rutas se validan con el mismo código que la vía anterior. Los cambios marcan únicamente los rangos del actor para actualización. La selección, eventos, colisiones y autoridad de Wild Engine no cambian.

La opción `VITE_WEBGPU_SHARED_MOTION_POOL=true` está **desactivada por defecto**. Sin ella se conserva la implementación anterior; si se agotan las 64 ranuras, cada actor adicional utiliza la vía anterior. Las referencias de objeto se colocan durante la admisión y se retiran al liberar el binding; la liberación del slot sigue el mecanismo de espera de compilaciones y trabajo GPU del roster. La eliminación de los buffers utiliza la API privada `_attributes` de Three r180 y requiere revisión al actualizar Three. Los buffers reservan 192 KiB de datos para 64 actores y 64 segmentos, más las copias y estructuras internas del navegador; no se ha medido memoria real de GPU ni transferencia efectiva.

Este paso solo comparte movimiento. Las fases históricas de animación siguen asociadas a cada actor y los materiales también pueden producir claves estructurales distintas. No constituye la arquitectura completa de material, fase y trayectoria compartidos.

Actualización posterior: hay una [opción experimental de fase y movimiento compartidos](webgpu-shared-phase-motion-20261108.md), con pruebas de dos rigs y sombras. Ambas opciones siguen desactivadas por defecto y la mejora global de fluidez no está demostrada.

## Verificación

Pasaron 102 pruebas de movimiento, binding, roster y rigs, incluyendo ranuras independientes, suspensión, fallback por capacidad y propiedad durante una activación cancelada. La compilación Vite con la opción activada terminó correctamente. Una prueba WebGPU con lectura de píxeles dibujó dos objetos con un grafo compartido: sus centros horizontales fueron 63,5/63,5 al inicio, 31,5/95,5 al terminar y 47,5/79,5 tras detener uno y actualizar la trayectoria del otro. No se notificaron errores GPU en esa prueba.

La prueba histórica completa `audit_confirmed_gpu_motion_webgpu.mjs` no terminó: su caso existente de animal real informó `Animal has no pixels` antes de llegar al nuevo caso. La causa no se ha establecido. La prueba aislada `QA_POOLED_ONLY=1` sí pasó, pero solo cubre dos objetos geométricos; no demuestra paridad de rigs, sombras, morphs, ataques o recuperaciones. La incursión real verificó ocho ranuras activas y ocho animales visibles sin errores de recursos notificados, pero no establece paridad visual. No activar por defecto hasta resolver estas limitaciones y validar más biomas, cámaras, cargas y sesiones largas.

Actualización posterior: se identificó y corrigió la composición de normales que impedía dibujar el facóquero, y la batería WebGPU completa pasó con el modelo real. También se corrigió una variante de sombra obsoleta al sustituir materiales. [Resultados, alcance y limitaciones](webgpu-motion-normal-shadow-20261108.md); el almacén continúa desactivado por defecto.

## Comparación A/B/B/A

Incursión guardada de sabana, ocho animales, WebGPU en NVIDIA Turing, Worker auxiliar de hierba y admisión con iluminación compartida activados en ambos casos. A desactiva el almacén mediante una sustitución QA en el módulo servido; B usa la implementación integrada. Todas las ejecuciones terminaron válidas y sin errores de recursos notificados. Los intervalos gráficos son callbacks del Worker, no tiempos GPU ni fotogramas presentados físicamente.

| Ejecución | rAF media / p95 / p99 / máximo, ms | Worker: cantidad / intervalo medio / máximo, ms | Retraso visual final, s |
| --- | --- | --- | --- |
| A1 | 38,15 / 66,68 / 99,94 / 100,03 | 79 / 128,77 / 696,23 | 4,15 |
| B1 | 38,95 / 66,68 / 99,97 / 100,00 | 98 / 102,34 / 290,07 | 3,65 |
| B2 | 38,16 / 66,67 / 66,71 / 99,99 | 95 / 105,09 / 271,11 | 3,45 |
| A2 | 38,34 / 66,69 / 66,73 / 100,01 | 76 / 132,85 / 757,60 | 3,85 |

La reducción observada en intervalos del Worker justifica continuar, pero las secuencias alcanzadas y la cobertura intermedia de hierba difieren, hay solo 76–98 intervalos entre inspecciones y las lecturas son asíncronas. El p95 principal no mejoró; no hay mediciones de tiempo GPU, memoria o bytes realmente transferidos. No se demuestra una mejora global ni eliminación de tirones. La copia QA del guardado añade pausa y versión espacial, y había modificaciones locales ajenas.

## Reproducción

Los [datos de la serie, la captura instrumentada y el resultado GPU](shared-motion-pool-20261108/) conservan los valores sin resumir. Iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true`, `VITE_WEBGPU_TEMPORAL_GRASS=true`, `VITE_WEBGPU_GRASS_WORKER=true`, `VITE_WEBGPU_ADMISSION_SHARED_LIGHTS=true` y `VITE_WEBGPU_SHARED_MOTION_POOL=true`. Ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_REQUIRE_VISIBLE_GRASS=1` y `QA_OUT_FILE`. Añadir `QA_MOTION_POOL_BASELINE=1` para A; comprobar que `motionPoolBaselineOverrides` sea positivo y que B indique `motionPool.active`. Para la sonda de nodos añadir `QA_NODE_BUILD_DIAGNOSTICS=1` en una ejecución independiente. El experimento requiere Playwright y Edge con WebGPU.

La prueba aislada GPU se ejecuta con `QA_POOLED_ONLY=1 node tools/experiments/audit_confirmed_gpu_motion_webgpu.mjs`; las pruebas de Node con `node --test tests/confirmed-gpu-motion-pool.test.js tests/confirmed-gpu-motion.test.js tests/webgpu-actor-motion-binding.test.js tests/webgpu-animal-roster.test.js tests/webgpu-baked-walk.test.js`.
