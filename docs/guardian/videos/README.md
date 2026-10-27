# Vídeos del Guardián

Grabaciones reales del renderizador Three.js y del controlador facial usados en el tutorial, en una vista de inspección ampliada. No son capturas de la partida completa ni animaciones prerenderizadas de Blender.

- `guardian-es.mp4`: introducción ES_01, voz original española.
- `guardian-en.mp4`: introducción EN_01, voz original inglesa.

Incluyen voz original, nueve visemas automáticos, gestos, mirada, parpadeos y manto. Se graba la locución y 1,5 segundos de retorno al reposo. El texto mostrado es la transcripción original.

Para repetir: iniciar Vite en 127.0.0.1:5194 y `python tools/guardian/receive_video.py`; abrir `/tests/browser/guardian-recording.html` y pulsar cada idioma. Canvas.captureStream(30) y Web Audio alimentan MediaRecorder VP8/Opus. El receptor local guarda únicamente es.webm/en.webm. Convertir a H.264/AAC con FFmpeg para reproducción compatible. La captura conserva el tiempo real del audio; 30 fps es el límite solicitado, no una garantía de rendimiento.
