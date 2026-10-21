# Coste del horizonte emisor: caché y reconstrucción

Intel UHD ANGLE D3D11,1280x720,Gran Cañón media seed712,view47,día150/noche350. ABBA con páginas nuevas. Dos modos por fase: caché habitual y shadow.needsUpdate=true en cada fotograma.16 bloques,960 muestras GPU y1440 fotogramas de cadencia,60 de calentamiento antes de cada medición. Timers GPU válidos, sin disjoint/errores; simulación pausada e idéntica.

Resultado estructural estable:
- Caché:35 calls/330353 triángulos en ambas variantes; cero reconstrucciones y271–275 aciertos por bloque incluyendo calentamiento/esperas. Ningún emisor no rastreado.
- Reconstrucción forzada:control66 calls/642483 triángulos;candidata67/676887. Coste adicional1 draw y34404 triángulos por mapa reconstruido.271–275 reconstrucciones por bloque, cero aciertos. No confundir esta condición artificial con movimiento normal.

| Fase/modo | GPU control, medias de bloque ms | GPU candidata, medias de bloque ms |
|---|---|---|
| Día caché |10.18 /14.95|15.73 /13.69|
| Día forzado |14.18 /17.30|16.85 /16.70|
| Noche caché |16.03 /16.59|15.32 /14.37|
| Noche forzado |16.07 /21.48|17.92 /17.56|

CPU render:control2.89–3.95ms,candidata2.92–3.67ms entre bloques. Cadencia media16.63–38.08ms control y23.40–28.42ms candidata; p95 completos en summary.json. La variabilidad del propio control y la discrepancia entre cadencia y tiempos CPU/GPU impiden atribuir un delta temporal robusto o una mejora de FPS. No se descartan datos ni se escoge solo el mejor bloque. Causa de la variabilidad no aislada; no inferir throttling o carga externa sin evidencia. Son intervalos de callbacks, no presentación.

Recomendación: conservar la candidata por la mejora visible de continuidad y por el coste geométrico acotado observado. La caché no se invalida continuamente por añadir el horizonte. Pendiente un pase móvil/streaming y validación de calidad baja antes de integración general. Esta medición no obliga a descartar la apariencia por rendimiento ni demuestra coste cero.

Reproducir Vite5190: `node tools/experiments/measure-canyon-horizon-caster.mjs`; `python tools/experiments/audit-canyon-horizon-caster-performance.py`. Código y datos publicados en rama experimental, main intacta. No se mide VRAM ni generación de horizonte en esta prueba estacionaria.
