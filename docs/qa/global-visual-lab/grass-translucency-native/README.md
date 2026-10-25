# Transmisión foliar nativa: prueba válida, mejora insuficiente

2026-10-20. QA de Sabana, Gran Río y Gran Cañón sobre global-lighting. No modifica el comportamiento por defecto ni los perfiles conservados de vegetación.

## Decisión artística

Descartar esta variante para integración global. El aporte de contraluz suaviza algunas caras oscuras, pero se percibe principalmente como aclarado; no mejora claramente el volumen de las masas vegetales en cámara normal. En Gran Río puede reducir contraste entre caras. No aumentar su intensidad para forzar una diferencia visible. Esto descarta esta aproximación, no toda posibilidad de transmisión foliar.

- Sabana: [original](sabana/media-close-day-original.webp) / [variante](sabana/media-close-day-translucent.webp).
- Gran Río: [original](gran-rio/media-close-day-original.webp) / [variante](gran-rio/media-close-day-translucent.webp).
- Cañón: [original](gran-canon/media-close-day-original.webp) / [variante](gran-canon/media-close-day-translucent.webp).
- Cámara en movimiento de Gran Río: [original](motion-river/motion-day-original.webm) / [variante](motion-river/motion-day-translucent.webm).

## Implementación comprobada

A diferencia del piloto inactivo anterior, se modifica la función artLighting416 que realmente produce el color final. El callback nativo se conserva. Un término solar de intensidad 0.32 depende de normal geométrica, vista, altura relativa de hoja y visibilidad solar existente. Se atenúa en la raíz y desaparece con uNight. Es una aproximación artística, no una simulación de espesor ni dispersión física.

No añade mapas, buffers, geometría, instancias, draws ni pasadas. Mantiene paletas, luz directa original, AO y sombras existentes. La visibilidad solar solo pondera el término añadido; no se multiplica otra vez la iluminación completa. No se combina con viento en esta prueba.

El helper exige exactamente un anclaje de artLighting416 y falla si cambia. Las capturas confirman actividad: seis parejas diurnas cambian; las seis nocturnas son idénticas por píxel. Los doce retornos al control también son exactos. Cámaras, horas, geometría, cantidades y contadores de recursos coinciden entre variantes. No se midieron bytes internos de programas GPU.

## Evidencia y alcance

36 capturas reales de campaña, seed 712, 1280×720, calidad media, horas 150/350. Cámara normal fuera del poblado y cámara cercana centrada en un grupo real de matas, misma pose por variante. Manifiestos por bioma y control-audit.json. Sin errores registrados.

Dos clips diurnos de Gran Río, 72 frames y arco idéntico de cámara; 20 fps de reproducción, no medición de rendimiento. Se inspeccionaron muestras temporales; no se certifica ausencia de todo artefacto entre frames. No hay clips nocturnos ni recorrido largo de esta variante descartada. Calidad baja/alta y los otros tres biomas no se evaluaron.

## Rendimiento

Intel UHD/ANGLE, 48 bloques, 5 760 muestras GPU. Orden original/variante/variante/original, 30 frames de calentamiento y 120 muestras por bloque. CPU de envío y p95 en benchmark-summary.json; datos crudos comprimidos sin pérdida como benchmarks-media.json.gz por bioma.

| Bioma | Vista | Hora | GPU original / variante (ms) | Delta |
|---|---|---|---:|---:|
| sabana | close | day | 26.856 / 27.011 | +0.155 |
| sabana | close | night | 27.688 / 24.988 | -2.701 |
| sabana | game | day | 28.021 / 30.678 | +2.657 |
| sabana | game | night | 30.069 / 29.429 | -0.639 |
| gran-rio | close | day | 14.712 / 13.081 | -1.631 |
| gran-rio | close | night | 15.414 / 13.712 | -1.702 |
| gran-rio | game | day | 21.005 / 21.429 | +0.424 |
| gran-rio | game | night | 22.752 / 22.839 | +0.087 |
| gran-canon | close | day | 20.830 / 22.934 | +2.105 |
| gran-canon | close | night | 24.823 / 21.331 | -3.492 |
| gran-canon | game | day | 25.729 / 24.932 | -0.798 |
| gran-canon | game | night | 29.449 / 28.823 | -0.626 |

Los grandes cambios de signo, incluidos casos nocturnos visualmente idénticos, muestran variación temporal importante. No interpretar valores negativos como optimización ni extrapolar un coste exacto de esta pequeña modificación. Sabana/juego/día y Cañón/cerca/día superan +0.5 ms en esta ronda; no se aprueba presupuesto. La decisión de no integrar se sostiene además en la falta de mejora visual clara, sin necesidad de repetir benchmarks hasta obtener una cifra favorable.

## Reproducción

Servidor del worktree en 5190. WG_POM_QUALITY=media con capture-grass-translucency.mjs y measure-grass-translucency.mjs. record-grass-translucency.mjs graba el arco de Gran Río; summarize-grass-translucency.py lee JSON local o gzip publicado. PNG archivados como WebP sin pérdida. No hay recursos externos nuevos.

La siguiente revisión de vegetación debe trabajar la estructura visible de las masas y su relación con el suelo, evitando seguir sumando pequeños términos de luz sin evidencia artística. La calidad global de los seis mockups sigue pendiente.
