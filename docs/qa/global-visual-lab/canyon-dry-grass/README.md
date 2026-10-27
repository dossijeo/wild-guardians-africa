# Paleta seca de matas del Gran Cañón

2026-10-20. Corrección limitada al perfil QA `grass-biomes`, no al comportamiento por defecto del juego. Se conserva como dirección de color: reduce el verde amarillento hacia ocre y aproxima las matas a los arbustos secos existentes. No es una mejora de relieve ni resuelve el objetivo global.

[Original cercano](media-close-day-original.webp) / [seco cercano](media-close-day-dry.webp). [Original nocturno](media-game-night-original.webp) / [seco nocturno](media-game-night-dry.webp).

Cambio: material.color lineal de [0.90,0.82,0.55] a [1.00,0.68,0.48], igual de día y noche. No se cambian vértices, siluetas, distribución, densidad, máscaras, iluminación ni shaders. Otros biomas conservan sus perfiles. No se activan sombras por mata ni se incorpora el viento en esta comparación para no mezclar efectos.

## Verificación

Doce capturas reales de campaña en global-lighting, Gran Cañón, seed 712, 1280×720, calidad media, horas 150/350, cámaras cercana y normal fuera del poblado. Original/seco/retorno original en la misma página. Los cuatro retornos coinciden exactamente por píxel; cámaras, horas y recursos son iguales entre variantes. Sin errores registrados. Cerca: 192 matas, 62 draws, 885 672 triángulos; cámara normal: consultar manifiesto para cantidad, 60 draws y 943 810 triángulos. Sin mapas o buffers adicionales por tinte; no se midió VRAM total del driver.

No se grabó otro vídeo de una modificación uniforme de color. La prueba no cubre calidades baja/alta, construcción ni sesión prolongada; los límites del sistema de vegetación experimental siguen vigentes.

## Rendimiento

1 920 muestras GPU, 16 bloques original/seco/seco/original, 30 frames de calentamiento y 120 muestras por bloque. Intel UHD/ANGLE. CPU de envío de render, no simulación completa.

| Vista | Hora | GPU original / seco (ms) | CPU original / seco (ms) |
|---|---|---:|---:|
| close | day | 27.521 / 28.880 | 3.086 / 3.144 |
| close | night | 27.398 / 28.341 | 3.139 / 3.304 |
| game | day | 23.717 / 23.377 | 2.780 / 2.672 |
| game | night | 25.419 / 25.323 | 2.742 / 2.862 |

La ronda cercana presenta +1.36/+0.94 ms, mientras la normal cambia de signo. No ocultar esos resultados ni afirmar ahorro: la modificación usa el mismo shader y recursos, cambiando solo un uniform de color, y existe deriva conocida en este equipo. Esta ronda no aprueba el presupuesto acumulado de global-lighting; sus tiempos absolutos siguen siendo elevados. Se conserva únicamente la decisión artística de paleta en QA, no una garantía de coste del conjunto.

## Historial y alcance

Antes de este ajuste se revisó la dirección global. La búsqueda de Cliff Side confirmó que ese recurso ya se había evaluado e integrado en global-lighting; no se reintroduce como mejora nueva ni se publican otra vez sus recursos. La siguiente intervención de volumen debe partir de esa implementación real y de las limitaciones documentadas, evitando repetir los ensayos descartados de cielo, ruido fino y estratos.

Reproducción: servidor del worktree en 5190; capture-canyon-dry-grass.mjs y measure-canyon-dry-grass.mjs. WG_POM_QUALITY=media reproduce esta ronda. Los controles del helper fijan explícitamente ambos colores, independientemente del perfil QA actualizado. PNG capturados archivados en WebP sin pérdida; audit.json conserva verificaciones y medias.
