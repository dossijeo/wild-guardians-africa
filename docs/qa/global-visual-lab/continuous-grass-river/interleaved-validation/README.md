# Comparación intercalada y control nulo en baja

Fuente: 8a6674341. Piloto original frente a candidato LOD 3D + altura de viento + normales; viento8. Helper independiente `qa-continuous-grass-river-interleaved.js`; no sustituye el piloto retenido ni modifica el arranque normal.

**Decisión: no promover por rendimiento y no repetir más benchmarks equivalentes en esta sesión.** La alternancia en una escena precalentada no eliminó la variabilidad. Calidad baja usa el shader original bajo ambas etiquetas y aun así presenta diferencias de varios milisegundos. Esto confirma que esas diferencias no pueden atribuirse al cambio gráfico. No demuestra que el candidato de media sea gratuito.

## Cambio de método y fallback

Una escena por calidad, dos shaders precalentados, original/candidato/candidato/original para cada cámara/hora. Se conserva el caché de distribución y se alterna shader/criterio de selección sin desmontar el helper. Media mantiene el atributo extra residente en ambos lados (1.296 bytes); el shader original no lo usa. La rama de selección del helper de comparación existe en ambos lados. Por ello no es una medición del coste absoluto de instalar estas herramientas.

Baja retorna siempre `effective=original`, usa el shader original exacto y no crea `flatNormal` ni calcula selección esférica. Es un control nulo y una política de fallback, no una supuesta optimización de baja. Las aserciones verifican la identidad de la cadena del shader y el modo efectivo en todos los bloques.

## Datos

Intel UHD/ANGLE D3D11, 1280×720, semilla712, orilla principal, día/noche. 30 renders de calentamiento y 120 muestras por bloque; 48 bloques, **5.760 muestras GPU válidas**. Sin errores GL, disjoint, movimientos de cámara u overflow. Revisión interactiva cerrada durante la ejecución. No se controla toda la carga de Windows ni las frecuencias. CPU de render, GPU de todas las pasadas; simulación pausada.

| Calidad | Vista | Luz | GPU original / etiqueta candidato ms | Delta ms | Deriva control ms |
|---|---|---|---:|---:|---:|
| media | close | day | 16.742 / 13.826 | -2.916 | +4.018 |
| media | close | night | 30.640 / 28.602 | -2.037 | -1.307 |
| media | game | day | 29.367 / 28.487 | -0.880 | -1.225 |
| media | game | night | 27.813 / 30.312 | +2.499 | -11.682 |
| media | elevated | day | 15.830 / 14.743 | -1.087 | +0.550 |
| media | elevated | night | 18.364 / 16.141 | -2.222 | +2.276 |
| baja | close | day | 10.758 / 10.026 | -0.732 | -1.246 |
| baja | close | night | 12.796 / 11.938 | -0.858 | +3.453 |
| baja | game | day | 13.691 / 12.918 | -0.773 | +2.031 |
| baja | game | night | 13.195 / 13.791 | +0.596 | -4.844 |
| baja | elevated | day | 9.903 / 7.371 | -2.532 | +4.354 |
| baja | elevated | night | 11.367 / 11.661 | +0.294 | -2.982 |

La deriva máxima absoluta del control media es 11,68 ms y en baja 4,84 ms. En baja aparecen deltas de −2,53 ms pese a ejecutar la misma ruta gráfica: no se interpretan como ahorro. Se conservan todos los resultados y las potenciales regresiones anteriores, sin sustituirlos por esta ronda.

[Media completa](benchmarks-media.json) · [Baja completa](benchmarks-baja.json) · [Resumen media](timing-summary-media.json) · [Resumen baja](timing-summary-baja.json).

## Recomendación

Mantener piloto retenido y candidato separado. Mantener ruta original en baja. El ahorro geométrico de media y las correcciones de frontera siguen siendo evidencia útil, pero la aprobación temporal exige una sesión estable; no debe bloquear otras investigaciones artísticas que sí pueden evaluarse visualmente. No se reclama calidad global alcanzada.

Reproducir: `node tools/experiments/measure-continuous-grass-river-interleaved.mjs`; `python tools/experiments/summarize-continuous-grass-river-interleaved.py media` y `baja`. La carga del shader candidato extrae su literal desde el módulo servido por Vite y falla si no lo encuentra; es infraestructura QA, no una propuesta de carga de shaders para producción.
