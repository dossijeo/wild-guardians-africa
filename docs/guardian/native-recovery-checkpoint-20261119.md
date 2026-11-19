# Checkpoint confirmado antes del relevo nativo — 2026-11-19

Continúa `ef0152df5` dentro de A4/e-R3/f-R4. Las sesiones que han conectado realmente el preparador de recursos suspenden ahora al productor, drenan sus callbacks pendientes y renuevan el checkpoint del diario existente antes de separar el canal gráfico. El checkpoint debe pertenecer a un comando normal posterior a la secuencia fuente capturada y recibir el ACK del consumidor anterior. No se inyecta un snapshot, no se añade un muestreo de Rapier ni se crea otra autoridad, cola o reloj.

## Referencias de código y decisiones

Se consultaron implementaciones reales; revisiones, URLs, SHA-256 y decisiones están en el recibo:

- [Redis 8.2.1, replication.c, revisión cd0b12938](https://github.com/redis/redis/blob/cd0b12938b6c99978440c6f7e44e34d7ff0aa537/src/replication.c): `waitCommand` y `replicationCountAcksByOffset` capturan una posición existente y contrastan sus confirmaciones. Se exige `checkpoint.sequence > publicationFloor`, con ACK real y frontera nativa de la autoridad.
- [vscode-jsonrpc 8.2.0, connection.ts](https://github.com/microsoft/vscode-languageserver-node/blob/release/jsonrpc/8.2.0/jsonrpc/src/common/connection.ts): `CancellationSenderStrategy.Message.sendCancellation` y los handlers de cancelación correlacionan una notificación con la petición original. La implementación final usa ese patrón y un `AbortController` local en la operación existente. El prototipo booleano inicial precedió a esta lectura; sus controles se conservan como evidencia intermedia. Cancelar una petición no acredita que el trabajo remoto haya terminado.
- [Node v20.19.0, writable.js](https://github.com/nodejs/node/blob/v20.19.0/lib/internal/streams/writable.js): `onwrite`, `needFinish`, `finishMaybe` y `finish` impiden finalizar mientras quedan callbacks o existen errores. Se adapta el contador real de callbacks ya existente: una promesa compartida se resuelve en su `finally`, y cierre o fallo de limpieza vetan la confirmación.

No se incorporan esas bibliotecas ni se copian sus colas, registros de peticiones o propietarios. La investigación del drenaje precedió a su implementación; la motivó una reproducción real con cosecha, reanudación y avance normal que invalida una preparación nativa en curso.

## Vida de la suspensión y checkpoint

`markVisualLost` realiza la coordinación antes de separar el canal; `prepareVisualRecovery` directo usa la misma coordinación. Solo se activa si hubo conexión real del puerto de recursos. La suspensión existente espera al productor y a la barrera de su puerto. Incluso una respuesta sin productor (`publicationFloor:null`) posee una suspensión y se libera explícitamente.

Con productor activo, el host solicita la renovación mediante `retryAfterRecovery` y el comando normal siguiente. Espera el ACK de ese checkpoint con secuencia posterior a la fuente; entonces congela el reloj y el despacho existentes. No da por bueno un checkpoint antiguo ni suelta la suspensión al finalizar solamente el commit. Un canal muerto, una confirmación diferida nueva o un fallo real se rechazan; no se borra el fallo del consumidor.

El runtime hospedado reserva la identidad de reanudación con el mismo contador RPC genérico al crear la petición original. La identidad no es una secuencia de simulación. La suspensión se mantiene durante replay, reintentos, visibilidad y confirmación final. Se libera una sola vez al activar la recuperación, después del punto en que el flujo de `main` ya exige el frame actual, o en la finalización legacy existente. No se añade otro protocolo de frame.

Una cancelación o vencimiento durante preparación notifica únicamente el ID original, espera la adquisición real y realiza su liberación correlacionada. Una cancelación directa sobre canal todavía vivo permite volver al flujo anterior. Después de una separación irreversible, una cancelación no libera al productor: debe terminar la recuperación. Los intentos duplicados y controles externos no pueden apropiarse de la suspensión. Un fallo o una confirmación tardía de reanudación no reactiva el reloj ni provoca un segundo envío del mismo ID. Disponer el host invalida los resultados tardíos.

Se reutiliza el watchdog de progreso existente. `markVisualLost` comparte ahora el límite de recuperación existente de 610 s con `prepareVisualRecovery`; se respetan el aborto y los límites explícitos del llamador. Esto no convierte el vencimiento de Window en prueba de drenaje remoto.

## Drenaje de recursos cancelados

La barrera de `b1e703191` rechazaba un callback cancelado que todavía estaba activo. Ese rechazo cerraba un puerto sano en la reproducción de cosecha. Ahora espera el `finally` real, mantiene una sola barrera pendiente en el mismo puerto y vuelve a comprobar cierre, fallo y estado antes de emitir el ACK. Mientras espera no admite otra preparación. No hay sondeo ni segunda cola de tareas.

Un endpoint cerrado permanece registrado en el WorldWorker hasta que terminan sus callbacks: antes podía desaparecer del preflight aunque su callback aún pudiera modificar recursos. El estado incluye también el fallo del receptor subyacente. Si abortar el handle arroja un error, no se certifica una limpieza correcta. El preflight retenido conserva además sus controles de operaciones y de barrera en curso.

Esta espera acredita callbacks del preparador y orden del puerto. No sustituye el drenaje GPU, la salud del dispositivo o el ACK/frame exigidos por los propietarios gráficos existentes.

## Validación y alcance

Baseline final: los cuatro módulos de producción anteriores cargados desde sus URLs originales y antes del bundle dan **23 controles aprobados y 27 casos afectados fallidos**, sin cancelaciones, omisiones ni avisos de actividad asíncrona. Los 27 incluyen 22 casos nuevos del host, dos controles de cancelación actualizados, dos nuevos del receptor y uno nuevo de preflight. El código actual pasa **110/110** en la selección inicial. Los logs intermedios con errores de fixture se conservan y no se presentan como aceptación.

Validación final sobre archivos congelados: **912 dirigidas/64 archivos**, **4425 de 4426 seleccionadas/343 archivos**, una omisión opcional, cero fallos o cancelaciones. Ocho sintaxis y build de producción **60.96 s**. **616 entradas congeladas, 64 nativos intactos y 16 ajenos exactos**; sin recompilar WASM.

Se heredan expresamente los tres controles previos abiertos: timeline 19/20 por handshake, host sin terminar en 25 s e histórico 3 pases/2 fallos por `releaseCommand`. Sus reproducciones antes/actual pertenecen a `6445f17ae`; no se reejecutan ni reparan aquí. La selección conserva esas exclusiones y no se proclama suite universal. Decisiones, fuentes anteriores propias, baselines, logs completos, selecciones, sintaxis y hashes en el [recibo de validación](performance/native-recovery-checkpoint-validation-20261119.json).


Los 22 casos del host ejecutan la autoridad/planner/C++/WASM, los commits nativos, el runtime de juego y el host de producción reales. El adaptador de creación del cliente delega en la autoridad y conserva el recibo local, pero este fixture no ejecuta el cliente autoritativo y el Worker fuente completos: esos enlaces tienen sus controles separados en `ef0152df5`. Transporte, temporizador, terreno, declaraciones gráficas, Host/control y cola GPU son adaptadores deterministas. El caso de replay emplea el receptor temporal real y MessageChannel. No es una nueva prueba de WorldSurface, hilos OS/navegador, GPU hardware, cadencia o UI completa.

Se comprueba la frontera C++ exacta, una sola autoridad, un único snapshot de arranque, checkpoint/ACK retenidos, replay y activación, identidad reservada, cancelación, vencimiento, resultados tardíos, fallos, disposición, intento duplicado, reintento de terreno con la misma suspensión y preparación invalidada por una cosecha real. Los controles del receptor y WorldWorker comprueban el callback cancelado, el cierre antes del drenaje y el fallo de limpieza. Se conservan los controles intermedios: una primera cosecha pausada no invalidaba la operación porque faltaba el avance normal; la reproducción corregida sí muestra el fallo anterior. No se usa la primera como prueba del defecto.

## Pendiente según el plan

El API existente queda coordinado, pero `main` todavía no conecta ordinariamente este preparador nativo. Faltan esa conexión y la validación completa del bootstrap y relevo sobre los dueños y GPU originales. El consumidor ya fallido que no puede emitir un checkpoint fresco sigue cerrado por seguridad; esta entrega no habilita recuperación de cohort activo tras pérdida real del dispositivo ni restaura un consumidor fallido.

La reutilización de recursos válidos sigue siendo el criterio: este mecanismo no pide reconstruir los 3.123 recursos. Tampoco demuestra por sí solo ausencia de tirones. El coste de publicaciones completas durante pausa de `cc218472e`, las intenciones y cohortes pendientes, la cadencia y las plataformas necesitan su evidencia. A6/A/B/C siguen abiertos; D no iniciado; f-R3 conserva su cierre de seguridad. La próxima integración debe partir de este checkpoint confirmado, conservando recursos válidos y los guards existentes.
