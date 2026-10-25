# Streaming de Manglares integrado

Receta QA completa frente a opción integrada, media, semilla712,1280×720, día/noche. Dos circuitos con desplazamientos ±192m y nueve vistas por fase. Las18parejas son RGB exactas; cámaras, objetivos, origen, chunks, calls y triángulos coinciden. Cero errores WebGL o de página. Cada chunk con barro tiene su material preparado en ambas variantes.

Regresos nocturnos exactos frente al inicio. Regresos diurnos MAE0.00361617 en ambas variantes: no atribuible a integración por esta prueba. Al cierre, cada geometría de barro observada se libera una vez y las tres texturas adicionales se liberan una vez cada una. El control deja cero bindingsQA; la integrada no tiene ese registro (boundAfter=null, no una prueba de cero referencias generales).

Programas nocturnos32 estables; inicio diurno35 control/34 integrada, ambos terminan32. Contadores de Three.js no equivalen a VRAM ni descartan fugas prolongadas. No hay medición de tiempos GPU/CPU ni validación de perfil muy_baja o cambios de calidad en caliente en esta serie.

Reproducir con `node tools/experiments/capture-mangrove-integrated-streaming.mjs` y `python tools/experiments/package-mangrove-integrated-streaming.py`, Vite5190. Capturas locales PNG y tiras returns.webp. captures.json, parity.json, summary.json y disposal.json contienen evidencia. No modifica simulación ni geometría autoritativa.
