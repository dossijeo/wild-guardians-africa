# Resultado A/B/A/B: helechos radiales

A: cobertura aprobada. B: variante indicada en cardStudy de benchmarks.json. Intel UHD 0x9A60 / ANGLE D3D11, Chrome, 1280×720. Escena poblada guardada, cámara oscilante de 8 m, impostores y fondo activos, simulación pausada. 60 fotogramas de calentamiento + 90 medidos por modo; GPU por EXT_disjoint_timer_query_webgl2. CPU render y cadencia se miden en otra pasada sin query GPU.

| Perfil/fase | GPU A (ms) | GPU B (ms) | Delta B−A, parejas (ms) | CPU A / B (ms) | Cadencia A / B (ms) |
|---|---:|---:|---:|---:|---:|
| media/day | 22.36 | 22.21 | -0.04 / -0.24 | 8.07 / 7.78 | 28.69 / 29.10 |
| media/night | 25.79 | 24.81 | -0.00 / -1.96 | 8.51 / 7.73 | 30.21 / 29.62 |
| baja/day | 20.67 | 19.40 | -1.00 / -1.55 | 7.45 / 7.37 | 27.37 / 26.88 |
| baja/night | 20.92 | 20.60 | -2.31 / +1.68 | 7.33 / 7.85 | 29.80 / 29.38 |

Controles: La poblacion cambia deliberadamente por el margen de exclusion y el descarte periferico. Se verifica igualdad entre repeticiones de cada variante. Recorrido de camara identico. Sin errores GL, queries disjuntas o cambios de estado de simulacion segun auditor. Repeticiones con secuencias de draws/triangulos identicas.

Limitaciones: dos parejas por condicion, carga termica/sistema no bloqueados, campana pausada. No equivale a FPS de juego activo; no sumar CPU+GPU. Percentiles y contadores completos en summary.json. VRAM fisica y overdraw de pantalla no medidos; numero de texturas y estimaciones de bytes no los sustituyen. Menos triangulos no demuestra por si solo mejor frametime.

Recommendation: retain as an artistic alternative, not a general FPS optimization. Medium daytime GPU change is only -0.04/-0.24 ms; low daytime improves -1.00/-1.55 ms, but low night changes sign (-2.31/+1.68 ms). CPU/cadence do not establish a consistent global gain. All eight same-variant repeat workload sequences are identical. This completed study predates the new mockup-inspired lighting and shadow trials; its costs cannot be assigned to those trials.
