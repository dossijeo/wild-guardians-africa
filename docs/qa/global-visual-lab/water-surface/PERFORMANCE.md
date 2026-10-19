# Coste en vistas centradas en el agua

ABBA en la misma página, 180 frames por muestra y calentamiento previo, semilla 712, calidad media, 1280×720. Base: global-lighting; candidato QA: water-surface. No se modificó el código cargado ni se ejecutaron otras capturas o procesos gráficos durante la medición.

| Escena | GPU base → candidato | Δ GPU | CPU envío base → candidato |
|---|---:|---:|---:|
| Sabana day | 17.745 → 19.163 ms | 1.418 ms | 5.259 → 5.585 ms |
| Sabana night | 18.205 → 18.531 ms | 0.326 ms | 5.196 → 4.919 ms |
| Gran Río day | 11.733 → 12.207 ms | 0.474 ms | 5.906 → 5.798 ms |
| Gran Río night | 12.308 → 12.571 ms | 0.263 ms | 5.789 → 5.740 ms |
| Manglares day | 19.576 → 19.790 ms | 0.214 ms | 5.887 → 5.575 ms |
| Manglares night | 20.335 → 21.404 ms | 1.069 ms | 5.494 → 5.774 ms |
| Cañón day | 12.481 → 12.949 ms | 0.467 ms | 5.498 → 5.664 ms |
| Cañón night | 13.362 → 14.137 ms | 0.776 ms | 5.291 → 5.533 ms |

Todas las muestras conservaron el estado de simulación y las cámaras por fase. La escena acuática de Sabana es un río del mapa, no solo la charca de la cámara de juego. No se midió VRAM ni latencia de carga. Los valores negativos no prueban aceleración; consultar las repeticiones crudas y su deriva.
