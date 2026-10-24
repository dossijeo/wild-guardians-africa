# Primer ABBA de depósitos de arena

**No aprobar coste todavía.** Intel UHD 0x9A60, ANGLE D3D11, Chrome headless, WebGL2, baja, 1280×720, seed712, cámara normal del pase overview. Páginas nuevas A/B/B/A, día/noche en cada una. Calentamiento del helper antes de cada fase, 120 muestras GPU y 180 frames de cadencia en bloques separados. Sin captura concurrente.

960 muestras GPU y 1440 frames de cadencia válidos; geometría, cámara y estado iguales por fase, sin errores, disjoint, pérdidas de consultas ni pendientes al cierre. GPU mide el render instrumentado; CPU mide world.render sin simulación. Cadencia son intervalos de entrada, no presentación ni latencia de input.

| Métrica (medias de dos bloques) | Grava | Arena |
|---|---:|---:|
| GPU día ms | 6.69–7.61 | 6.86–7.12 |
| GPU noche ms | 6.63–7.27 | 7.69–8.20 |
| CPU render día ms | 2.93–2.96 | 2.66–2.77 |
| CPU render noche ms | 2.83–3.11 | 2.69–2.84 |

Cadencia media aproximadamente16.63ms, p95 17.1–17.2ms en ambos: límite de refresco oculta el sobrecoste GPU, no demuestra que sea gratuito. Los rangos son dos medias, no intervalos de confianza. Hay deriva visible, sin control térmico ni de carga externa. La noche de la candidata queda por encima de ambos controles; diferencia de medias agrupadas cercana a +1.00ms. No atribuir diferencias CPU negativas a aceleración del shader.

Pendientes repetición móvil, media, streaming y memoria real. La receta añade dos lecturas incluso en superficies donde la máscara termina anulándolas y mantiene POM de grava bajo arena: son oportunidades para investigar, no ahorros demostrados. No integrar antes de resolver presupuesto y revisión artística.

```powershell
node tools/experiments/measure-canyon-sand-maps.mjs
python tools/experiments/audit-canyon-sand-maps.py
```

Vite5190. benchmarks.json conserva muestras; summary.json deriva métricas. Simulación pausada, sombras estabilizadas: no mide actualización frecuente de sombras o partida avanzada.
