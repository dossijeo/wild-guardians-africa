# Coste en vistas centradas en el agua

ABBA en la misma página, 180 frames por muestra y calentamiento previo, semilla 712, calidad media, 1280×720. Base: global-lighting; candidato QA: water-surface-lean. No se modificó el código cargado ni se ejecutaron otras capturas o procesos gráficos durante la medición.

| Escena | GPU base → candidato | Δ GPU | CPU envío base → candidato |
|---|---:|---:|---:|
| Sabana day | 17.556 → 17.325 ms | -0.231 ms | 5.350 → 5.298 ms |
| Sabana night | 19.239 → 21.027 ms | 1.788 ms | 5.258 → 5.975 ms |
| Gran Río day | 13.065 → 12.106 ms | -0.960 ms | 6.526 → 6.157 ms |
| Gran Río night | 13.074 → 13.442 ms | 0.368 ms | 5.727 → 5.807 ms |
| Manglares day | 20.055 → 21.443 ms | 1.388 ms | 5.921 → 5.960 ms |
| Manglares night | 22.172 → 20.706 ms | -1.465 ms | 5.767 → 5.490 ms |
| Cañón day | 12.995 → 12.293 ms | -0.702 ms | 5.819 → 5.613 ms |
| Cañón night | 14.420 → 14.199 ms | -0.221 ms | 5.833 → 5.843 ms |

Todas las muestras conservaron el estado de simulación y las cámaras por fase. La escena acuática de Sabana es un río del mapa, no solo la charca de la cámara de juego. No se midió VRAM ni latencia de carga. Los valores negativos no prueban aceleración; consultar las repeticiones crudas y su deriva.
