# Coste del margen de viento en Gran Río

ABBA, Intel UHD/D3D11 ANGLE, baja,1280x720, semilla712. A: margen0,6; B:0,85. Ambos usan claros herbáceos, tierra integrada, paleta y coberturaC, viento8. Cámara normal fija, simulación pausada, viento animado por índice. Sin el centro/cultivo añadido en las capturas de ocupación: esta es la escena de poblado inicial, no un benchmark de eventos.

Ocho bloques:180frames de calentamiento por ventana,120consultasGPU y180frames de cadencia medidos separadamente.960consultasGPU y1440frames de cadencia; sin erroresGL, disjoint, descartes ni cambios de estado. MáximoGPU individual30,995ms. Auditoría exige mismo dispositivo/resolución/cámara y repetibilidad geométrica dentro de cada variante; A/B difieren intencionadamente.

| Medida | A,0,6 | B,0,85 |
|---|---:|---:|
| GPU día,ms |12,326 /12,748|11,075 /12,255|
| GPU noche,ms |13,029 /10,842|12,108 /11,423|
| CPU render día,ms |3,928 /3,730|4,072 /3,561|
| CPU render noche,ms |3,637 /3,463|3,831 /3,545|
| Módulos visibles |5816|5793|
| Triángulos/frame |509681|509497|
| Draw calls |63|63|

Son dos medias de bloque por fase y variante, no intervalos de confianza. Cadencia16,626–16,629ms en todas las ventanas; los p95 medidos están entre17,0 y17,2ms. No se demuestra mejora de FPS. GPU diurna menor en B; nocturna mixta y CPU nocturna ligeramente mayor. No atribuir las diferencias completas a23módulos menos ni inferir aceleración universal.

Conservar la opción QA junto a las capturas artísticas anteriores. No se observa un sobrecoste GPU consistente en esta escena estática, pero no se mide aquí el coste de generación de tiles, respuesta a eventos, streaming o movimiento. Esos límites impiden promoverla globalmente.

[Datos brutos](benchmarks.json), [resumen y percentiles](summary.json). Reproducir con node tools/experiments/measure-river-wind-padding.mjs y python tools/experiments/audit-river-wind-padding.py, Vite5190. Usar carpeta nueva antes de repetir para preservar evidencia.
