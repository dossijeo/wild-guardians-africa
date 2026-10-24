# Arena: comparación con cámara móvil

Se conserva la candidata normal-only para revisión. Las crestas mantienen lectura desde la vista elevada hasta la cercana oblicua, tanto de día como de noche, en los fotogramas inspeccionados. Se entregan cuatro clips sincronizados; el presupuesto de rendimiento sigue siendo el del [informe anterior](../VALIDATION.md), sin nuevas mediciones temporales en esta ronda.

## Vídeos reales

**Izquierda: original. Derecha: candidata normal-only con contorno geométrico.**

- [Media, día](media-day-comparison.mp4).
- [Media, noche](media-night-comparison.mp4).
- [Baja, día](baja-day-comparison.mp4).
- [Baja, noche](baja-night-comparison.mp4).

Cada lado procede de un canvas WebGL real de 1280 × 720. Vídeos 2560 × 720, 121 cuadros a 30 fps, 4.033 s, verificados con ffprobe. Son fotogramas deterministas codificados offline; **no demuestran ejecución a 30 FPS ni la latencia de streaming durante movimiento real**. No se han interpolado ni generado imágenes con IA.

## Protocolo y correcciones del comprobador

Campaña semilla 712, Mapungubwe, objetivo desplazado +50/+30 m respecto al poblado, hora 150/350 y reloj visual de materiales fijado. La cámara va de offset [32,26,32] a [8,5,12] y vuelve mediante smoothstep. Su altura se limita a al menos 1.2 m sobre la superficie para evitar atravesar la duna. Esta consulta es exclusivamente preparación QA del trayecto, no una consulta nueva del renderer de producción.

La primera ronda no era comparable estrictamente: cargas asíncronas alteraron contadores geométricos en 16 parejas. Se descarta como comparativa y queda su [diagnóstico](initial-unsettled.json). Se añadió espera explícita de horizonte y chunks en cada pose. Una segunda ronda dejó cuatro discrepancias iniciales en media/día; [registro](initial-lod-cache.json). La caché LOD nativa reutiliza posiciones de cámara cuantizadas a 1.5 m, por lo que el punto desde el que entra una toma podía ser distinto. Se reinició esa caché al principio del comprobador y se esperó a los actores pendientes; se recapturó el par afectado. Las otras tres combinaciones ya coincidían en todos sus cuadros. No se cambia el algoritmo LOD del juego.

El script actual inicializa así todas las tomas nuevas. `initialLodReset` identifica la recaptura en los registros entregados. Los fotogramas descartados no se incluyen en los vídeos finales.

## Auditoría final

968 imágenes fuente, **484 parejas A/B**: cámara, objetivo, hora, draw calls y triángulos coinciden en todos los cuadros comparados. Cero errores HTTP/JavaScript/consola registrados y GL cero. [Metadatos](captures.json), [comparación y ffprobe](comparison.json).

Hay además 480 parejas de poses simétricas dentro de las tomas, de las cuales 308 tienen también contadores geométricos iguales. Las restantes reflejan el historial de LOD durante ida/vuelta y no sirven para atribuir una diferencia de imagen al material. De esas 308, 304 son idénticas; cuatro pares de la candidata baja diurna tienen cambios de hasta seis píxeles y un nivel RGB. Esto respalda reproducibilidad por pose en el recorrido probado; **no es una prueba universal de ausencia de parpadeo o aliasing entre poses distintas**.

Se conservan 40 fotogramas clave en WebP lossless, verificados contra los PNG. La revisión visual directa de las poses cercana diurna/nocturna y la intermedia baja conserva el volumen y no muestra el punteado del primer piloto. Quedan franjas demasiado lisas en ciertas orientaciones de iluminación y repetición perceptible a distancia. No se afirma haber evaluado cada cuadro mediante reproducción perceptual completa, ni haber probado otros campos de visión o trayectos laterales largos.

[Cercana diurna](media-candidate-day-0060.webp) · [cercana nocturna](media-candidate-night-0060.webp) · [intermedia baja](baja-candidate-day-0030.webp).

## Reproducción y decisión

Vite en 5190. Ejecutar `node tools/experiments/video-desert-aerial-sand.mjs` y después `python tools/experiments/package-desert-aerial-sand-motion.py`. Requiere Chrome/Playwright, Pillow/NumPy y FFmpeg/ffprobe en `C:/ffmpeg/bin`. Los PNG de trabajo se regeneran; no se incluyen en Git. `WG_COVER_QUALITY`, `WG_SAND_PHASES` y `WG_SAND_APPEND=1` permiten recapturar una combinación identificada sin sustituir las demás.

Mantener candidata QA, sin activar en main ni global-lighting. Antes de promoverla, revisar reproducción de los clips y el coste acumulado en juego completo, especialmente media/noche. Este pase añade evidencia de cámara y corrige su método comparativo; no cambia shaders, geometría, simulación ni viento 8×. El objetivo de los seis biomas continúa pendiente.
