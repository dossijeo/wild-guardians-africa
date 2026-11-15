# Consumidor real de entrega, Idle y tarea siguiente

Continúa los [componentes de presentación](e-r3-native-delivery-presentation-20261115.md) y el [propietario nativo de entrega](e-r3-native-delivery-settlement-20261115.md), bajo el [plan principal](integrated-gpu-migration-plan-20261104.md). El recorrido **Carry → Idle → tarea genuina siguiente** funciona ahora con los puertos y propietarios gráficos existentes, para entrega sin puertas y contrato activo. No activa el productor ordinario ni cierra A6, e-R3/e-R4/f-R4 o A/B/C.

## Implementación y referencias

El host retiene el paquete preparado y sus bindings tipados de reloj, espera `queue.onSubmittedWorkDone()` y confirma versión, plantilla y fotograma exactos. Sólo la asociación emitida por C++ permite adoptar el paquete. La referencia preparada conserva su identidad; el consumidor aplica el origen temporal efectivamente emitido. La asociación estacionaria sigue vigente durante una reclamación real en `AwaitingResources` y deja de serlo al emitirse la ruta siguiente. No se añade una cola, renderer o registro de cuerpos.

Se aplica el patrón ya investigado en el código real de Dawn, revisión `922930e3193753e58591f14a96ab116e5d630964`: [`ObjectStorage.h`, `FillReservationImpl`](https://github.com/google/dawn/blob/922930e3193753e58591f14a96ab116e5d630964/src/dawn/wire/server/ObjectStorage.h#L262) comprueba reserva y generación; [`ServerQueue.cpp`](https://github.com/google/dawn/blob/922930e3193753e58591f14a96ab116e5d630964/src/dawn/wire/server/ServerQueue.cpp#L35) conserva la correlación de instancia/futuro al comunicar la finalización. La adaptación mantiene esas comprobaciones en el hold y callback existentes, sin dependencias nuevas.

Surface prepara Idle sobre el mismo actor, raíz, huesos y geometrías. Desactiva las piezas de caja del actor y conserva el resto del mundo. Mantiene la captura de sólo lectura, drena las publicaciones antiguas sin grabarlas y exige una publicación con entrega coherente; admite que el trabajador ya haya reclamado la tarea siguiente. Si esa preparación llega durante la adopción anterior, espera al predicado de publicación existente antes de reclamar el mismo slot. La liberación despierta también esos predicados; no necesita otra cola o temporizador de reintento.

Al contrastar `workerPose` se corrigió la fase del componente Idle anterior: con `idleState=null`, el clip original sigue tiempo lógico global. Se reutiliza la separación de origen módulo duración y edad relativa que ya emplea `native-gpu-motion.js`; el host actualiza ambos escalares desde su reloj autorizado y la selección conserva exactamente la edad enviada. Los bucles siguen el código existente de muestreo y el patrón leído en [Three r180, `AnimationAction._updateTime`](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js#L711). La activación/restauración reversible conserva el propietario de variantes, conforme al patrón de [`AnimationMixer`](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationMixer.js#L123). No hay reinicio arbitrario del clip, temporizador adicional ni reducción prematura de las fases físicas de doble precisión.

Los recursos confirmados de clase 17 tienen su propio validador: versión, fase, frontera, asociación emitida y plantilla deben coincidir. No proporcionan una fecha ficticia de finalización del cuerpo estacionario. El sobre de residencia pausado sigue describiendo recursos; la vigencia y el tiempo de dibujo proceden del control y reloj nativos.

## Evidencia y límites

La [validación registrada](performance/native-delivery-live-consumer-validation-20261115.json) separa pruebas de protocolo, compilación y hardware:

- **538/538 pruebas en 47 archivos**, sin omisiones, 91,846 s. Incluyen la asociación de recursos, fases globales originales de Idle, retag de escalares, rechazo de procedencia/tiempo/clase incorrectos, drain pendiente, cancelación, actor residente y tarea siguiente. El backend GPU de las pruebas unitarias es simulado; las comprobaciones de shaders usan el compilador real de Three.
- Compilación de producto correcta en **50,39 s**, con los avisos existentes. No cambian C++ ni los artefactos WASM.
- [Recorrido real en NVIDIA/Turing, Edge headless](performance/native-delivery-idle-next-task-gpu-20261115.json), con fuente en página, el mismo Surface y puertos de recursos/control. B es la fixture Home explícita independiente; no es el productor ordinario.

| Relevo | Recursos creados al preparar | Creaciones después de READY | Dibujos con preparador bloqueado 1,8 s |
|---|---:|---:|---:|
| Carry → Idle | 96 | 0 | 52 |
| Idle → ruta de tarea genuina | 98 | 0 | 54 |

El ensayo conserva identidades de raíz, huesos y geometrías del actor; durante Idle conserva también el actor independiente y los lotes del mundo. Las pruebas del roster comprueban además identidad de índices. La entrega añade un único asiento, reconoce la publicación antigua y conserva físicamente el cuerpo mientras espera la tarea siguiente. La selección acierta al trabajador 900011 en ambos relevos; no hay forks después de READY, errores de GPU/página/red ni un cambio de generación de escena. El drenaje final está confirmado.

Se inspeccionaron las capturas: [Idle junto al centro](performance/native-delivery-idle-20261115.png), sin caja visible, y [la siguiente ruta](performance/native-delivery-next-task-20261115.png), con los personajes originales y sus sombras. Son una comprobación visual del escenario mínimo; no sustituyen C2 para todos los perfiles, biomas y contenidos.

El [control negativo](performance/native-delivery-adoption-negative-20261115.json) intercepta una única respuesta de Surface y sustituye únicamente la espera de adopción por el rechazo inmediato anterior. Sale con código 1 al intentar la tarea siguiente: `Native gate resource surface unavailable (adoption negative control)`. Es un control del componente actual, no una ejecución completa del commit padre. No modifica el archivo de producción. Acredita que el ensayo alcanza esa carrera; la variante normal completa el recorrido.

El primer intento de hardware falló antes de admitir Idle por el orden del propio ensayo: cambiaba `elapsed` antes de despausar/avanzar la autoridad física. Se corrigió al orden ya usado por los otros relevos. El guard nativo no se relajó.

Siguen pendientes Home genuino al terminar contrato, las entregas con puertas y sus motores preparados, Idle inicial y otras disponibilidades tras acciones/cancelaciones, la admisión gráfica de un consumidor estacionario nuevo, guardado/carga y recuperación integral. El baseline estacionario conserva su guard; Surface rechaza entregas con puertas hasta disponer de sus efectos gráficos exactos. La reutilización exigida para la recuperación histórica de 3123 recursos continúa abierta. Se preservaron los hashes de los otros 16 archivos del manifiesto original; el stream modificado en un incremento anterior no se editó aquí.


## Cancelación y retirada del candidato

La revisión posterior encontró dos fallos en el helper compartido de propuestas de movimiento: una primera vinculación activada sin binding anterior intentaba usar rollback de reemplazo; retirar un actor con candidata activa no cancelaba primero esa candidata y dejaba retenido el propietario Idle previo. Ahora usa el mismo patrón de restauración de las acciones/entregas: detach sin binding anterior, rollback cuando lo hay y `pending.cancel` antes de retirar el actor. No cambia intenciones, cuerpo físico o shaders.

El [control del módulo padre y la validación](performance/native-worker-candidate-cancellation-validation-20261115.json) carga sólo el módulo de roster de `28868af07` con un loader de sólo lectura y conserva su URL original de importación. Fallan los dos casos: excepción de rollback y **8 recursos retenidos frente a 0 esperados**. Con la corrección pasan **63/63 pruebas** del roster y sus variantes; después de ordenar explícitamente la comprobación de liberación pasan **10/10 pruebas finales**, sin omisiones. La compilación de producto pasa en **45,09 s**. La eliminación deja cero recursos propios tras la liberación diferida; rollback/cancelación conserva materiales, visibilidad, geometría y cuerpo, sin emitir la ruta. Es una corrección del ciclo de vida gráfico; las disponibilidades lógicas tras cancelar una intención, Home y el resto del plan siguen pendientes. La evidencia GPU anterior conserva su alcance y no se repite para este cambio de cancelación.
