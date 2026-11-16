# Fuente nativa del cuerpo inicial retenido

Continúa la [preparación compartida de Idle/Alert](e-r3-native-idle-alert-variant-20261116.md) y la [petición inicial pendiente](e-r3-native-initial-idle-control-20261116.md). La familia 20 permite asociar esa petición real, ya vinculada físicamente e inicializada en descanso o vigilancia, al propietario existente del cuerpo. Este incremento implementa la fuente nativa y su proyección en Game. El transactor gráfico y el consumidor preparado de esta clase siguen pendientes.

## Referencias y decisión

Se consultó el código real de [Dawn, ObjectStorage.h](https://github.com/google/dawn/blob/922930e3193753e58591f14a96ab116e5d630964/src/dawn/wire/server/ObjectStorage.h#L42-L55): distingue una reserva de un objeto disponible y comprueba estado y generación en [FillReservationImpl](https://github.com/google/dawn/blob/922930e3193753e58591f14a96ab116e5d630964/src/dawn/wire/server/ObjectStorage.h#L240-L255). Se aplica esa separación a petición y cuerpo asociado: una etiqueta de Game o una propuesta preparada no bastan para adquirir la propiedad.

Se reutiliza el ciclo de propuesta, revalidación y commit ya implementado en spatial-task-settlement-proposal.inc. El nuevo origen es la petición inicial real, sin inventar una entrega, una tarea o una ruta anteriores. Se mantienen ActiveIntent, la única propuesta pendiente, el registro de cuerpos y el reloj causal. No se añade biblioteca, registro paralelo ni ejecutor de Idle.

## Comportamiento

La propuesta conserva la petición inmutable con cuerpo, perfil, posición, orientación, fases, presupuesto de carrera y estado privado Idle. El commit comprueba su identidad física y la frontera nativa vigente; después sustituye la petición pendiente por una asociación cuya secuencia identifica el cuerpo retenido. La petición archivada puede consultarse como fuente de esa asociación, pero deja de aparecer como petición actualmente pendiente.

La revalidación permite que el reloj y otro trabajador realmente admitido avancen durante la preparación. Comprueba que el origen retenido siga siendo idéntico antes de aceptar el ticket preparado anterior. Cancelar o rechazar una propuesta no consume RNG ni modifica el cuerpo.

Esta asociación acredita residencia y conservación de la pose inicial. No ejecuta todavía la política de descanso, vigilancia o paseo. Los campos privados elapsed, remaining, rng, approachRetry y ancla se conservan sin avance. Tampoco se inventa una acción Idle de duración cero. Los estados Idle sin inicializar y los cuerpos todavía sin vincular quedan fuera de esta admisión.

Una tarea genuina puede sustituir la disponibilidad mediante TaskStart pendiente. El cuerpo inicial continúa protegido hasta la admisión de su corredor; fases y presupuesto deben coincidir con la fuente. Home toma el relevo al terminar el contrato, usando la secuencia actual del cuerpo y conservando su pose. La admisión nativa de esos movimientos libera la asociación inicial mediante el mecanismo existente.

Game reconoce esta clase sólo si tiene la asociación nativa actual. Detecta una etiqueta native-idle inventada antes de avanzar el tiempo. El guardado conserva datos semánticos; una carga en un mundo físico nuevo los convierte en otra petición pendiente, sin restaurar permisos anteriores. El baseline declara las asociaciones iniciales presentes y Host las rechaza hasta disponer de un consumidor preparado para ellas.

## Validación y límites

Las 18 pruebas dirigidas cubren reserva/cancelación, ambas variantes inicializadas, rechazo de fuentes nulas o sin cuerpo, ticket obsoleto, sustitución de clases, protección física y retirada. En standalone y pthread ejercitan revalidación mientras un compañero con TaskStart genuino avanza, con cuerpo, fases y RNG iniciales conservados.

También comprueban TaskStart con presupuesto exacto, los cuatro perfiles al cruzar su frontera horaria, vencimiento diario y movimiento Home, guardado/carga nueva y conservación de sesión ante restauración inválida. Los commits de estas pruebas usan la ABI nativa de confianza: no son recibos gráficos ni acreditan admisión por puertos de la familia 20.

Los resultados finales de compilación de ambos módulos nativos, regresión, producto y preservación de cambios ajenos se registran en [la validación](performance/native-initial-idle-body-source-validation-20261116.json). Este incremento no mide hardware, asignaciones GPU ni tirones.

Faltan el transactor común y consumidor preparado inicial con continuidad de Idle/Alert, y la política completa con sus anclas, aproximación y RNG originales. Siguen pendientes otros finales y puertas, productor ordinario, nacimiento físico en partida viva, sustitución de mundo y recuperación incremental de los 3123 recursos sanos. No cambia ningún cierre A6/A/B/C ni el orden A → B → C → D.
