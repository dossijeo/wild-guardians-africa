# Validación combinada de Gran Río

Candidato: `qa-continuous-grass-river-normal-continuity.js`, fuente 29bc89e22. Referencia: piloto retenido `qa-continuous-grass-river.js`. La etiqueta `distance` del harness significa aquí LOD 3D + altura de viento interpolada + normales interpoladas. Viento 8× en ambas.

**Decisión: no promover la combinación con esta ronda.** La deriva del control impide asignar con confianza las diferencias al shader. Además aparecen regresiones potenciales en baja que requieren resolver, no ignorar por conveniencia. El ahorro anterior del LOD aislado no prueba el coste de esta combinación.

## Método

Intel UHD 0x9A60 / ANGLE D3D11, 1280×720, semilla712, orilla principal. Media/baja, cercana/normal/elevada, día/noche. Original/candidato/candidato/original, páginas independientes; 30 renders de calentamiento +120 medidos por bloque. 48 bloques, **5.760 muestras GPU válidas**. Revisión interactiva cerrada; no otros procesos QA Chrome detectados al comenzar. Sin errores GL, disjoint, movimientos de cámara ni overflow. CPU mide render, GPU todas las pasadas; mundo pausado, no gameplay completo. Windows no está bajo control de frecuencia o carga total.

| Perfil | Cámara | Luz | GPU original / candidato ms | Delta ms | Deriva control ms | CPU original / candidato ms |
|---|---|---|---:|---:|---:|---:|
| media | close | day | 16.077 / 17.784 | +1.707 | +3.616 | 6.70 / 5.20 |
| media | close | night | 17.028 / 17.962 | +0.934 | +3.620 | 6.60 / 4.90 |
| media | game | day | 15.885 / 17.442 | +1.557 | +4.322 | 5.85 / 4.40 |
| media | game | night | 18.465 / 17.919 | -0.546 | +4.532 | 5.90 / 5.40 |
| media | elevated | day | 14.984 / 12.982 | -2.001 | +3.783 | 5.50 / 5.25 |
| media | elevated | night | 15.368 / 13.703 | -1.665 | +4.255 | 5.35 / 5.30 |
| baja | close | day | 12.175 / 10.818 | -1.356 | +2.050 | 6.00 / 6.60 |
| baja | close | night | 12.751 / 11.236 | -1.515 | +2.576 | 6.15 / 6.30 |
| baja | game | day | 10.504 / 9.732 | -0.772 | +1.336 | 6.00 / 5.80 |
| baja | game | night | 10.569 / 13.531 | +2.963 | +1.013 | 6.30 / 5.70 |
| baja | elevated | day | 7.958 / 10.529 | +2.570 | +0.929 | 5.55 / 5.00 |
| baja | elevated | night | 8.636 / 10.231 | +1.595 | +0.983 | 5.90 / 5.10 |

Media: deriva de control de 3,62–4,53 ms; el ahorro elevado aparente de 1,66–2,00 ms no queda aislado de esa variabilidad. Baja: deltas desfavorables de hasta +2,96 ms; algunos superan la deriva del control, por lo que no se descarta una regresión real. También hay deltas favorables sin reducción geométrica: no se interpretan como aceleración probada.

Los triángulos/draws corroboran las reducciones geométricas esperadas en media y ausencia de reducción en baja. Por tanto, la prioridad siguiente es evitar trabajo nuevo en el perfil ligero y usar comparaciones intercaladas en una misma escena precalentada para acortar el intervalo entre controles. No repetir la misma prueba hasta obtener números favorables.

[Datos media](benchmarks-media.json) · [Datos baja](benchmarks-baja.json) · [Resumen media](timing-summary-media.json) · [Resumen baja](timing-summary-baja.json).

Reproducir: `node tools/experiments/measure-continuous-grass-river-combined.mjs`; `python tools/experiments/summarize-continuous-grass-river-combined.py media` y `baja`.

## Streaming funcional

Media y baja: 120 movimientos de cámara, desplazamiento de 288 m, regreso e invalidación de ocupación sin cambio de estado. Distribución idéntica antes/después del movimiento y del regreso (digests 169873077 y 1009173475), invalidación determinista, cero overflow y cero raíces dentro del agua en las posiciones auditadas. Sin errores GL. Las consultas `waterInfo` pertenecen al validador, no al renderizador. Esto no prueba que todas las hojas barridas por viento queden fuera del agua ni cubre todas las semillas.

[Media](streaming-media.json) · [Baja](streaming-baja.json). Reproducir: `node tools/experiments/streaming-continuous-grass-river-combined.mjs`. Tiempos incluidos son diagnósticos funcionales; no se mezclan con los benchmarks anteriores.

La variante queda disponible para investigación, sin reemplazar el piloto retenido. Main y comportamiento normal del juego no cambian.
