# Coste residente de worldbank

Intel UHD 0x9A60, ANGLE D3D11, Chrome, media, 1280x720, semilla 712. A/B/A/B por bioma, día y noche. Cada fase tiene 60 fotogramas de calentamiento y 90 muestras GPU; CPU y cadencia se miden en otra pasada sin consultas GPU. Cámara en un recorrido de cuatro unidades. Streaming suspendido de forma idéntica en ambos brazos: **no mide generación de mapas ni latencia de carga**.

Auditoría: 1.440 consultas GPU válidas, sin disjoint, errores ni pendientes; mismo recorrido, calls y triángulos en todas las muestras correspondientes, estado simulado sin cambios. Código: `measure-biome-world-bank-cost-20261022.mjs`, `audit-biome-world-bank-cost-20261022.py`.

| Bioma / hora / repetición | GPU original → variante (ms) | CPU envío original → variante (ms) | Cadencia original → variante (ms) |
|---|---:|---:|---:|
| sabana / day / 1 | 22.360 → 21.113 | 4.980 → 4.893 | 24.191 → 24.048 |
| sabana / day / 2 | 20.696 → 21.090 | 5.163 → 5.127 | 25.219 → 24.440 |
| sabana / night / 1 | 22.498 → 21.946 | 5.001 → 4.904 | 25.316 → 24.608 |
| sabana / night / 2 | 21.756 → 21.750 | 4.867 → 5.044 | 25.004 → 25.606 |
| gran-canon / day / 1 | 9.864 → 12.674 | 3.270 → 3.482 | 16.630 → 16.633 |
| gran-canon / day / 2 | 9.865 → 14.426 | 3.564 → 3.600 | 16.634 → 16.643 |
| gran-canon / night / 1 | 10.576 → 14.167 | 3.439 → 3.370 | 16.636 → 16.630 |
| gran-canon / night / 2 | 10.412 → 13.647 | 3.688 → 3.530 | 16.640 → 16.632 |

Sabana: no hay una penalización consistente ni evidencia suficiente para afirmar aceleración. Cañón: penalización GPU clara de **+2,810 a +4,561 ms de día**, **+3,235 a +3,591 ms de noche**. La cadencia sigue alrededor de 16,63 ms, pero se consume margen de GPU; no afirmar que es gratis porque el FPS no cambie. CPU de envío varía poco. Percentiles y datos crudos en summary.json y benchmarks.json.

Se conserva la variante por su mejora visual. Antes de activarla en perfiles modestos conviene separar el interior opaco de la franja transparente y evitar ejecutar el tratamiento en toda la superficie/horizonte. Esto es una hipótesis de optimización pendiente, no una ventaja demostrada. También faltan costes de Manglares, Gran Río y lava, cambios de origen durante movimiento y streaming largo.
