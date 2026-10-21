# Coste conjunto de viento y normales LOD

Control original qa-continuous-grass frente a candidata que atenúa viento18–24 e interpola normales hacia light. No es el control de solo viento utilizado en las capturas anteriores. Intel UHD ANGLE D3D11,media,1280x720,semilla712,cámara normal fija,viento animado. A/B/B/A,60 frames calentamiento,480 muestras GPU válidas y720 frames de cadencia,medidos por separado. Cámaras/draws/triángulos y recuentos near/far coinciden; sin errores,estado observado estable.

| Fase/variante | GPU media ms | CPU render media ms | Intervalo callbacks ms |
|---|---|---|---|
| day base | 19.61 / 19.68 | 4.18 / 3.73 | 21.62 / 22.72 |
| day combined | 20.12 / 20.12 | 3.66 / 3.66 | 22.21 / 21.71 |
| night base | 20.27 / 21.96 | 3.98 / 3.56 | 21.96 / 23.54 |
| night combined | 21.25 / 21.35 | 3.69 / 3.68 | 24.26 / 23.27 |

GPU diurna aumenta aproximadamente0.48ms al promediar los dos bloques. Noche presenta mayor variación del control. CPU/cadencia no muestran una ganancia global consistente. Conservar candidata por coherencia de transición, sin presentarla como optimización ni descartarla solo por coste. Falta demostrar el beneficio temporal final de normales, además del vídeo de viento ya publicado.1296 bytes nominales extra de atributos, sin nuevas instancias/triángulos.

Revisión adicional de geometría: comparar flatPosition de las primeras8 hojas refinadas con interpolación lineal entre borde base y punta de light al mismo uv.x da1.56mm de distancia media y3.37mm máxima en56 vértices. No se modifica por ahora: prioridad a discontinuidades de viento/normales, sin perseguir diferencias geométricas minúsculas. Esto tampoco demuestra igualdad exacta de topologías ni ausencia de popping.

Dos medias por celda,no intervalos de confianza; CPU excluye simulación; callbacks no son presentación. Sin streaming ni memoria física GPU. Datos/percentiles completos en benchmarks.json y summary.json.

```text
node tools/experiments/measure-grass-normal-lod-20261021.mjs
python tools/experiments/audit-grass-normal-lod-20261021.py
```

Vite5190. No integración por defecto ni cambios en main.
