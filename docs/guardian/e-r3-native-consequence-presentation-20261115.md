# e-R3: presentación retenida de consecuencias nativas

Continuación del [propietario Harvest → Carry](e-r3-native-harvest-consequence-source-20261115.md), bajo el [plan principal](integrated-gpu-migration-plan-20261104.md) y su [corrección A6](intent-route-architecture-correction-20261108.md). e-R3/e-R4/f-R4 y la aceptación A/B/C siguen abiertos.

## Captura coherente sobre el propietario existente

`confirmed-presentation-stream` permite retener temporalmente su vista durante una captura gráfica nativa, también con su timeline manual. Mantiene la cola acotada, sus receipts, backpressure, eventos y ACK de aplicación existentes. La retención interna usa `releaseOnInput:false`: el comando sigue hacia la autoridad, pero no libera por accidente la vista capturada. El comportamiento predeterminado anterior se conserva. `onQueued` despierta al propietario del timeline sin certificar que la publicación haya sido aplicada.

Se consultó la implementación real de [Flecs v4.0.4, `ecs_readonly_begin`/`ecs_readonly_end`, `src/stage.c`](https://github.com/SanderMertens/flecs/blob/v4.0.4/src/stage.c#L756): difiere las modificaciones durante una lectura estable y las combina al salir. Se adapta únicamente el principio de lectura estable y aplicación posterior, usando nuestro stream y su cola actual. No se incorpora Flecs, otra cola ni otro mundo; el reloj y los cuerpos nativos continúan ejecutándose.

Las tres pruebas nuevas de `confirmed-presentation-native-hold.test.js` verifican límites de cola, orden de todos los eventos/ACK, ausencia de avance de estado/reloj durante la retención, aviso de cola y ambas políticas de entrada. En combinación con `confirmed-presentation-timeline.test.js`: 23 casos, 22 correctos; falla el caso existente «real visual ports negotiate and exert bounded backpressure until state is applied» por `Visual handshake timed out`. Se reproduce ejecutando solo ese caso con el módulo de stream de `71c85e11b` mediante loader de lectura, conservando la URL original (SHA-256 del módulo anterior: `e3cb92313a4f62e413050a32575cfb37ea182324bdae29c46d8a5e600025f680`). No se modifica su expectativa ni se declara la suite completamente correcta.

La retención por sí sola no acredita recursos GPU, consecuencias confirmadas ni recuperación incremental. Sus consumidores deben verificar la asociación exacta y esperar al estado semántico correspondiente antes de volver a grabar imágenes ordinarias.

## Selección de la variante visible

La primera prueba GPU con selección tras Carry encontró un proxy de selección oculto de Harvest que todavía conservaba su callback del reloj retirado. Filtrar los impactos después del raycast era demasiado tarde: Three ejecutaba ya ese callback. Se leyó [Three r180, `Raycaster.intersect`](https://github.com/mrdoob/three.js/blob/r180/src/core/Raycaster.js#L235) y [`Object3D.traverseVisible`](https://github.com/mrdoob/three.js/blob/r180/src/core/Object3D.js#L1063): el primero comprueba capas y recorre hijos, pero no omite automáticamente objetos invisibles; el segundo sí omite toda su jerarquía oculta.

El picker de actores ahora reúne las mallas mediante `traverseVisible` después de preparar la pose de selección y las intersecta sin repetir la recursión. Así no invoca relojes retirados de variantes invisibles. Se conserva el mismo actor, geometría, selección por alpha, resultado de entidad y restauración de la pose. Las 12 pruebas de picker pasan. El caso nuevo falla con el picker de `02df8f730` mediante un loader de lectura: el callback oculto lanza el error esperado. No se cambia el reloj para hacerlo pasar.
