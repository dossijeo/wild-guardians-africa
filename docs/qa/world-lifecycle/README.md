# QA-150: salida y reentrada de la partida real

El contexto WebGL de WorldScene permanecía activo después de `dispose()`, aunque el canvas ya estuviera retirado. `before.json` conserva la comprobación real `isContextLost() === false` tras una salida por Guardar y volver al menú. Three libera sus caches con `renderer.dispose()`, pero ese método no pierde el contexto.

La corrección llama `renderer.forceContextLoss()` después de retirar los listeners propios y liberar el renderer. Así la liberación deliberada no dispara la pausa por pérdida accidental de contexto. La guarda existente de `disposed` conserva la idempotencia. Las dos pruebas de carga completa/parcial ahora comprueban también el orden (listeners abortados y renderer liberado) y una única liberación de contexto.

## Ensayo integrado

`tests/browser/world-lifecycle.html` carga `src/app/main.js` y usa el menú, selector, HUD, tutorial, guardado y carga originales. El almacenamiento del documento padre está aislado en memoria; no cambia partidas reales. Las voces nativas usan AudioContext y diez stems reales con ganancias cero. La fixture observa canvas listeners, terminación real del Worker, cola/timer de NativeChunkStream, llamadas render y `isContextLost()` del contexto real. Retiene deliberadamente las referencias antiguas para no depender de la recolección de basura.

En el mismo documento se completó nueva partida Sabana/Mapungubwe, salida por Guardar y volver al menú y dos cargas del mismo slot con otras dos salidas. Los tres mundos cargaron y dibujaron antes de salir. `after-three-cycles.json` acredita en los tres casos:

- Una carga y una destrucción; cero renders después de destruirlos.
- Contexto WebGL perdido, canvas desconectado y cero listeners activos en el canvas.
- Cinco listeners propios abortados, worker terminado, stream muerto, timer nulo y cola vacía.
- Audio de la partida de diez voces al jugar a cero voces/active y transport falso en el menú.
- Cero errores globales; ningún world canvas y un único iframe de menú al terminar.

La captura `after-three-cycles.png` muestra el menú original y el inspector. Los dos primeros contadores de render permanecieron constantes durante la tercera partida. Los contadores de eventos de geometría/material son datos auxiliares: materiales compartidos pueden emitir varias disposiciones y geometrías prestadas por lotes siguen la propiedad de sus prototipos. No expresan memoria GPU en bytes. La fixture y el bucle global de la aplicación conservan sus propios timers/RAF; el worker/timer de cada escena sí queda detenido. La prueba no afirma GC de todos los objetos JavaScript, memoria de vídeo exacta, escucha perceptual ni todos los biomas.

Validación de código: `node --test tests/world-disposal.test.js tests/shader-failure.test.js`, tres pruebas PASS. Suite previa a esta corrección: 1.212 PASS en `e16c216`; no se presenta como una repetición de la suite sobre este nuevo cambio.
