# Coste en vistas centradas en el agua

ABBA en la misma página, 180 frames por muestra y calentamiento previo, semilla 712, calidad media, 1280×720. Base: global-lighting; candidato QA: water-surface-map. No se modificó el código cargado ni se ejecutaron otras capturas o procesos gráficos durante la medición.

| Escena | GPU base → candidato | Δ GPU | CPU envío base → candidato |
|---|---:|---:|---:|
| Gran Río day | 11.835 → 11.987 ms | 0.152 ms | 5.702 → 5.723 ms |
| Gran Río night | 13.009 → 12.222 ms | -0.787 ms | 5.587 → 5.402 ms |
| Manglares day | 20.124 → 19.601 ms | -0.523 ms | 5.978 → 6.087 ms |
| Manglares night | 21.101 → 20.406 ms | -0.695 ms | 5.996 → 5.651 ms |
| Sabana day | 16.989 → 16.101 ms | -0.888 ms | 5.302 → 4.753 ms |
| Sabana night | 18.070 → 18.320 ms | 0.250 ms | 4.760 → 4.951 ms |
| Cañón day | 13.197 → 12.024 ms | -1.173 ms | 6.217 → 5.848 ms |
| Cañón night | 14.344 → 13.822 ms | -0.522 ms | 6.111 → 5.929 ms |

Todas las muestras conservaron el estado de simulación y las cámaras por fase. La escena acuática de Sabana es un río del mapa, no solo la charca de la cámara de juego. No se midió VRAM ni latencia de carga. Los valores negativos no prueban aceleración; consultar las repeticiones crudas y su deriva.
