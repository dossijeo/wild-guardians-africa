# Agrupaciones de altura: ensayo no promovido

Sabana, 20/10/2026. Se conserva C con viento 8×. La variación espacial de altura es visible, pero no mejora suficientemente la forma de la cubierta para reemplazar la versión aprobada por el usuario.

## Hipótesis y resultado

Una altura correlacionada entre módulos podría formar agrupaciones sin alinear las hojas ni aumentar densidad. Se probó ruido de valor bilineal suavizado sobre las coordenadas XZ residentes, aplicado en vertex shader a altura, respuesta normal y amplitud de viento. No consulta el motor, no cambia la distribución, caminos, raíces ni ocupación. Misma topología, instancias, texturas y draw calls; un uniforme adicional y operaciones aritméticas por vértice.

Primer pase: frecuencia 0,72/m, factor de altura 0,55–1,30. Demasiado sutil desde la cámara normal ([cercana](pilot-v1-close.webp), [normal](pilot-v1-game.webp)). Segundo pase: 0,32/m, factor 0,45–1,50. Produce elevaciones de la cubierta visibles, pero también hojas grandes y demasiado estiradas en primer plano. La flexión actual crece con el cuadrado de la altura: multiplicar altura por 1,5 puede multiplicar desplazamiento lateral por 2,25, además del viento 8×. No se promueve este segundo pase.

El resultado limita esta hipótesis: cambiar solo la altura por grupos no produce por sí mismo el entrelazado orgánico de fibras de la referencia. No se aumentará densidad para ocultarlo. La siguiente investigación puede evaluar una flexión que preserve mejor la longitud, manteniendo la intensidad fuerte pedida, antes de combinarla con alturas más variables.

## Evidencia visual

| Vista diurna | C, viento 8× | Alturas agrupadas |
|---|---|---|
| Cercana | [C](media-close-day-C.webp) | [Ensayo](media-close-day-cluster.webp) |
| Normal | [C](media-game-day-C.webp) | [Ensayo](media-game-day-cluster.webp) |
| Elevada | [C](media-elevated-day-C.webp) | [Ensayo](media-elevated-day-cluster.webp) |

18 capturas del segundo pase, tres cámaras, día/noche y controles C/ensayo/C restaurada; semilla 712, calidad media, 1280×720. Seis controles C/C2 idénticos byte a byte. WebP lossless verificados contra PNG. [Manifiesto](captures-media.json) con cámaras, hora, conteos y errores. Cero errores WebGL en la captura final. La primera compilación falló por el identificador GLSL reservado `patch`; se corrigió a `clusterValue` antes de producir esta evidencia.

## Coste observado

Intel UHD 0x9A60 / ANGLE D3D11. 16 bloques C/cluster/cluster/C, 30 warmup +120 muestras cada uno: 1.920 muestras GPU. Viento animado en ambos a tiempos deterministas `frame/30`. Medianas agrupadas; CPU es envío de render y GPU incluye todas las pasadas.

**Límite importante:** ambas variantes utilizan el shader del ensayo, con el factor de agrupación activado o desactivado por uniforme. Estas cifras comparan su efecto dentro de esa ruta; no cuantifican todo el sobrecoste del código añadido frente al shader original sin ruido. No se recomienda adoptar la variante a partir de estas cifras ni interpretar diferencias negativas como aceleración.

| Cámara | Luz | GPU C ms | GPU agrupada ms | CPU C / agrupada ms |
|---|---|---:|---:|---:|
| close | day | 19.681 | 19.395 | 3.30 / 3.20 |
| close | night | 20.064 | 19.826 | 3.40 / 3.20 |
| game | day | 21.310 | 21.492 | 3.40 / 3.50 |
| game | night | 21.723 | 21.496 | 2.90 / 2.90 |

[Datos completos](benchmarks-media.json). Sin errores WebGL ni eventos disjoint. No se amplió a calidad baja, streaming, vídeo o overdraw después del rechazo visual. No se hace una afirmación de equivalencia de rendimiento. Los controles de captura sí verifican restauración visual.

Reproducción: servidor del worktree en 5190; `node tools/experiments/capture-continuous-grass-cluster.mjs`. Benchmark realizado con `WG_COVER_QUALITY=media` y `WG_COVER_VIEWS=close,game`: `node tools/experiments/measure-continuous-grass-cluster.mjs`. No activado en el juego ni en C principal. Sin integración en main.
