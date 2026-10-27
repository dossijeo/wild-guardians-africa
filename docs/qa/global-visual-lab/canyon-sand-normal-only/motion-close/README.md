# Arena del Cañón: aproximación cercana

Comparación real: grava de control a escala .08 (izquierda) frente a arena seca normal-only (derecha). Ambas usan global-lighting y warm-floor. No compara dos mapas contra uno.

- Calidad media: [día](media-day.mp4), [noche](media-night.mp4).
- Calidad baja: [día](baja-day.mp4), [noche](baja-night.mp4).
- [Pareja intermedia diurna](media-day-017-pair.webp), [muestreo diurno](media-day-contact.webp), [muestreo nocturno](media-night-contact.webp).

## Condiciones y comprobaciones

Campaña real Gran Cañón, semilla 712, 1280×720, día 150/noche 350. Dos calidades, 36 posiciones por recorrido: 288 capturas, 144 parejas. Cámara, objetivo, hora, draw calls y triángulos coinciden por pareja. Cero errores registrados. Cada captura comprueba cero texturas de capa en control y una en candidata, y que la cámara esté por encima del terreno. Chunks asentados, simulación pausada, tiempo de materiales congelado; ocultación ajustada inmediatamente en cada posición. No valida la evolución natural de los fundidos.

Los vídeos tienen 36 fotogramas a 12 fps, tres segundos, 1920×540. El paso visual del render fue 1/30; la reproducción está ralentizada y NO mide FPS del juego. ffprobe verifica dimensiones, duración y número de fotogramas. Los PNG tienen señal no uniforme; esto no sustituye una inspección visual completa.

La pareja intermedia diurna inspeccionada muestra ondulaciones y separación entre arena y grava, con menor detalle de color en la arena. Los contactos día/noche permiten revisar nueve posiciones. Esta inspección de fotogramas no acredita ausencia de shimmer o popping en todo el vídeo. Se publica la secuencia para revisión temporal; no se aprueba todavía la candidata.

## Recorrido descartado y límites

El primer recorrido, desde offset [22,16,18], atravesaba visualmente una meseta: su fotograma intermedio quedaba tapado por terreno. Se excluye de esta entrega y permanece local en ../motion. La trayectoria corregida va de [9,5,9] a [5,2,8] respecto a un objetivo sobre suelo despejado. Es una aproximación cercana, no una prueba larga de streaming ni de origen flotante.

No se ejecutó otro benchmark durante la captura. El [ABBA anterior](../README.md) mantiene pendiente el presupuesto diurno: control 5.61–7.51 ms GPU frente a candidata 7.05–7.14 ms. La deriva del control impide concluir un coste estable. La noche fue 6.85–7.06 frente a 6.89–7.01 ms. No atribuir estos números a la reproducción del vídeo.

Recomendación: conservar normal-only como candidata QA por su relieve visible; no activar por defecto ni integrar en main. Pendientes revisión temporal completa y coste diurno estable. No demuestra calidad global de los seis biomas.

## Reproducción

Con Vite en 5190, Playwright Chrome, Python/Pillow/NumPy y ffmpeg/ffprobe en C:/ffmpeg/bin:

```powershell
node tools/experiments/capture-canyon-sand-motion.mjs
python tools/experiments/package-canyon-sand-motion.py
```

[Registros](captures.json), [comparación verificada](comparison.json), [metadatos de vídeo](video-metadata.json). PNG fuente locales, pares WebP y vídeos publicados. Recursos CC0 existentes de Aerial Beach 01; atribución y hashes en ../../canyon-sand-maps/resources.json. Sin nuevos assets, modelos o cambios de simulación.
