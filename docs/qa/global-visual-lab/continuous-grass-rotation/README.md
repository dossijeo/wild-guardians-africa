# Viento por rotación: alternativa QA, sin sustitución de C

20/10/2026 · Sabana · semilla 712 · Intel UHD 0x9A60 / ANGLE D3D11 · 1280×720.

**Se conserva el viento C 8× como versión principal.** La alternativa reduce el estiramiento radial, pero mantiene las hojas más erguidas en algunas zonas y añade coste en las mediciones diurnas de calidad media. Se conserva como herramienta QA reproducible, no como mejora global aprobada ni activada en el juego.

## Comparación en movimiento

- [Vídeo sincronizado: izquierda C 8×, derecha rotación](comparison.mp4).
- [Rotación a resolución completa](wind-rotation.mp4).
- [C 8× a resolución completa](wind-current-8x.mp4).
- [Cámara cercana a normal con rotación](camera-rotation.mp4).

150 fotogramas reales por vídeo fijo, shader a `i/30`, cámara `[138,11.400129699707032,49]`, objetivo `[135,9.400129699707032,45]`, hora 150, calidad media. El recorrido tiene 120 fotogramas. Codificación offline, no una afirmación de FPS en tiempo real. [Metadatos](wind-video.json). El diagnóstico de [cambio temporal de píxeles](temporal-pixel-diagnostic.json) solo acredita diferencias entre dos instantes; no sustituye la evaluación estética del movimiento.

## Fórmula y límites

Se rota el desplazamiento de cada vértice respecto a la raíz de su hoja en el plano viento/vertical, con ángulo proporcional a altura normalizada y a la onda original. Mantiene las frecuencias, fases y control de fuerza 8×. Ese número controla ahora una excursión angular: no representa una amplitud lateral idéntica a C. El límite angular depende de la inclinación original para mantener los vértices por encima del plano tangente local. No es una prueba de colisión con todo el terreno circundante. Las raíces, máscaras, modelos y distribución no cambian.

La rotación conserva el radio de cada vértice respecto a su raíz en el marco local sin pendiente. **No conserva la longitud de cada arista ni el arco completo de la hoja**, porque cada vértice gira un ángulo distinto. La normal recibe la misma rotación como aproximación, sin resolver la derivada completa de la deformación. La limitación angular también puede cambiar la velocidad visual cerca de sus extremos.

El [auditor CPU](deformation-audit.json) cubre 174.960 casos de vértices de ambos módulos, rotación del módulo, escala, LOD, crecimiento y onda. Error radial máximo 2,23e-16 en doble precisión; altura local mínima cero. C 8× llega a una relación radial 2,35 en esa muestra. La alternativa aún alcanza un alargamiento de arista de 1,66: esto impide llamarla físicamente inextensible. Es una referencia matemática, no una prueba de conformidad de coma flotante GPU.

## Capturas y rendimiento

36 capturas: calidad media/baja, cercana/normal/elevada, día/noche, C/rotación/C restaurada. Los doce controles C/C2 son idénticos byte a byte. WebP lossless verificados contra PNG. [Media](captures-media.json), [baja](captures-baja.json).

| Vista diurna media | C 8× | Rotación |
|---|---|---|
| Cercana | [C](media-close-day-C.webp) | [Alternativa](media-close-day-rotation.webp) |
| Normal | [C](media-game-day-C.webp) | [Alternativa](media-game-day-rotation.webp) |
| Elevada | [C](media-elevated-day-C.webp) | [Alternativa](media-elevated-day-rotation.webp) |

32 bloques C/rotación/rotación/C, 30 fotogramas de calentamiento +120 muestras: 3.840 muestras GPU, sin errores WebGL, context loss ni disjoint. Viento animado con reloj determinista `frame/30`; los shaders se intercambian realmente, de modo que C usa su fuente original. GPU incluye todas las pasadas, CPU mide envío de render. Medianas agrupadas; diferencias negativas pueden reflejar ruido térmico o temporal y no prueban aceleración.

| Calidad | Cámara | Luz | GPU C ms | GPU rotación ms | Diferencia ms | CPU C / rotación ms |
|---|---|---|---:|---:|---:|---:|
| media | close | day | 20.361 | 21.690 | +1.329 | 3.40 / 3.30 |
| media | close | night | 20.317 | 20.044 | -0.273 | 3.40 / 3.20 |
| media | game | day | 23.415 | 24.271 | +0.856 | 3.40 / 3.60 |
| media | game | night | 23.850 | 24.375 | +0.525 | 3.10 / 3.10 |
| baja | close | day | 15.264 | 15.913 | +0.648 | 3.00 / 2.90 |
| baja | close | night | 15.046 | 14.488 | -0.559 | 2.80 / 2.70 |
| baja | game | day | 15.381 | 14.746 | -0.635 | 3.20 / 3.10 |
| baja | game | night | 15.562 | 15.433 | -0.129 | 3.00 / 2.70 |

[Datos media](benchmarks-media.json), [datos baja](benchmarks-baja.json). Conteos de draw calls, triángulos, geometrías y texturas idénticos por comparación. No hay nuevas lecturas de textura ni pasadas. Hay dos `atan`, `sin`, `cos` y operaciones adicionales por vértice en la alternativa; no se infiere coste GPU solo de esa cuenta. No se volvió a medir overdraw, memoria del driver o streaming distante; se capturó el recorrido cercano-normal, no una nueva campaña de streaming.

## Reproducción y recomendación

Servidor del worktree en 5190. `capture-continuous-grass-rotation.mjs` con `WG_COVER_QUALITY=media` o `baja`; `measure-continuous-grass-rotation.mjs` con `WG_COVER_QUALITY=media,baja` y `WG_COVER_VIEWS=close,game`; `video-continuous-grass-rotation.mjs` para la pareja de vídeos. Las herramientas están en `tools/experiments`. Auditor: `python tools/experiments/audit-continuous-grass-rotation.py`.

No promover de forma automática: la reducción del estiramiento es real, pero no demuestra una mejora artística suficiente ni conserva toda la longitud. El vídeo permite revisar esa diferencia manteniendo intacta la versión fuerte solicitada. No se añade a otros biomas ni a main.
