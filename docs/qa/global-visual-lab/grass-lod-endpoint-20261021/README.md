# Diagnóstico de imagen en el extremo LOD

Cámara fija, lod del shader forzado a0,radio28 y misma población3153 instancias. Se fuerza primero lote cercano y después lejano. Compara candidata de solo viento (base) con viento+normales (combined),día/noche,semilla712,media,1280x720.8 capturas; cámara/hora iguales, sin errores. Triángulos difieren intencionadamente por representación; no es benchmark de rendimiento ni escena normal de juego.

| Variante | Diferencia media RGB8 día/noche | Píxeles con algún canal delta>10 día/noche |
|---|---|---|
| Solo viento |0.20340 /0.13793|8366 /4175|
| Viento+normales |0.16458 /0.13081|6465 /4086|

La corrección de normales reduce MAE del cambio entre representaciones19.1% día y5.2% noche. No equivale a mejora artística global ni eliminación de popping. Persisten diferencias de topología/posición y muestreo de pigmento por vértice; atribuir cada residuo exigiría aislarlos. El radio28 es diagnóstico para garantizar población común, no cambio propuesto de distancia.

[Pareja día solo viento](base-day-pair.webp), [pareja día con normales](combined-day-pair.webp), [noche](combined-night-pair.webp). En cada pareja: cercano aplanado izquierda,lejano real derecha. Se conserva candidata como mejora parcial; el coste diurno previo~0.48ms del conjunto frente a original no se justifica automáticamente por esta métrica. No afirmar LOD resuelto.

Reproducir: node tools/experiments/capture-grass-lod-endpoint-20261021.mjs con Vite5190. Helpers endpoint separados conservan recetas originales. summary.json obtiene MAE sobre RGB8 absoluto entre0000/0001 y cuenta píxeles con cualquier canal distinto o delta>10. PNG locales,parejas y metadatos publicados. Sin main.
