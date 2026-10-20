# Ensayo descartado: Láminas curvas con alpha cutout

20/10/2026 · Sabana · calidad media · semilla 712 · 1280×720.

**No se promueve esta variante.** Las fibras finas del atlas se leen como cerdas brillantes en primer plano. Desde la cámara normal, la cobertura pierde cuerpo respecto a C: vuelve a dominar la textura plana. El recorte y la iluminación del plano no representan la orientación individual de cada fibra. Este ensayo no demuestra que todas las grass cards sean inadecuadas; descarta esta unidad y su respuesta de iluminación.

## Comparación real

| Vista diurna | C conservada | Ensayo |
|---|---|---|
| Cercana | [C](media-close-day-C.webp) | [cards](media-close-day-cards.webp) |
| Normal | [C](media-game-day-C.webp) | [cards](media-game-day-cards.webp) |
| Elevada | [C](media-elevated-day-C.webp) | [cards](media-elevated-day-cards.webp) |

18 capturas: C/ensayo/C restaurada, tres cámaras, día y noche. [Manifiesto completo](captures-media.json), con cámara, hora, geometría y errores. Los seis pares C/C2 originales son idénticos byte a byte. Ningún error WebGL ni error de página registrado. Los WebP publicados son lossless y se verificaron píxel a píxel contra los PNG originales locales.

Estas capturas se hicieron con viento **1×**, antes del pase reforzado. El helper conserva explícitamente esa intensidad para reproducir el estudio. No modifica el valor 8× de la herramienta C principal.

## Implementación y límites de la evidencia

Atlas propio de 256×256 generado en Blender a partir de 24 fibras. Dos láminas curvas en LOD ligero (12 triángulos) y tres en cercano (18 triángulos), compartidas por instancing. Alpha cutout a 0,45, sin alpha blending. En vista normal: 143.520 triángulos de cobertura frente a 212.704 de C (−32,5%). Reducir triángulos no demuestra reducir coste GPU: añade una lectura de atlas y puede aumentar overdraw; no se ejecutó benchmark temporal tras el rechazo visual.

Los generadores Blender, módulos y herramientas de captura se conservan para reproducibilidad; son recursos propios, sin dependencia de assets externos. Ninguna variante se activa en el juego ni en la cobertura C principal. No se midieron GPU, CPU ni overdraw de estos ensayos: el rechazo es artístico, no una conclusión de rendimiento. No se modifica simulación ni navegación.

Reproducción con el servidor del worktree en 5190: `node tools/experiments/capture-continuous-grass-cards.mjs`. El capturador produce PNG y un manifiesto nuevo; los WebP aquí son el archivo de la captura original.

La siguiente iteración debe conservar la continuidad ya lograda por las fibras opacas y mejorar la variación orgánica sin alinear módulos enteros ni sustituirlos por una trama de fibras subpíxel. Se conserva C con el [viento 8×](../continuous-grass-wind-strong/README.md).
