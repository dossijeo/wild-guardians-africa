# IluminaciÃ³n del sustrato coherente con los parches

Candidata QA: el barro proyectado usa africanToon4 con la receta del interior de parches; el musgo conserva la ruta de terreno. Se mezclan los resultados con el mismo peso por altura ya validado. Ambas variantes usan conversiÃ³n aproximada del tinte en luz lineal. La comparaciÃ³n cambia receta de iluminaciÃ³n y rugosidad del sustrato conjuntamente, no aÃ­sla un Ãºnico tÃ©rmino de luz.

[Oblicua diurna](manglares-media-day-2-pair.webp) Â· [Oblicua nocturna](manglares-media-night-2-pair.webp). Izquierda iluminaciÃ³n de terreno; derecha receta de parches para el barro. Inspeccionadas candidatas completas de ambas vistas.

La candidata recupera un barro cÃ¡lido de dÃ­a y reduce el tinte azul de noche. Su respuesta se acerca a los parches existentes. Conservar como candidata visual, **sin aprobar integraciÃ³n**: la superficie continÃºa plana, el reparto de musgo necesita revisiÃ³n global y el coste de evaluar dos recetas debe medirse. Esto no acredita equivalencia con los mockups.

## ImplementaciÃ³n y lÃ­mites

La funciÃ³n del material conserva albedo, normal, rugosidad y peso de barro en variables del fragmento. DespuÃ©s de iluminar el terreno, calcula africanToon4 para barro y mezcla salidas. Albedo con toLinear4 aproximado gamma2.2; rugosidad max(.04,ARH.gÃ—.52), normal .55 con atenuaciÃ³n de distancia, reflexiÃ³n de entorno y detecciÃ³n de material vegetal igual a la receta de los parches. No se garantiza igualdad RGB: parches tienen UV diferentes, decodificaciÃ³n sRGB hardware y normal sin la misma atenuaciÃ³n.

No aÃ±ade geometrÃ­a, draw calls ni texturas frente al prototipo de mezcla de materiales. SÃ­ aÃ±ade cÃ¡lculo de iluminaciÃ³n y otra consulta al entorno; actualmente se calcula incluso donde su peso es cero. El terreno ya iluminado tambiÃ©n se calcula donde domina barro. Es una implementaciÃ³n de evaluaciÃ³n, todavÃ­a sin eliminaciÃ³n de trabajo redundante. No afirmar coste nulo por mantener draw calls.

## Evidencia visual

24 capturas/12 parejas, media/baja, dÃ­a150/noche350, tres vistas prÃ³ximas a transiciÃ³n, seed712,1280Ã—720. CÃ¡mara, objetivo, hora, draw calls y triÃ¡ngulos coinciden, sin errores registrados. Conversiones WebP individuales lossless verificadas contra PNG; pares reducidos publicados. [Registros](captures.json) Â· [ComparaciÃ³n](comparison.json).

Pendientes: vista normal/elevada integrada, movimiento visual, horizonte, recursos y coste estable. La mediciÃ³n de cÃ¡mara mÃ³vil usa el recorrido general del asentamiento, no reproduce exactamente estas cÃ¡maras cercanas. Sin cambios de simulaciÃ³n, navegaciÃ³n, modelos ni main.

## ReproducciÃ³n

Vite5190:

```powershell
node tools/experiments/capture-mangrove-soil-toon.mjs
python tools/experiments/package-mangrove-soil-toon.py
node tools/experiments/measure-mangrove-soil-toon.mjs
python tools/experiments/audit-mangrove-soil-toon.py
```

## Benchmark: coste no aprobado

Intel UHD0x9A60/ANGLE D3D11, baja,1280×720, recorrido general con cámara móvil, ABAB por fase. 180 frames de calentamiento y240 muestras por bloque:1.920 GPU y1.920 de cadencia. Todas las consultas válidas, resueltas, sin disjoint/descartes/errores; cámara, draw calls y triángulos coinciden por índice. [Datos](performance/benchmarks.json) · [Resumen](performance/summary.json).

| Fase | GPU control, dos repeticiones(ms) | GPU candidata(ms) | Diferencias B−A(ms) |
|---|---|---|---|
| Día |12.100 /15.784|19.266 /15.176|+7.165 /−0.608|
| Noche |12.479 /15.736|18.423 /16.744|+5.944 /+1.008|

Hay deriva importante incluso en controles. No inferir un sobrecoste estable a partir de la media agregada ni atribuir toda la variabilidad al shader. La candidata es más lenta en ambas repeticiones nocturnas; no demuestra un coste aceptable. Cadencia media20.46–36.75ms en candidata y23.14–23.59ms en control; p95 muy variable. CPU de render4.72–6.72ms candidata frente5.66–7.35ms control: esa diferencia tampoco demuestra optimización CPU al cambiar solo shading. Los intervalos son entradas al render, no presentación, y la CPU excluye simulación.

Mantener la receta como referencia visual, no integrar esta implementación que calcula ambas iluminaciones en todos los fragmentos. Una siguiente variante puede evitar trabajo de musgo en barro puro y viceversa, pero deberá demostrar equivalencia de imagen y medir de nuevo; no asumir que una bifurcación será más rápida. Este benchmark compara contra la mezcla previa, no contra musgo puro, y por ello no cuantifica todo el coste añadido por el conjunto.
