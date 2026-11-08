# Reutilización de shaders de morph tras integrar la hierba

Fecha: 2026-11-08. El experimento cambia solo en QA el nombre de una referencia de `MorphNode` en Three r180; la referencia continúa tomando los pesos del objeto. No se activa el cambio en el juego. La normalización adicional de WGSL del laboratorio permanece desactivada.

## Incursión WebGPU

Se repitió una incursión de sabana A/B/B/A, 25 s nominales, con la reutilización de hierba ya integrada. A usa Three sin modificar y B aplica temporalmente `QA_STABLE_MORPH=1`; se registraron tres intercepciones del módulo en cada B. Todas las ejecuciones declararon WebGPU y conservaron ocho grupos de hierba visibles en las tres inspecciones. El adaptador informó NVIDIA/Turing, sin el modelo exacto.

| Ejecución | rAF principal media / p95 / p99 / máximo ms | Worker gráfico media / p95 / p99 / máximo ms | GPU media ms (muestras) | Retraso visual intermedio / final s |
| --- | --- | --- | --- | --- |
| A1 | 50,3 / 66,7 / 633,3 / 1.100 | 311 / 1.200 / 1.321 / 1.333 | 46,9 (10) | 7,40 / 6,60 |
| B1 | 35,5 / 66,6 / 66,7 / 100 | 225 / 782 / 891 / 1.019 | 46,4 (17) | 7,50 / 6,15 |
| B2 | 35,5 / 66,6 / 66,7 / 100 | 225 / 841 / 932 / 1.174 | 47,0 (16) | 7,80 / 6,20 |
| A2 | 53,6 / 99,9 / 600,0 / 1.067 | 381 / 1.256 / 1.367 / 1.547 | 70,4 (8) | 6,15 / 7,40 |

Los intervalos de Worker son callbacks instrumentados, no presentación física. La GPU se muestreó con consultas WebGPU solo entre la primera y la segunda inspección; 8–17 muestras no permiten percentiles fiables ni una conclusión general de GPU. Las lecturas de retraso son asíncronas, los estados y secuencias no coinciden exactamente, y el Worker siguió acumulando 32 publicaciones. En esta escena se observan menos picos de rAF y una cadencia del Worker mejor, pero sigue habiendo retraso de varios segundos. No se declara resuelta la fluidez global.

En trazas separadas de unos 11 s, sin pérdida comunicada por Chromium, A registró 113 creaciones de módulos de shader y 113 solicitudes de pipeline (97 asíncronas); B registró 37 módulos y 36 solicitudes (35 asíncronas). Ambas declararon WebGPU, sin ámbitos `GetProgramiv`. La instrumentación, cachés y estados de ambas capturas pueden influir en los tiempos; estos contadores no son consultas de tiempo GPU. [ABBA A1](webgpu-morph-integrated-abba-a1-20261108.jsonl), [B1](webgpu-morph-integrated-abba-b1-20261108.jsonl), [B2](webgpu-morph-integrated-abba-b2-20261108.jsonl), [A2](webgpu-morph-integrated-abba-a2-20261108.jsonl). [Traza A](webgpu-morph-integrated-trace-a-20261108.json.gz), [resumen A](webgpu-morph-integrated-trace-a-20261108-summary.json), [traza B](webgpu-morph-integrated-trace-b-20261108.json.gz), [resumen B](webgpu-morph-integrated-trace-b-20261108-summary.json).

## Expresiones y variabilidad visual

En WebGPU real, diez jabalíes con 40 mallas de morph y 110 pesos independientes produjeron cuatro imágenes idénticas entre A y B, con sombras y animación. En la escena de diez modelos diferentes (guardián, cinco bestias y cuatro trabajadores; 37 mallas y 130 pesos), tres fotogramas coincidieron inicialmente y el cuarto difirió. Una segunda referencia sin el cambio difirió de la primera en el mismo fotograma y produjo exactamente la huella de la primera candidata; la segunda candidata produjo la huella de la primera referencia.

Se añadió a la prueba la opción `WG_SETTLE_SHADOWS=1`: prepara la escena de prueba, espera la cola GPU y dibuja cada pose dos veces antes de leerla. Es una medida de diagnóstico visual, **no una precarga del juego**. Con esa opción, una pareja mixta coincidió en los cuatro fotogramas, pero otra candidata difirió en el tercero: 10.353 píxeles de la captura completa, máximo 188/255 en un canal. Otros controles muestran variación también entre referencias, con pesos de morph a cero y, en una repetición, sin sombras. Por tanto las diferencias no pueden atribuirse de forma fiable al cambio ni descartarse como regresión visual. La prueba aún no proporciona una referencia completamente determinista para todas las poses.

[Resultados de las 29 ejecuciones visuales](webgpu-morph-integrated-visual-20261108.json); [referencia estabilizada](webgpu-morph-integrated-visual-a-20261108.png) y [candidata con diferencia](webgpu-morph-integrated-visual-b-20261108.png). Todas informaron backend WebGPU real y no reportaron errores de validación. Hay que estabilizar o aislar el origen de la variación y verificar la vinculación independiente de pesos y sombras antes de activar el cambio. Se mantiene fuera de producción pese al ahorro observado de compilaciones.

## Reproducción

Iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true`, `VITE_WEBGPU_TEMPORAL_GRASS=true`. Ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=25000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_GPU_TIMESTAMPS=1`, `QA_REQUIRE_VISIBLE_GRASS=1`; añadir `QA_STABLE_MORPH=1` para B. Para las trazas usar `QA_WINDOW_MS=10000`, `QA_TRACE_INVENTORY=1` y `QA_TRACE_PATH=<ruta.json>`, sin diagnósticos de cola ni timestamps. Para la prueba visual ejecutar `tools/experiments/check_morph_pipeline_visual.mjs` con `WG_NO_CANONICAL=1`, alternando `WG_STABLE_MORPH=1`; son controles `WG_SAME_SPECIES=1`, `WG_ZERO_MORPH=1`, `WG_NO_SHADOWS=1` y `WG_SETTLE_SHADOWS=1`. Las capturas usan una copia de QA del guardado con la versión espacial ajustada; el árbol tenía modificaciones locales ajenas sin confirmar.
