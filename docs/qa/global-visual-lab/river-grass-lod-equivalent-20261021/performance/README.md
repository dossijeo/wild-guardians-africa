# Coste de LOD coherente en Gran Río

Original frente a candidata viento+normales+pigmento, preservando paleta y desgaste. Intel UHD ANGLE D3D11,1280×720,media,semilla712,cámara normal fija,viento8 animado. A/B/B/A,60 frames de calentamiento por medida;480 muestras GPU y720 frames de cadencia válidos. Cámaras, llamadas, triángulos e instancias near/far coinciden; sin errores observados.

| Fase / variante | GPU media ms | CPU render media ms | Intervalo callbacks ms |
|---|---|---|---|
| day / base | 21.07 / 18.60 | 4.06 / 3.95 | 20.23 / 19.79 |
| day / combined | 17.09 / 16.48 | 3.90 / 3.91 | 18.20 / 19.44 |
| night / base | 18.96 / 16.93 | 3.61 / 3.66 | 19.46 / 18.88 |
| night / combined | 17.39 / 17.26 | 3.66 / 3.71 | 19.10 / 19.21 |

Resultado favorable en GPU diurna en ambos bloques de candidata; CPU similar y cadencia nocturna prácticamente igual. No concluir mejora universal de FPS: son dos bloques por fase, con variación del control y páginas nuevas por ejecución. El primer control mantiene67 texturas frente a58 en los posteriores, incluido el último control;180 geometrías en todos. No se ha demostrado residencia GPU idéntica ni ahorro de VRAM. GPU y cadencia se miden por separado y no deben sumarse.

Recomendación: conservar la candidata de Gran Río y completar evaluación temporal. No descartarla por los costes observados en Sabana ni extrapolar esta ventaja a otros biomas. La reducción del viento lejano cambia la ocupación de fragmentos aunque los triángulos coincidan; el experimento mide la variante visual completa, no una optimización de instrucciones con imagen idéntica.

CPU render excluye simulación; intervalos de callback no son presentación. Sin streaming, movimiento de cámara, medición física de VRAM ni aprobación del perfil bajo. Los percentiles y datos completos están en summary.json y benchmarks.json. [Capturas comparables](../README.md).

```text
node tools/experiments/measure-river-grass-lod-20261021.mjs
python tools/experiments/audit-river-grass-lod-20261021.py
```

Vite5190. Archivar salidas antes de repetir. Candidata QA, predeterminado y main intactos.
