# Aislamiento de normales de roca

20/10/2026. Doce capturas comparan canyon-dominant (color + normal) frente a color solo. Seis parejas caso 21, semilla 712, calidad media, 1280 x 720, camaras identicas, horas 150/350, chunks listos antes de dibujar. Fuente [Cliff Side CC0](../canyon-stratified/SOURCE.md), sin nuevos assets.

Las grietas se conservan al retirar el mapa normal. En las vistas observadas su contribucion al volumen es pequena; no equivale a decir que todas las normales del terreno sean innecesarias. La geometria y las normales originales siguen presentes.

[Con normales](canyon-canyon-dominant-side-day.png) / [solo color](canyon-canyon-color-only-side-day.png). [Noche baja](canyon-canyon-color-only-low-night.png).

comparison.json: una textura menos, mismos draws, triangulos y geometrias en las seis parejas. pixel-difference.json mide diferencias de imagen sin modificar capturas: media absoluta por canal entre 0,077 y 0,417 sobre 255 en pantalla completa. No es una metrica perceptual ni una medida aislada de las paredes; otros elementos pueden variar entre cargas.

El ABBA temporal compara color solo con global-lighting sin roca, NO con la variante de normales: dia 15,561 -> 17,091 ms (+1,531); noche 16,038 -> 16,931 (+0,893). La variacion entre sesiones impide concluir una mejora GPU frente a la ronda anterior. Se reduce recurso, no se acredita ahorro temporal. No integrado, presupuesto pendiente. Un 404 sin URL se registra en la pagina base/benchmark; ninguna excepcion de shader observada.

Decision: usar color solo como base del siguiente ensayo artistico para no pagar un recurso cuyo aporte visible es pequeno en estas vistas. Atenuar bandas antes de considerar integracion. No aprobar el objetivo global.

Reproduccion: WG_MATERIAL_STUDY=canyon-color-only, WG_STUDY_BASELINE=canyon-dominant con capture-material-study.mjs. Benchmark-material-study.mjs: WG_PAIR_CASES=21, WG_PAIR_VIEW=side. Datos completos en paired.json, captures.json y performance-summary.json.
