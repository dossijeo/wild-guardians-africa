# Conversión experimental de todo el audio a Opus

Se han convertido fuera de los assets distribuidos los 147 MP3 disponibles: 126 SFX, veinte stems musicales y la música del menú. El comando reproducible es `python tools/experiment_opus_audio.py`; requiere FFmpeg con libopus y ffprobe. Los candidatos quedan exclusivamente en `.cache/opus-audit/`. El programa rechaza un destino fuera de `.cache`, y no modifica catálogos ni el paquete del juego.

## Medición completa con FFmpeg

| Grupo | Archivos | Originales | Opus | Reducción |
| --- | ---: | ---: | ---: | ---: |
| SFX | 126 | 5.532.347 bytes | 3.766.843 bytes | 31,91 % |
| Música | 21 | 52.783.067 bytes | 39.892.119 bytes | 24,42 % |
| Total | 147 | 58.315.414 bytes | 43.658.962 bytes | 25,13 % |

Ningún candidato aumenta de tamaño. Todos mantienen canales y número de muestras descodificadas a 48 kHz. La diferencia máxima de RMS es 0,323006 dB en SFX y 0,039544 dB en música; estas medidas no prueban calidad perceptual, transitorios ni continuidad de bucles. No se normaliza el volumen ni se recortan silencios.

Los parámetros experimentales son VBR, application audio, frames de 20 ms, complejidad 10, 48 kHz; 64 kbps para SFX mono, 96 kbps para SFX estéreo y 128 kbps para música. Todos parten de los MP3 disponibles, cuyos hashes se registran; los 126 SFX coinciden con los originales del catálogo. No se afirma disponer de masters sin pérdida: la conversión implica otra generación con pérdida.

El informe contiene hashes de originales/candidatos, tamaño, canales, muestras PCM, RMS y peak. Los candidatos binarios no se añaden a Git porque todavía no son recursos aprobados del runtime. Los originales permanecen intactos.

## Comprobación Web Audio en navegador

`tests/browser/opus-audio.html` descodifica secuencialmente todos los originales y candidatos, primero a 48 kHz y después a 44,1 kHz. Las 294 comparaciones pasan con canales idénticos y tolerancia de una muestra para la duración reescalada. Ambos AudioContext quedan cerrados; no se crean fuentes audibles ni se conservan buffers en el informe. Console sin avisos ni errores.

Evidencia: `browser-report.json`, `browser-console.json` y `browser.png`. Es el navegador local de escritorio; no prueba reproducción en móvil físico, Tauri ni streaming por ventanas.

## Lo necesario antes de sustituir el audio del juego

- Escucha comparativa, contactos, transitorios, bucles y cambios de música.
- Adaptar las ventanas musicales: el índice actual contiene límites de frames y preroll MP3. No sirve para segmentos Ogg Opus; se necesitan cabeceras, pre-skip, posición de gránulos, preroll y trimming coherentes, conservando el reloj compartido y la descodificación solo de capas audibles.
- Verificar caché en disco, lecturas parciales, pasos y transiciones a 44,1/48 kHz, sin cargar todos los stems en PCM.
- Verificar Chrome en móvil físico, itch.io y Windows/Tauri; una comprobación en el navegador local no acredita esos entornos.
- Actualizar referencias, verificadores del catálogo, paquete y tamaño distribuido después de esas comprobaciones.

Referencias primarias: [parámetros libopus de FFmpeg](https://www.ffmpeg.org/ffmpeg-codecs.html#libopus-1) y [Ogg Opus, pre-skip, seeking y trimming — RFC 7845](https://www.rfc-editor.org/rfc/rfc7845.html).

Este experimento no activa Opus en gameplay ni completa la tarea de optimización de audio.
