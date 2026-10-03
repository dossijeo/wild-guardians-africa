# QA-151 · Audio inicialmente bloqueado en la aplicación real

Escenario reproducible: `tests/browser/audio-permission-app.html`. Importa `src/app/main.js` y utiliza el menú y selector originales. El control de QA pulsa una sola vez su confirmación nativa; no envía un Start fabricado ni modifica el estado del juego.

La inyección suspende realmente el AudioContext del padre y rechaza `resume()` con un `DOMException` de nombre `NotAllowedError` mientras esté activa. Es una denegación controlada, no evidencia de que este navegador haya mostrado o rechazado un diálogo de permisos. No se sustituye WebAudio, la decodificación ni los recursos musicales. Los volúmenes del origen de QA se fijan en cero y se restauran al salir. No se acredita escucha perceptual.

- `denied.json` / `denied.png`: contexto suspendido, dos intentos de desbloqueo rechazados, cero voces; mundo real dibujado y tutorial original. Se crea un único slot de 1.000 monedas, tiempo 0, sin estructuras, pausado por intro y lectura. Las tres ranuras preexistentes permanecen iguales.
- `recovered.json` / `recovered.png`: desactivar la inyección no desbloquea por sí mismo el audio. Otra interacción llega al listener `pointerdown` original; `resume()` nativo deja el contexto running y Gameplay A carga diez stems reales mediante MusicTransport, todos con playbackRate 1. El mismo mundo y slot permanecen idénticos; no se repite la partida.
- `console.json`: ninguna advertencia ni error capturado, sin error global ni rechazo no gestionado.

La primera exploración dejó `resume()` rechazado sobre un contexto que Chromium creó running por la interacción. Se revisó la inyección para suspender el contexto antes del rechazo y se recargó la página. Los archivos anteriores corresponden únicamente a esta ejecución revisada; la ranura válida de la exploración está entre las tres preexistentes preservadas. Esto no pretende comprobar liberación repetida de mundos mediante el menú, que pertenece a QA-150.

Junto a las pruebas ya publicadas de HTTP404 de cielo/terreno/GLB y de compilación GPU realmente fallida con reintento, se completa la expectativa de QA-151: error o fallback controlado, sin carga infinita ni mundo corrupto.
