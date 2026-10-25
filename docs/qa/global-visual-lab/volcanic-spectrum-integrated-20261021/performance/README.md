# Coste de spectrum integrado

Control:volcanicNight=ambient. Candidata:volcanicNight=spectrum. Ambas con global-lighting,ceniza yroca estratificada. Intel UHD ANGLE D3D11,media,1280×720,semilla712,cámara normal fija. A/B/B/A,día/noche,calentamiento previo,480 muestras GPU y720 frames de cadencia. Auditoría válida:misma cámara/draws/triángulos,estado observado estable,sin errores.

| Fase/variante | GPU ms | CPU render ms | Intervalos ms |
|---|---|---|---|
| day base | 14.45 / 27.13 | 3.79 / 5.65 | 17.65 / 25.58 |
| day combined | 14.82 / 14.97 | 3.82 / 3.88 | 16.56 / 17.24 |
| night base | 16.47 / 23.56 | 3.86 / 4.46 | 19.50 / 32.81 |
| night combined | 16.30 / 15.64 | 3.58 / 3.58 | 17.00 / 17.97 |

No concluyente para rendimiento causal:último control diurno27.13ms frente a14.45ms inicial,con degradación también de CPU/cadencia. Candidata diurna14.82/14.97ms,no presentar su promedio favorable como optimización. No descartar el resultado visual por una ronda con controles inestables.

189 geometrías constantes;60 texturas al inicio y53 después,incluido último control. No mide VRAM ni demuestra residencia igual. Páginas nuevas por bloque;CPU excluye simulación;GPU/cadencia separadas;intervalos no equivalen a presentación. Sin streaming ni benchmark de baja.

Recomendación:mantener spectrum como opción experimental y conservar ambient para revisión. No sustituir predeterminado ni aprobar presupuesto global con estos datos. Antes de más rondas de precisión,diagnosticar carga/scheduling del sistema;repetir el mismo método sin ese diagnóstico no resolverá la incertidumbre.

```text
node tools/experiments/measure-volcanic-spectrum-20261021.mjs
python tools/experiments/audit-volcanic-spectrum-20261021.py
```

Vite5190;archivar salidas antes de repetir.
