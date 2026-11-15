# e-R3: presentación retenida de consecuencias nativas

Continuación del [propietario Harvest → Carry](e-r3-native-harvest-consequence-source-20261115.md), bajo el [plan principal](integrated-gpu-migration-plan-20261104.md) y su [corrección A6](intent-route-architecture-correction-20261108.md). e-R3/e-R4/f-R4 y la aceptación A/B/C siguen abiertos.

## Captura coherente sobre el propietario existente

`confirmed-presentation-stream` permite retener temporalmente su vista durante una captura gráfica nativa, también con su timeline manual. Mantiene la cola acotada, sus receipts, backpressure, eventos y ACK de aplicación existentes. La retención interna usa `releaseOnInput:false`: el comando sigue hacia la autoridad, pero no libera por accidente la vista capturada. El comportamiento predeterminado anterior se conserva. `onQueued` despierta al propietario del timeline sin certificar que la publicación haya sido aplicada.

Se consultó la implementación real de [Flecs v4.0.4, `ecs_readonly_begin`/`ecs_readonly_end`, `src/stage.c`](https://github.com/SanderMertens/flecs/blob/v4.0.4/src/stage.c#L756): difiere las modificaciones durante una lectura estable y las combina al salir. Se adapta únicamente el principio de lectura estable y aplicación posterior, usando nuestro stream y su cola actual. No se incorpora Flecs, otra cola ni otro mundo; el reloj y los cuerpos nativos continúan ejecutándose.

Las tres pruebas nuevas de `confirmed-presentation-native-hold.test.js` verifican límites de cola, orden de todos los eventos/ACK, ausencia de avance de estado/reloj durante la retención, aviso de cola y ambas políticas de entrada. En combinación con `confirmed-presentation-timeline.test.js`: 23 casos, 22 correctos; falla el caso existente «real visual ports negotiate and exert bounded backpressure until state is applied» por `Visual handshake timed out`. Se reproduce ejecutando solo ese caso con el módulo de stream de `71c85e11b` mediante loader de lectura, conservando la URL original (SHA-256 del módulo anterior: `e3cb92313a4f62e413050a32575cfb37ea182324bdae29c46d8a5e600025f680`). No se modifica su expectativa ni se declara la suite completamente correcta.

La retención por sí sola no acredita recursos GPU, consecuencias confirmadas ni recuperación incremental. Sus consumidores deben verificar la asociación exacta y esperar al estado semántico correspondiente antes de volver a grabar imágenes ordinarias.
