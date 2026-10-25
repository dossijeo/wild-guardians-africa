# Medición de la opción integrada

A/B/B/A original frente a volcanicNight=ambient integrado. Intel UHD ANGLE D3D11, media,1280x720,semilla712,cámara normal fija,mundo pausado.60 frames de calentamiento por medición,480 muestras GPU válidas y720 frames de cadencia, medidos por separado. Auditoría: cámaras/draws/triángulos iguales, estado observado estable, sin errores ni temporizadores descartados.

| Fase/variante | GPU media ms | CPU render media ms | Intervalo callbacks ms |
|---|---|---|---|
| day base | 17.90 / 19.40 | 4.03 / 4.01 | 31.02 / 30.66 |
| day combined | 23.57 / 18.56 | 4.51 / 3.71 | 27.02 / 28.75 |
| night base | 20.99 / 21.56 | 3.89 / 3.81 | 33.92 / 32.77 |
| night combined | 25.50 / 21.11 | 3.80 / 3.81 | 35.12 / 32.43 |

La primera repetición candidata es sensiblemente más lenta en GPU; la segunda se aproxima al control. No descartar las muestras desfavorables. Rendimiento no aprobado: el experimento no distingue regresión real de variación externa/estado del driver. No afirmar coste cero por la simplicidad del shader ni comparar directamente esta sesión con los FPS de sesiones anteriores. Mantener opción experimental por su beneficio visual, repetir mediante alternancia dentro de una misma página antes de promoverla.

Dos medias por celda, no intervalos de confianza. CPU excluye simulación; callbacks no son presentación. Sin movimiento, streaming ni memoria física GPU. Percentiles/recursos en summary.json, datos crudos en benchmarks.json.

```text
node tools/experiments/measure-volcanic-night-integrated-20261021.mjs
python tools/experiments/audit-volcanic-night-integrated-20261021.py
```
