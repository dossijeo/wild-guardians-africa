# Gran Río: piloto de cubierta herbácea continua

20/10/2026 · semilla 712 · rama `codex/global-visual-lab`. **Candidato visual, pendiente de benchmark GPU aislado; no activado por defecto ni extendido a otros biomas.**

Se reutiliza la geometría Blender de fibras de Sabana y el instancing, con un perfil específico para Gran Río: menor escala de altura (0,65–0,90 frente a 0,80–1,12, antes de máscaras), pigmento verde derivado de su material residente, umbrales de cobertura y humedad de 0,20, y reducción progresiva de altura en el intervalo 0,20–0,32 de ambas máscaras. No cambia el albedo del terreno, los edificios, los props originales, la simulación ni la navegación. Mantiene la exclusión de desgaste, pendiente, ocupación y agua residente. No equivale a verificar todas las orillas del bioma.

La primera cámara estaba en el [claro del poblado](clearing-control.webp), donde la exclusión dejaba muy poca cobertura cercana. Para estudiar una región representativa se eligió un candidato herbáceo ya residente próximo a un desplazamiento +34/+20 m del centro; después se fijó el objetivo `[87.83156862745099,7.077262442364413,15.827254901960785]` para todas las variantes y calidades. No se añadieron plantas ni terreno para la captura.

## Resultado visual

Desde la cámara normal, la nueva geometría domina las zonas cubiertas y el claro permanece despejado. C ofrece mayor volumen que B, especialmente a corta distancia. El perfil bajo conserva una cubierta perceptible usando solo el módulo ligero con viento. De noche el volumen se distingue menos; no se afirma equivalencia con la referencia artística. El [primer borde](hard-edge-pilot.webp) era demasiado uniforme; se añadió el desvanecimiento de altura por máscara. La mejora del borde es moderada y aún se aprecia el límite de exclusión del poblado.

| Vista diurna, media | A original | B ligera | C refinada |
|---|---|---|---|
| Cercana | [A](media-close-day-A.webp) | [B](media-close-day-B.webp) | [C](media-close-day-C.webp) |
| Normal | [A](media-game-day-A.webp) | [B](media-game-day-B.webp) | [C](media-game-day-C.webp) |
| Elevada | [A](media-elevated-day-A.webp) | [B](media-elevated-day-B.webp) | [C](media-elevated-day-C.webp) |

[Viento a cámara fija](wind-fixed-camera.mp4) · [recorrido cercana-normal](camera-lod.mp4). Fuerza 8×, mismo modelo lateral de Sabana, sin adoptar la alternativa rotacional. La menor altura cambia la excursión lateral efectiva; no se afirma amplitud idéntica entre biomas. Vídeos de 150/120 fotogramas reales del renderer a tiempos `i/30`, codificados offline; no demuestran 30 FPS. [Metadatos](wind-video.json).

48 capturas en total: media/baja, cercana/normal/elevada, día/noche, A/B/C/A restaurada. Los doce controles A/A2 son idénticos byte a byte. WebP lossless verificados contra PNG. Sin errores de página o WebGL. Manifiestos completos: [media](captures-media.json), [baja](captures-baja.json).

## Costes conocidos y pendientes

Diferencia respecto a A, medida con `renderer.info` alrededor de todas las pasadas del fotograma:

| Calidad | Vista | Draw calls B / C | Triángulos B / C |
|---|---|---:|---:|
| media | close | +1 / +2 | 28,480 / 111,108 |
| media | game | +1 / +2 | 71,472 / 266,316 |
| media | elevated | +1 / +2 | 84,704 / 338,256 |
| baja | close | +1 / +1 | 13,472 / 13,472 |
| baja | game | +1 / +1 | 38,936 / 38,936 |
| baja | elevated | +1 / +1 | 47,040 / 47,040 |

Los buffers de atributos reservados conservan 1.206.456 bytes de arrays CPU según el audit del helper; no es una medida de VRAM real. No se añaden texturas ni sombras individuales. El paso sigue siendo 0,4 m en media y 0,5 m en baja; la menor población del claro procede de máscaras, no de reducir arbitrariamente el radio de la muestra. C usa dos LOD en media y solo el ligero en baja.

**No se midieron GPU/CPU temporal, overdraw ni streaming distante en este pase.** La revisión interactiva de Sabana permanecía abierta; ejecutar otro renderer simultáneo habría contaminado el benchmark. Tampoco se trasladan las cifras de Sabana a Gran Río. El siguiente requisito antes de promoverlo es medir A/B/C en Intel UHD aislada, revisar orillas y comprobar streaming y cambios de ocupación específicos de este bioma.

## Reproducibilidad y alcance técnico

`capture-continuous-grass-river.mjs` con `WG_COVER_QUALITY=media` o `baja`; `video-continuous-grass-river.mjs` para vídeos. Servidor del worktree en 5190. Herramientas en `tools/experiments`.

El helper de Gran Río es una copia QA aislada de la versión de Sabana, identificada por SHA256 en su cabecera, con los cambios de perfil descritos y el filtro de eventos de ocupación existente. Es una separación provisional para no alterar la sesión abierta de Sabana; antes de integración conviene extraer el código común y mantener perfiles explícitos por bioma. No se han incorporado assets externos: utiliza los módulos Blender propios y las texturas ya presentes.

Se recomienda continuar la evaluación del piloto, no integrarlo todavía ni declarar alcanzada la calidad global. La PR permanece en borrador y main no se modifica.
