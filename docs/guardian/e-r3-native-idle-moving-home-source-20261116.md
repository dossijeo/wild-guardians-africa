# Fuente Home desde la pose suspendida de un paseo

Continúa [TaskStart desde el ciclo posterior al paseo](e-r3-native-idle-current-task-consumer-20261116.md). Se añade el origen nativo del regreso después de interrumpir un paseo 22 mediante la suspensión preparada existente. Conserva el slot, cuerpo y pose ejecutada de ese paseo hasta adquirir Home 18. La integración de la suspensión y el relevo en control/Game/puertos/roster/Surface sigue pendiente; A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Código consultado y adaptación

Se consultó la implementación real de [`dtCrowd::requestMoveTarget` y `updateMoveRequest`, DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp). La petición cambia el objetivo y su estado sobre el mismo agente; la búsqueda usa su posición `npos` y el corredor que ya posee. Se adapta la separación entre destino solicitado y propietario físico actual, sin reemplazar Wild Engine ni añadir una dependencia.

Wild Guardians necesita además conservar la autorización gráfica del cuerpo. Por ello esta API no cambia directamente una ruta 22 que todavía se mueve: exige primero su suspensión preparada existente, que conserva el slot y la pose ejecutada, revoca la generación anterior y participa en la barrera de consumidores de f-R3. El regreso se prepara desde esa pose retenida y usa las reservas y la adquisición 18 existentes. No se fabrica un descanso 21, una declaración inicial 20, una tarea, otro cuerpo o un corredor autorizado en JavaScript.

## Fuente retenida y petición

`nav_intent_idle_stroll_home_request(actor, session, assignmentSequence, suspendedGeneration, village, homeX, homeZ)` comprueba el propietario suspendido exacto: asociación 22, actor/cuerpo, sesión, asignación, generación, slot, perfil, flags, radio y pose física/ejecutada coherentes. Una ruta de tarea, un paseo aún activo o ya llegado, otra asignación/generación y un propietario retirado no pueden suministrar esta fuente.

La petición Home existente incorpora sólo dos valores internos acotados: la asignación del paseo y su generación suspendida. La pose y las fases se copian del cache ejecutado del slot original. El DTO público de Home conserva su versión y sus 19 valores; se añade únicamente la exportación nativa necesaria para solicitar este origen. No hay un registro de poses o permisos históricos ni un nuevo reloj.

Mientras espera, el intent mantiene el slot suspendido original y el cuerpo; el trabajador queda excluido de nuevas tareas. La comprobación de Home permite una generación no nula sólo para este origen 22 suspendido y coherente. Los orígenes estacionarios anteriores siguen exigiendo su generación cero. El mismo destino es idempotente; cambiarlo se rechaza y una barrera pendiente impide retargeting.

Preparación, revalidación y cancelación conservan la pose y fases retenidas. La adquisición Home libera la suspensión y publica su ruta mediante `publishGateRouteAdmission`; el cuerpo sigue siendo el mismo. Los dos valores de procedencia permanecen como metadatos acotados de la petición, sin retener el corredor anterior. No se consume el RNG de Idle al solicitar o preparar el regreso.

## Validación y límites

**1449/1449 pruebas en 127 archivos**, 756824.1925 ms. Ambos módulos nativos recompilados y build de producto correcto en **55.55 s**. Los 16 archivos locales protegidos y el helper pthread original permanecen exactos. [Comandos, conjunto e inputs/artefactos](performance/native-idle-moving-home-source-validation-20261116.json).

Los 10 casos nuevos ejercitan la fuente y las APIs nativas de confianza. Cubren los cuatro perfiles en standalone/pthread, pose/fases y presupuesto ejecutados, misma identidad y cantidad de cuerpos, compañero que continúa avanzando, cancelación/revalidación, adquisición y llegada Home, petición idempotente y rechazo de asignación/generación/sesión ajenas, propietario retirado y barrera pendiente. La fixture usa una suspensión nativa real; no representa una admisión gráfica ni reescribe Game para fingir el relevo.

La prueba aún no conecta esta nueva fuente con el relevo gráfico de 22 a cuerpo suspendido y Home, su permiso directo, las APIs de contrato de Game o su restauración. La medición GPU del incremento anterior pertenece al TaskStart desde descanso y a sus binarios históricos; no se atribuye a estos módulos nuevos. Tarea durante paseo móvil, restauración móvil, aproximación/anclas/bloqueos, productor/cohorte ordinarios, otras clases/finales/puertas y recuperación incremental integral de los 3123 recursos siguen pendientes. No se inicia D ni se afirma ausencia global de tirones.
