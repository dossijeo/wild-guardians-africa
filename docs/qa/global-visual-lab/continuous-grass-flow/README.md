# Ensayo descartado: Orientación coherente

20/10/2026 · Sabana · calidad media · semilla 712 · 1280×720.

**No se promueve esta variante.** La orientación espacial coherente crea franjas paralelas demasiado peinadas. En primer plano se leen hojas alineadas y repetición, en lugar de agrupaciones orgánicas. La variación de altura no compensa ese efecto.

## Comparación real

| Vista diurna | C conservada | Ensayo |
|---|---|---|
| Cercana | [C](media-close-day-C.webp) | [flow](media-close-day-flow.webp) |
| Normal | [C](media-game-day-C.webp) | [flow](media-game-day-flow.webp) |
| Elevada | [C](media-elevated-day-C.webp) | [flow](media-elevated-day-flow.webp) |

18 capturas: C/ensayo/C restaurada, tres cámaras, día y noche. [Manifiesto completo](captures-media.json), con cámara, hora, geometría y errores. Los seis pares C/C2 originales son idénticos byte a byte. Ningún error WebGL ni error de página registrado. Los WebP publicados son lossless y se verificaron píxel a píxel contra los PNG originales locales.

Estas capturas se hicieron con viento **1×**, antes del pase reforzado. El helper conserva explícitamente esa intensidad para reproducir el estudio. No modifica el valor 8× de la herramienta C principal.

## Implementación y límites de la evidencia

Misma topología y densidad de C: 212.704 triángulos de cobertura en vista normal. La geometría offline limita el abanico de orientación; el shader aporta orientación espacial y variación de altura. No se incrementa la densidad.

Los generadores Blender, módulos y herramientas de captura se conservan para reproducibilidad; son recursos propios, sin dependencia de assets externos. Ninguna variante se activa en el juego ni en la cobertura C principal. No se midieron GPU, CPU ni overdraw de estos ensayos: el rechazo es artístico, no una conclusión de rendimiento. No se modifica simulación ni navegación.

Reproducción con el servidor del worktree en 5190: `node tools/experiments/capture-continuous-grass-flow.mjs`. El capturador produce PNG y un manifiesto nuevo; los WebP aquí son el archivo de la captura original.

La siguiente iteración debe conservar la continuidad ya lograda por las fibras opacas y mejorar la variación orgánica sin alinear módulos enteros ni sustituirlos por una trama de fibras subpíxel. Se conserva C con el [viento 8×](../continuous-grass-wind-strong/README.md).
