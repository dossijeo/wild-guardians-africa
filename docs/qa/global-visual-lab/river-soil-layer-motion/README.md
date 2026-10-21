# Capa de tierra de Gran RÃ­o: cÃ¡mara, streaming y liberaciÃ³n

Conservar la receta V2 como candidata QA. La muestra de regreso mantiene el emplazamiento del material tras cambios de origen, y las tres texturas nuevas se liberan al cerrar el mundo. No es aprobaciÃ³n de rendimiento ni prueba exhaustiva de fugas; sigue pendiente repetir el benchmark con menor variabilidad.

[VÃ­deo diurno](media-day.mp4) Â· [VÃ­deo nocturno](media-night.mp4) Â· [Vista oblicua diurna](media-day-0017-pair.webp) Â· [Vista inversa nocturna](media-night-0035-pair.webp) Â· [Regreso, calidad media](media-return-pair.webp)

En vÃ­deos y comparativas de cÃ¡mara: izquierda control, derecha capa de tierra V2. En la comparaciÃ³n de regreso: candidata antes/despuÃ©s de streaming. Videos de 36 capturas a 12 fps (3 s), con paso visual original 1/30: reproducciÃ³n ralentizada, no FPS de ejecuciÃ³n medidos. Se inspeccionaron fotogramas seleccionados, no reproducciÃ³n completa.

## Movimiento comparable

288 capturas, 144 parejas: Gran RÃ­o semilla 712, 1280Ã—720, baja/media, dÃ­a 150/noche 350, 36 poses entre normal, oblicua e inversa. SimulaciÃ³n pausada, render automÃ¡tico suspendido durante captura, viento 8 y tiempo 2+i/30. CÃ¡mara, objetivo, hora, tiempo de viento, opacidades de obstrucciÃ³n, llamadas, triÃ¡ngulos y buffers de cobertura coincidentes por pareja. Sin errores registrados ni imÃ¡genes vacÃ­as; overflow cero.

Instancias cercanas/lejanÃ­as: baja 0 / 3.400â€“5.123; media 2.553â€“4.966 / 2.178â€“5.187. La capa no modifica su selecciÃ³n. [Trazas](captures.json), [auditorÃ­a](analysis.json), [metadatos de vÃ­deo](video-metadata.json).

## Streaming y recursos

Una vuelta de cinco posiciones por variante y calidad, con desplazamientos de objetivo (0,0), (192,0), (192,192), (0,192), (0,0). Cambios de origen: (0,0), (288,0), (288,192), (96,192), (96,0). CÃ¡mara, objetivo y chunks del regreso coinciden con inicio; llamadas y triÃ¡ngulos tambiÃ©n coinciden en las trazas. No se mueven entidades simuladas. Se reutiliza el helper visual de vuelta, pese a su nombre histÃ³rico volcÃ¡nico.

PÃ­xeles RGB distintos al regresar: baja control 9.614 / candidata 9.421; media 8.799 / 8.594. Diferencia mÃ¡xima 39/255 en todos, media de candidata 0,00585/255 baja y 0,00694/255 media. No son capturas exactas ni prueba causal de estabilidad perfecta. La muestra media inspeccionada no muestra desplazamiento amplio de la tierra.

Contadores de candidata durante vuelta: geometrÃ­as baja 168â†’92â†’91â†’99â†’96, media 187â†’111â†’113â†’121â†’116; texturas baja 54â†’49â†’49â†’52â†’53, media 56â†’51â†’51â†’54â†’55. Son objetos, no bytes de VRAM. El control de primera pÃ¡gina retiene mÃ¡s texturas al inicio: no inferir ahorro de memoria de esa diferencia.

DespuÃ©s de la vuelta se cierra el mundo mediante su dispose real. En ambas calidades se observan tres texturas de capa, un evento dispose por textura, array de capas vacÃ­o y BiomeGround marcado disposed. Prueba una descarga por pÃ¡gina; no acredita ausencia de fugas tras muchos ciclos o en el driver. No se mide latencia de streaming ni GPU durante esta captura.

[Resultados del regreso y descarga](streaming-analysis.json). Trazas y eventos individuales en las carpetas `stream-*`.

## RecomendaciÃ³n

Mantener como candidata, sin cambiar valores predeterminados. Siguiente puerta: repeticiÃ³n de coste y evaluaciÃ³n de la forma del desgaste, que sigue siendo amplia. Los seis biomas y la calidad global aÃºn no estÃ¡n acreditados. [Receta, licencia y benchmark previo](../river-soil-layer-v2/README.md).

## ReproducciÃ³n

Con Vite 5190:

```powershell
node tools/experiments/capture-river-soil-layer-motion.mjs
python tools/experiments/package-river-soil-layer-motion.py
python tools/experiments/audit-river-soil-layer-streaming.py
python tools/experiments/encode-river-soil-layer-motion.py
```

PNG fuente locales; vÃ­deos, tres pares seleccionados, trazas y auditorÃ­as publicados. No cambios de producciÃ³n, navegaciÃ³n, reglas o main.

## Benchmark móvil posterior

Intel UHD 0x9A60, ANGLE D3D11, 1280×720, perfil bajo. Ocho bloques totales A/B/B/A por día y noche; páginas nuevas. 30 frames de calentamiento antes de 120 muestras GPU y otros 30 antes de 180 frames de cadencia, medidos por separado. Total 960 muestras GPU y 1.440 frames de cadencia, sin captura ni codificación simultánea. Trayectoria cosenoidal con periodo 180 frames y paso visual fijo 1/30; obstrucciones iniciales sincronizadas.

Auditoría aprobada: geometría y cámara coinciden por frame, estado comparado estable, cobertura sin overflow, temporizadores sin descartes, pendientes, disjoint o errores. 8,728 subidas de grupos por frame en todas las series; no es todo el tráfico GPU. [Datos](performance/benchmarks.json), [resumen auditado](performance/summary.json).

Rangos de dos medias por variante, ms:

| Medida | Control | Tierra V2 |
| --- | ---: | ---: |
| GPU día | 11,03–11,71 | 12,38–12,96 |
| GPU noche | 13,12–13,27 | 12,36–12,96 |
| CPU render día | 4,92–5,63 | 4,89–4,95 |
| CPU render noche | 4,75–5,43 | 4,56–4,66 |
| Intervalo día | 17,37–18,94 | 17,83–18,92 |
| Intervalo noche | 17,31–19,95 | 18,03–18,38 |
| p95 intervalo día | 28,80–36,20 | 28,90–32,10 |
| p95 intervalo noche | 25,90–37,00 | 27,20–31,50 |

De día la media agregada aumenta aproximadamente 1,30 ms (11,4 %). La noche no reproduce ese incremento. No afirmar aceleración general ni ausencia de coste; dos bloques no son intervalos de confianza y la frecuencia GPU/carga del sistema no se controla. CPU es render, no simulación; intervalos entre entradas al render, no presentación.

Esta serie completa la repetición móvil pendiente, pero mantiene la recomendación de no promover todavía. El código sigue muestreando la hierba antes de sustituirla enteramente por tierra en desgaste >= .70: candidato concreto de optimización que debe conservar la salida, no reducir calidad. Validar equivalencia visual y medir antes de integrar.

Reproducción adicional:

```powershell
node tools/experiments/measure-river-soil-layer-motion.mjs
python tools/experiments/audit-river-soil-layer-motion.py
```
