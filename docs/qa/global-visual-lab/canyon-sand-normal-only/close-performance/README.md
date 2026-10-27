# Coste de arena normal-only en aproximación cercana

La arena cuesta más de día en este encuadre: +0.230 y +0.536 ms GPU en parejas A/B consecutivas (media agrupada +0.383 ms, ~6.1%). No aprobar un presupuesto universal a partir de la confirmación favorable de la cámara anterior. Conservar la candidata por su mejora visual, pendiente de reducción de coste o aceptación explícita del intercambio.

Intel UHD 0x9A60, ANGLE D3D11, WebGL2, baja, 1280×720. Campaña Gran Cañón semilla 712, día150/noche350. Control grava .08 frente a receta completa de arena seca normal-only; global-lighting y warm-floor en ambos. Secuencia A/B/A/B, cada página mide día y noche. Cada medición tiene 180 frames de calentamiento y 240 muestras; GPU y CPU/cadencia se ejecutan separadamente.

El objetivo y extremos son los de [motion-close](../motion-close/README.md), offsets [9,5,9] a [5,2,8], seleccionados sobre suelo despejado. La cámara sigue una ida/vuelta cosenoidal de 180 frames, no la reproducción lineal del vídeo. Se verifica altura sobre terreno cada frame; no se capturan imágenes durante la medición. Simulación pausada y materiales congelados. No es una prueba de streaming prolongado.

| Medias por bloque, ms | Grava | Arena |
|---|---:|---:|
| GPU día | 6.356 / 6.164 | 6.586 / 6.700 |
| GPU noche | 7.092 / 6.500 | 6.718 / 6.937 |
| CPU render día | 3.038 / 3.016 | 3.073 / 3.071 |
| CPU render noche | 2.893 / 3.052 | 3.035 / 3.400 |

Noche: diferencias -0.374/+0.437 ms; control deriva0.592 ms, resultado inconcluso. CPU diurna +~0.045 ms agrupado; CPU nocturna variable. Cadencia media16.628–16.698 ms, p95 17.1–17.5 ms: limitada por refresco, no equivale a tiempo GPU ni latencia de presentación. Dos medias no son intervalos de confianza. Sin aislamiento térmico o de carga externa; no afirmar aceleración nocturna.

Auditoría: 1920 muestras GPU válidas y1920 frames de cadencia; cámaras, draw calls, triángulos, objetivo, hora y dispositivo iguales. Estado de simulación sin cambios. Sin errores GL, disjoint, descartes o consultas pendientes. Uploads assetGroups0.341667/frame en todos los bloques, no tráfico GPU total. No VRAM medida. No cambios de renderer de producción, geometría o simulación.

El sobrecoste diurno crece respecto al recorrido anterior, pero esta comparación entre series no aísla causalmente ocupación de pantalla. El shader todavía calcula grava/POM y dos campos de ruido antes de mezclar arena: son candidatos para una siguiente ablación, no culpables demostrados por este benchmark. No repetir la máscara de depósitos descartada sin un cambio técnico que resuelva sus límites.

## Reproducción

Con Vite5190:

```powershell
node tools/experiments/measure-canyon-sand-close.mjs
python tools/experiments/audit-canyon-sand-close.py
```

[Datos](benchmarks.json), [resumen](summary.json). Candidata solo QA; faltan revisión temporal completa y streaming prolongado. La calidad global de seis biomas no queda demostrada por este resultado.
