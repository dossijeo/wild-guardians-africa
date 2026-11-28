# Integración experimental del Worker de hierba: incursión real

Fecha: 2026-11-08. El código de producción no activa esta integración. El parche `tools/experiments/grass-worker-owner-experiment.patch` contiene una conexión optativa del propietario a la cola de generación auxiliar y una prueba de invalidación por ocupación y retirada de terreno. Aplica sobre `46b8df5b2`. Conserva el generador de producción, limita los datos clonados a los nueve fragmentos vecinos y valida identidad de fragmentos, revisión de terreno, ocupación y calidad antes de solicitar admisión. Los resultados no son autoritativos.

## Resultado

Prueba exploratoria con perfil de producto `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true`, `VITE_WEBGPU_TEMPORAL_GRASS=true`, incursión guardada con ocho animales y adaptador WebGPU NVIDIA Turing. El perfil temporal, el suelo y la hierba estuvieron presentes; la variante de shader experimental `QA_STABLE_MORPH` no se utilizó. Una ejecución por alternativa, 10 s nominales de observación y tres inspecciones asíncronas. Había otros cambios locales, por lo que no se presenta como una comparación reproducible desde un commit limpio.

| Medida | Referencia A5 | Worker B5 |
| --- | ---: | ---: |
| Hierba visible en primera y última inspección | 8 → 8 | 0 → 0 |
| Preparaciones de hierba pendientes al final | 4 | 12 |
| Callbacks del Worker gráfico entre inspecciones | 17 | 16 |
| Intervalo medio entre callbacks, ms | 536 | 600 |
| Intervalo máximo entre callbacks, ms | 1.260 | 1.395 |
| p99 rAF del hilo principal, ms | 633 | 700 |
| Publicaciones temporales pendientes al final | 32 | 32 |

No existe equivalencia visual: en el candidato la hierba no llegó a verse durante la ventana. La generación produjo candidatos, pero estos permanecieron pendientes de admisión. Todavía no se conoce la causa precisa de la diferencia de admisión; no basta atribuirla a la compilación, al orden de solicitudes o al Worker sin una traza adicional. Las ejecuciones no tienen exactamente los mismos estados ni tiempos de inspección; no son suficientes para establecer diferencias de rendimiento. Los intervalos del Worker miden callbacks, no presentación física ni tiempos GPU. No se ha aceptado el candidato ni se ha cambiado el comportamiento predeterminado.

Datos: [referencia A5](webgpu-grass-worker-a5-20261108.jsonl) y [candidato B5](webgpu-grass-worker-b5-20261108.jsonl). La ejecución anterior sin perfil de producto carecía de suelo e hierba y se descartó íntegramente; el instrumento comprueba ahora que el propietario exista cuando se solicita el Worker y ofrece `QA_REQUIRE_VISIBLE_GRASS=1` para rechazar una ventana que termine sin cobertura visible.

## Reproducción y siguiente paso

Tras aplicar el parche experimental con `git apply --unidiff-zero tools/experiments/grass-worker-owner-experiment.patch`, iniciar Vite con las tres variables `VITE_` anteriores. Ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000` y `QA_QUEUE_DIAGNOSTICS=1`; añadir `QA_GRASS_WORKER=1` para el candidato y omitirlo para la referencia. `QA_REQUIRE_VISIBLE_GRASS=1` añade la condición de cobertura visible al final. El instrumento intercala el Worker solo en la respuesta del módulo durante QA y exige backend WebGPU.

Hay que identificar por qué los candidatos no se admitieron, asegurar cancelación y publicación por revisión, y comprobar la equivalencia visual en el navegador. Después hacen falta comparaciones repetidas con estados equivalentes y medición de transferencia, tiempo de respuesta, intervalos gráficos y GPU antes de activar esta vía en el juego.
