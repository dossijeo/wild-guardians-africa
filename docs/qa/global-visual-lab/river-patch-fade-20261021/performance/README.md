# Coste de pigmento espacial con transición

Control:LOD coherente sin campo espacial. Candidata:campo espacial con retorno al pigmento original24–36. Intel UHD ANGLE D3D11,1280×720,media,semilla712,cámara fija y viento8 animado. A/B/B/A con calentamiento,480 muestras GPU y720 frames de cadencia. Misma cobertura/geometría y cámara,sin errores ni consultas inválidas.

| Fase/variante | GPU ms | CPU render ms | Intervalos ms |
|---|---|---|---|
| day base | 14.52 / 25.74 | 3.56 / 3.76 | 18.45 / 32.83 |
| day combined | 24.95 / 25.25 | 4.36 / 4.00 | 34.89 / 32.62 |
| night base | 17.57 / 28.87 | 4.03 / 3.67 | 22.80 / 35.51 |
| night combined | 25.14 / 25.72 | 3.95 / 3.83 | 35.72 / 33.87 |

Resultado no concluyente para coste causal:control diurno14.52→25.74ms GPU y nocturno17.57→28.87ms. La deriva entre controles es mayor que la diferencia que queremos atribuir al material. No promediar estos datos para aprobar o rechazar la candidata. Conservarlos y usar en una futura prueba alternancia en la misma escena con residencia estabilizada. Causa de la deriva no identificada.

180 geometrías;primer control67 texturas yresto58,también último control. No representa memoria física GPU. CPU excluye simulación;cadencia y GPU medidas por separado,intervalos no son presentación. No mide coste inicial del campo ni streaming. No prometer mejora FPS.

```text
node tools/experiments/measure-river-patch-fade-20261021.mjs
python tools/experiments/audit-river-patch-fade-20261021.py
```

Vite5190;archivar salidas antes de repetir.
