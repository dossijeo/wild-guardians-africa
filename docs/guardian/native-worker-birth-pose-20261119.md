# Pose inicial del trabajador contratado

Primer incremento de nacimientos/admisión incremental de e-R3/f-R4. `addHiredWorker` asigna `heading`, `runPhase`, `walkPhase` y `carryPhase` a cero al crear el trabajador, antes de notificar al planner. Es la pose inicial que ya interpretaba la presentación: `presentation-worker-headings.js` registra yaw cero para un ID realmente nuevo; `locomotion-contact.js` y los reproductores de acciones usan fase cero cuando aún no hubo movimiento. La posición sigue siendo la entrada del poblado y el presupuesto procede de `dailyRunMetres`.

La pose pertenece ahora a Game desde su nacimiento y puede alimentar `requestNativeFarmArrivalResources` sin que el llamador invente un yaw. No se rellenan guardados antiguos ni se modifica ningún trabajador previo. No se concede permiso físico o gráfico ni se añade otro registro, reloj, cola, dependencia o movimiento JS.

## Código fuente consultado y decisión

Antes de diseñar el incremento se revisó [EnTT v3.15.0, registry.hpp, create/destroy](https://github.com/skypjack/entt/blob/v3.15.0/src/entt/entity/registry.hpp#L438-L514) y [storage.hpp, generate](https://github.com/skypjack/entt/blob/v3.15.0/src/entt/entity/storage.hpp#L1137-L1158): creación local de una entrada con identidad propia, sin reconstruir el registro. Se aplica la inicialización exclusiva del recién creado; no se copia su reciclaje de IDs porque nuestro registro físico ya asigna IDs monótonos.

Se leyó además [Flecs v4.1.0, stage.c, flecs_stage_merge](https://github.com/SanderMertens/flecs/blob/v4.1.0/src/stage.c#L18-L65): sus cambios estructurales se incorporan en puntos de sincronización. Para el siguiente incremento se aprovecharán las fronteras y declaraciones existentes del juego; esta lectura no justifica introducir su command buffer ni una dependencia. La decisión de admisión diferida y sus guardas todavía no está implementada.

## Validación y límites

Siete casos nuevos ejercitan contratación diaria con/sin centro para los cuatro perfiles, contratación adicional sin alterar trabajador/tareas/plan/RNG previos, comando duplicado y guardado/carga. Cuatro de esos casos realizan una contratación real y verifican que el planner nativo declara Farm con la pose propia, manteniendo la petición, pose y época del compañero anterior. El bind de esos cuatro casos se hace explícitamente mediante el ABI de fuente: no acredita todavía altas por SimulationAuthority, conflictos de aparición, Worker/Surface ni GPU.

La selección de contratación, preparación de rutas, encabezados y aceptación de plantilla pasa **48/48**, sin omisiones. El primer ensayo previo al cambio falló sus siete casos por valores de pose ausentes; el primer candidato pasó los tres de Game y detectó en los otros cuatro una expectativa del fixture que omitía el radio real. Corregida esa expectativa, los siete están incluidos en los 48 verdes. Dos comprobaciones de sintaxis y build de producto WebGPU/Worker remoto completados; recibo y logs comprimidos enlazados abajo.

No se recompila WASM ni se ejecuta nueva prueba GPU: este incremento solo hace explícitos datos de nacimiento ya interpretados como cero. No reconstruye recursos gráficos, y tampoco demuestra todavía ausencia global de tirones. Los 3.123 recursos del ensayo histórico no son un presupuesto de reconstrucción permitido; los cambios invariables deben conservar identidad y residencia, como exigen A4/A5 y las pruebas de relevo existentes.

Sigue pendiente enlazar altas al registro existente y adquirir recursos por el productor ordinario, incluyendo entrada bloqueada, independencia entre lotes/compañeros, expiración antes del primer cuerpo y cancelación. A6/A, B1–B7 y C siguen abiertos; D no iniciado; f-R3 conserva solo su cierre de seguridad. No se cierra ninguna de las tres exclusiones históricas.

Evidencia reproducible y preservación: [recibo](performance/native-worker-birth-pose-validation-20261119.json), [fuentes y logs propios](performance/native-worker-birth-pose-20261119/).
