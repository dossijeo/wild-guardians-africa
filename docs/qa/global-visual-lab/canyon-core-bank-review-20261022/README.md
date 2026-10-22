# Orillas con interior opaco — 22 octubre 2026

Candidata QA para conservar worldbank con menor coste GPU en Cañón. No modifica el renderizador por defecto ni Wild Engine.

La malla de agua se comparte entre un interior opaco que escribe profundidad antes del terreno y una franja transparente. Ambos calculan exactamente la misma opacidad; el interior descarta valores menores que uno y la franja descarta valores iguales a uno o cero antes de evaluar la iluminación del agua. No hay dithering, aproximación del umbral ni render target. Se añaden draws y se vuelven a enviar triángulos, sin duplicar geometrías ni mapas.

## Evidencia visual

Seis parejas de tres cámaras día/noche: **RGB exacto**. Semilla 712, media, 1280x720, tiempo 150/350. Capturas reales y errores registrados en captures.json; auditoría en audit.json. Las láminas comparison-day.jpg y comparison-night.jpg muestran ambos resultados.

[Recorrido](../canyon-core-bank-stream-20261022/): diez parejas adicionales RGB exactas a desplazamientos de 0/96/192/96/0 unidades siguiendo el centro del río. Se recargan chunks y cambia el origen gráfico. Un primer recorrido recto perdía de vista el agua; fue reemplazado por este recorrido siguiendo el cauce. Es una prueba corta con capturas en puntos de control, no un vídeo continuo ni una prueba prolongada de fugas.

En las vistas estáticas se añaden 4/4/5 draws y 4304/4304/4344 triángulos enviados. El número de geometrías coincide. Los contadores de texturas difieren por residencia/carga; **no se deduce una reducción de VRAM**. Se comparten los mismos mapas entre las dos partes del agua.

## Rendimiento Intel UHD

A/B/A/B, cámara móvil de cuatro unidades, 60 fotogramas de calentamiento + 90 muestras por fase, día/noche. 720 consultas GPU válidas, sin disjoint, errores ni consultas pendientes. CPU/cadencia se miden por separado. El estado simulado permanece igual y las cámaras coinciden entre variantes. Los contadores se comparan entre repeticiones de cada variante, pues la nueva envía deliberadamente más draws y triángulos.

| Fase | GPU worldbank → corebank (ms) | CPU envío worldbank → corebank (ms) |
|---|---:|---:|
| Día 1 | 13,458 → 10,386 | 3,499 → 3,339 |
| Día 2 | 13,076 → 11,730 | 3,592 → 3,679 |
| Noche 1 | 13,822 → 12,731 | 3,282 → 3,334 |
| Noche 2 | 14,874 → 12,022 | 3,284 → 3,286 |

Reducción GPU de 1,346–3,072 ms de día y 1,091–2,853 ms de noche. No hay mejora CPU consistente. La cadencia ronda 16,63 ms; no prometer más FPS por estos resultados. [Datos y percentiles](../canyon-core-bank-cost-20261022/summary.json). La medida suspende streaming en ambos brazos y excluye el coste de crear mapas. No comparar directamente con otra sesión para afirmar que ya iguala al agua original opaca.

## Reproducción

Servidor Vite en 127.0.0.1:5190:

- node tools/experiments/capture-canyon-core-bank-20261022.mjs
- node tools/experiments/capture-canyon-core-bank-stream-20261022.mjs
- python tools/experiments/audit-canyon-core-bank-images-20261022.py
- node tools/experiments/measure-canyon-core-bank-cost-20261022.mjs
- python tools/experiments/audit-canyon-core-bank-cost-20261022.py

Ejecutar las mediciones sin otras capturas simultáneas.

## Decisión

Conservar como candidata de optimización: consigue menos tiempo GPU sin perder la mejora visual. Todavía QA: el helper omite las mallas instanciadas, no se ha generalizado a charcas ni se han validado otros biomas/perfiles. Debe integrarse con propiedad explícita de materiales/geometrías compartidas y seguir verificando transparentes, streaming largo y coste de carga. El objetivo de orillas naturales en seis biomas continúa pendiente, incluyendo sedimento y corteza de lava; este paso no lo sustituye.
