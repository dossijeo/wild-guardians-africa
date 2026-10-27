# Frecuencia del suelo: filtrado triple descartado

Hipótesis: reducir la frecuencia fina del tapiz permite leer mejor las sombras y el volumen. Prueba QA: multiplicar por 3 las derivadas UV utilizadas en textureGrad para albedo, normales y AO/roughness/height. Se mantienen escala UV, geometría, paleta, iluminación y simulación. No se activa en runtime.

Resultado: en Sabana baja la competencia del detalle fino, pero aparece desenfoque; Gran Río adquiere manchas blandas y pierde la lectura fibrosa. El cambio no mejora suficientemente el material para conservarlo. No confundir menos detalle con mejor volumen. El Desierto usa la función legacy y sirve de control; esta intervención no afecta sus muestras. Cañón solo filtra el suelo, no reconstruye las paredes.

## Evidencia

48 PNG, 24 parejas: seis biomas, cámaras de juego/baja, día/noche. Fixture WorldScene real, semilla 712, calidad media, 1280 × 720, DPR 1; horas 150/350. comparison.json verifica igualdad exacta de cámara, objetivo y hora por pareja.

- [Sabana antes](savanna-global-lighting-low-day.png) / [después](savanna-ground-frequency-low-day.png)
- [Gran Río antes](grand-river-global-lighting-game-day.png) / [después](grand-river-ground-frequency-game-day.png)
- [Cañón antes](canyon-global-lighting-game-day.png) / [después](canyon-ground-frequency-game-day.png)
- [Manglar de noche antes](mangrove-global-lighting-game-night.png) / [después](mangrove-ground-frequency-game-night.png)

Todas las parejas: +0 draw calls, +0 triángulos y +0 texturas. El contador de geometrías subió una unidad en Cañón/juego/día entre cargas; el parche no crea geometrías, pero estos datos no prueban ausencia de fugas. Cuatro registros contienen errores de recurso conservados en captures.json. Sin benchmark temporal CPU/GPU: descartado por apariencia antes de aprobar coste. No extrapolar los contadores a ahorro de tiempo GPU.

Reproducir con WG_MATERIAL_STUDY=ground-frequency y node tools/experiments/capture-material-study.mjs (servidor 5190); luego python tools/experiments/summarize-ground-frequency.py. El parche falla explícitamente si cambia su ancla GLSL.

Siguiente hipótesis: separar contraste del albedo y fuerza de normales/oclusión. Conservar la definición de fibras y la calidez; no repetir un desenfoque uniforme de todas las capas. La vegetación volumétrica y las transiciones de orilla siguen pendientes, al igual que el presupuesto total de iluminación.
