# Reutilización de hierba: equivalencia por bioma y captura WebGPU

> Actualización: el candidato se integró posteriormente con una vía de reversión; véase [la integración y la medición GPU](webgpu-grass-reuse-integration-20261108.md). Las instrucciones de aplicar el parche de este informe describen únicamente el experimento anterior.

Fecha: 2026-11-08. El parche `grass-resume-reuse-experiment.patch` sigue fuera de producción.

## Datos generados

Se amplió `tools/experiments/check_grass_reuse_equivalence.mjs` a sabana, gran río y manglares, tanto con hojas de manglar como con helechos. Para cada una de las cuatro configuraciones se compararon tres fragmentos contiguos sobre terreno controlado y sobre terreno generado por el WASM real de Wild Engine. El caso de manglares activa explícitamente `mangroveNetwork:true`, la red de islotes, en lugar de usar el layout anterior. Se comparan exactamente cantidad y buffers de instancias tras el inicio, reanudación sin cambios, revisión de alturas, revisión de máscara de suelo, agua junto al borde de un vecino y cambio de ocupación. Pasaron las ocho combinaciones; cada una solicitó 18 admisiones en la referencia y 13 en el candidato. También pasaron 54 pruebas de generación y cronología con el parche aplicado. La generación WASM emplea seed 123 y tres fragmentos: no representa todas las configuraciones posibles ni valida por sí sola el renderizado GPU.

## Captura en juego

Con la incursión de sabana pausada, perfil de producto WebGPU, adaptador NVIDIA Turing y cámara sin interacción, se comparó la referencia inicial con el candidato después de forzar una suspensión y reanudación sin cambios. En ambos casos había ocho grupos visibles y tiempo autoritativo 3429,9999999975803. El candidato pasó de ocho grupos visibles a ocho tras la reanudación; la referencia pasó de ocho a cero mientras los reconstruía. En el rectángulo de hierba de 840×240 píxeles (x 210–1049, y 350–589) los píxeles RGB coincidieron exactamente. En la imagen completa cambiaron 28.117 de 921.600 píxeles; no se ha aislado la causa de todas esas diferencias. La captura no registra la secuencia exacta de la referencia inicial y no demuestra equivalencia de toda la escena ni de otros biomas.

- [Referencia inicial](webgpu-grass-resume-reference-initial-20261108.png) y [candidato tras reanudar, ocho grupos](webgpu-grass-resume-candidate-eight-20261108.png).
- [Estado de referencia inicial](webgpu-grass-resume-visual-initial-20261108.jsonl) y [estado del candidato](webgpu-grass-resume-visual-candidate-20261108.jsonl).

Se hicieron otras capturas después de esperar doce grupos visibles en ambas rutas. La referencia había alcanzado la secuencia de presentación 87 y el candidato la 74, aunque ambos seguían con el mismo tiempo autoritativo pausado. El rectángulo anterior difirió en 30.745 de 201.600 píxeles, con diferencias también en el resto de la escena. Por las secuencias y la preparación distintas, esta pareja no permite atribuir diferencias a la hierba ni certificar paridad. [Referencia con doce](webgpu-grass-resume-reference-twelve-20261108.png), [candidato con doce](webgpu-grass-resume-candidate-twelve-20261108.png), [datos de referencia](webgpu-grass-resume-visual-reference-12-20261108.jsonl) y [datos del candidato](webgpu-grass-resume-visual-candidate-12-20261108.jsonl). La ejecución de referencia anterior con reanudación y ocho grupos iniciales se conserva también en [datos adicionales](webgpu-grass-resume-visual-reference-20261108.jsonl).

Estas pruebas refuerzan la equivalencia de los datos y la continuidad de la cobertura, pero no prueban equivalencia visual completa, tiempos GPU ni ausencia de tirones. La prueba prolongada y sus limitaciones están en [el informe A/B](webgpu-grass-reuse-long-20261108.md). Quedan pendientes capturas a la misma secuencia y cámara tras reanudación completa, validación visual de gran río y manglares, y mediciones GPU. Por eso no se activa aún el parche.

## Reproducción

Aplicar `tools/experiments/grass-resume-reuse-experiment.patch` y ejecutar `.cache/tooling/node20.exe tools/experiments/check_grass_reuse_equivalence.mjs`. Para las capturas, iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true` y `VITE_WEBGPU_TEMPORAL_GRASS=true`, y ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1` y `QA_PAUSED_SCREENSHOT` apuntando a un PNG. Para forzar el ciclo de prueba añadir `QA_FORCE_GRASS_RESUME=1`; `QA_PAUSED_GRASS_MIN=12` espera los doce grupos. Para la referencia añadir `QA_GRASS_BASELINE=d539d86ef`. El ciclo se inyecta solo en QA; el instrumento comprueba que la simulación sigue pausada antes de capturar. Retirar el parche después.

Los recuentos de diferencias pueden repetirse con `.cache/tooling/node20.exe tools/experiments/compare_grass_capture.mjs <referencia.png> <candidato.png>`. El guardado QA modifica temporalmente su versión espacial para permitir la restauración, y el árbol tenía modificaciones ajenas sin confirmar.
