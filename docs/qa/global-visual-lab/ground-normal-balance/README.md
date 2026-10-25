# Fuerza de normales × .45: no integrada

Pierde volumen fino y apenas mejora la separación de masas. Se conserva el valor actual. La fuerza del normal map no sustituye una microvegetación con forma y distribución adecuadas. No continuar variando únicamente este escalar.

16 capturas: Sabana y Gran Río, vista de juego/baja, día 150/noche 350, referencia global-lighting y candidato. Fixture WorldScene real, semilla 712, calidad media, 1280 × 720, DPR 1. Ocho parejas con cámara/objetivo/hora idénticos, ver comparison.json. El parche multiplica solo mapN.xy en sampleTurfN410, manteniendo albedo, AO, parallax y normal geométrica. No cambia siluetas ni lógica del juego.

[Sabana antes](savanna-global-lighting-game-day.png) / [después](savanna-ground-normal-balance-game-day.png). [Gran Río antes](grand-river-global-lighting-game-day.png) / [después](grand-river-ground-normal-balance-game-day.png). Las vistas nocturnas y bajas están en este directorio y captures.json.

Todas las parejas tienen +0 draw calls, +0 triángulos y +0 texturas. Sin medición temporal GPU/CPU: no se aprueba rendimiento a partir de estos contadores. Cuatro registros recogen un 404 sin URL identificada; no hay errores registrados en el candidato. En × .45 el contador de geometrías de Gran Río difiere en -6 entre cargas; no implica ahorro del parche, que no modifica geometría. En × 1.6 no varían los contadores registrados. No se extrapola a los otros cuatro biomas.

Reproducir con WG_MATERIAL_STUDY=ground-normal-balance, WG_STUDY_CASES=1,6 y node tools/experiments/capture-material-study.mjs, servidor 5190. Validar parejas con python tools/experiments/summarize-ground-frequency.py ground-normal-balance. Esta herramienta conserva su nombre por compatibilidad y acepta ahora el estudio como argumento.
