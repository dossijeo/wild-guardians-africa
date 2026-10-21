# Coste del relieve residual de Desierto

Intel UHD ANGLE D3D11,media,1280x720,semilla712,cámara normal fija,mundo pausado. A/B/B/A,60 frames de calentamiento,480 muestras GPU válidas y720 frames de cadencia medidos por separado. Auditoría comprueba cámara/draws/triángulos iguales, estado observado estable y ausencia de errores.

| Fase/variante | GPU media ms | CPU render media ms | Intervalo callbacks ms |
|---|---|---|---|
| day base | 16.81 / 16.67 | 2.76 / 3.02 | 25.24 / 28.12 |
| day combined | 14.59 / 15.53 | 2.74 / 2.83 | 25.53 / 27.26 |
| night base | 18.19 / 18.01 | 2.78 / 2.73 | 26.58 / 30.11 |
| night combined | 16.33 / 16.74 | 2.79 / 2.84 | 29.41 / 30.47 |

Dos medias por celda, no intervalos de confianza. GPU favorable en esta sesión, CPU similar y cadencia sin mejora consistente, especialmente de noche. No prometer FPS ni atribuir causalmente la diferencia GPU a una optimización: cambia una constante de normales y su respuesta visual. No hay penalización evidente en esta ronda, no aprobación de rendimiento global. CPU excluye simulación; intervalo de callbacks no es presentación; sin memoria física GPU ni streaming.

La comparación nocturna normal fue revisada: se recuperan ondulaciones en claros manteniendo sombras y paleta; persiste contraste con arena intacta. Conservar candidata por mejora visible. Pendientes movimiento, perfiles bajos y comportamiento temporal antes de integrarla.

```text
node tools/experiments/measure-desert-wear-relief-20261021.mjs
python tools/experiments/audit-desert-wear-relief-20261021.py
```

Vite5190. Datos íntegros en benchmarks.json y percentiles/recursos en summary.json.
