# Vídeos del Guardián

Grabaciones reales del renderizador Three.js y del controlador facial usados en el tutorial, en una vista de inspección ampliada. No son capturas de la partida completa ni animaciones prerenderizadas de Blender.

- `guardian-es.mp4`: introducción ES_01, voz original española.
- `guardian-en.mp4`: introducción EN_01, voz original inglesa.

Incluyen voz original, nueve visemas automáticos, gestos, mirada, parpadeos y manto. Se graba la locución y 1,5 segundos de retorno al reposo. El texto mostrado es la transcripción original.

Para repetir: iniciar Vite en 127.0.0.1:5194 y `python tools/guardian/receive_video.py`; abrir `/tests/browser/guardian-recording.html` y pulsar cada idioma. Canvas.captureStream(30) y Web Audio alimentan MediaRecorder VP8/Opus. El receptor local guarda únicamente es.webm/en.webm. Convertir a H.264/AAC con FFmpeg para reproducción compatible. La captura conserva el tiempo real del audio; 30 fps es el límite solicitado, no una garantía de rendimiento.

Actualización de flotación: ES/EN se han vuelto a grabar con el rig refinado. `guardian-idle.mp4` muestra 24 segundos desde tres cuartos sin voz. El receptor admite también idle.webm.

## Invocación y combate (fase 2)

- `guardian-combat-day.mp4`: Grow/Multiply, cámara, zoom y sustitución de una invocación por otra.
- `guardian-combat-night.mp4`: Attack, Shield, hiena y rinoceronte, nuevos gestos de manos y huida.

Capturas de WorldScene real en fixture controlada; las recargas se reinician sólo en el laboratorio. Máximo un Guardián visible. Esta revisión añade brazos articulados, emisión desde manos y respuesta amortiguada por masa. Los vídeos de diálogo ES/EN anteriores corresponden a la revisión previa del viento. El receptor admite también combat-day.webm y combat-night.webm. Véase ../PHASE2.md para las pruebas y sus límites.


Actualizaci�n cinematogr�fica/ragdoll: `guardian-combat-night.mp4` se ha vuelto a grabar con Game.tick activo, v�rtice/materializaci�n y derribo articulado conectado al combate. Muestra hiena y rinoceronte, impactos consecutivos, recuperaci�n y retirada; es una fixture de integraci�n, no una incursi�n masiva. El v�deo diurno conserva la revisi�n anterior. Los l�mites pendientes est�n en `../CINEMATIC-RAGDOLL.md`; esta grabaci�n no implica que la entrega completa est� validada.
