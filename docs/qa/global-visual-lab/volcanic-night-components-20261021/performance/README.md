# Coste del ambiente volcánico nocturno

A/B/B/A original frente a ambiente x1.65. Intel UHD ANGLE D3D11, media,1280x720, semilla712, cámara normal fija, mundo pausado.60 frames de calentamiento por medición,480 muestras GPU válidas y720 frames de cadencia, medidos por separado. Auditoría comprueba cámaras, draws y triángulos idénticos en todos los frames, sin errores ni cambios del estado observado.

| Fase/variante | GPU media ms | CPU render media ms | Intervalo callback medio ms |
|---|---|---|---|
| day base | 14.58 / 16.75 | 4.06 / 4.00 | 20.40 / 17.28 |
| day combined | 16.11 / 14.34 | 4.07 / 3.97 | 16.63 / 17.74 |
| night base | 16.36 / 15.86 | 3.48 / 3.75 | 16.75 / 18.72 |
| night combined | 14.68 / 15.21 | 3.95 / 3.57 | 18.02 / 16.97 |

Cada celda contiene dos medias de bloque, no intervalo de confianza. GPU nocturna favorable pero CPU/cadencia mezcladas; controles diurnos variables. No hay regresión consistente observada ni ganancia FPS demostrada. CPU excluye simulación; callback no equivale a presentación. Recursos y percentiles completos en summary.json, muestras en benchmarks.json. No prueba movimiento, streaming ni memoria física GPU.

## Hallazgo al revisar la transición

La candidata medida multiplica todo el ambiente interpolado por (1+0.65*uNight). Esto también amplifica la parte diurna durante el anochecer. No integrarla tal cual: próximo ajuste debe aumentar únicamente el extremo nocturno antes de interpolar. Los extremos día/noche coinciden matemáticamente entre ambas formulaciones, pero los estados intermedios difieren. Este benchmark corresponde al shader original de la candidata, no a una futura corrección.

Mantener la candidata visual y preparar esa corrección con capturas del ciclo. No eliminar AO ni modificar objetos. La valoración favorable de costes es acotada, no aprobación global.

```text
node tools/experiments/measure-volcanic-night-ambient-20261021.mjs
python tools/experiments/audit-volcanic-night-ambient-20261021.py
```

Vite5190; receta qa-volcanic-night-components-20261021.mjs modo ambient.
