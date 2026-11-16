# TaskStart desde el descanso posterior al paseo

Continúa [Home desde el ciclo actual](e-r3-native-idle-current-home-consumer-20261116.md). La fuente nativa conserva ahora la asociación estacionaria 21 de origen 22 al asignar una tarea real y prepara TaskStart desde su pose ejecutada. Se reutilizan la petición, el borrador, las reservas y la adquisición 14 existentes. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Código consultado y decisión

Se leyó el código de [`RigidBody::copy_from`, Rapier v0.22.0](https://github.com/dimforge/rapier/blob/v0.22.0/src/dynamics/rigid_body.rs). Copia el estado del cuerpo, pero excluye expresamente sus IDs internos y su conjunto de colliders. Se adapta esa separación entre estado y propietario estable: cambiar de intención no elimina/reinserta el cuerpo físico ni convierte la pose posterior al paseo en una nueva fuente inicial 20. No se añade una dependencia.

`PendingNativeMotionDraft::idleCycleSource` ya retenía el ciclo al preparar un paseo. TaskStart reutiliza ese mismo campo para comprobar que la adquisición sigue procediendo del ciclo actual. No añade un registro, historial de permisos, reloj o DTO público. La referencia TaskStart mantiene su versión y su esquema.

## Espera y adquisición

La asignación sólo acepta el relevo con recursos pendientes y un ciclo estacionario vigente. Conserva el claim de la tarea y el ciclo que posee el cuerpo. La comprobación del cuerpo admite esa espera únicamente con actor, generación, slot, origen, secuencia y estado pendientes coherentes; la vía de asignación inmediata sigue rechazada.

Conservar el cuerpo durante la espera no autoriza decisiones Idle: el generador continúa exigiendo el estado estacionario activo, sin tarea ni objetivo. TaskStart comprueba las fases de marcha y el presupuesto ejecutados del ciclo, además del cuerpo, radio, flags y pose que ya comprobaba el mecanismo existente. El borrador retiene el mismo propietario durante preparación y revalidación. Cancelar no mueve el cuerpo ni consume RNG; sólo el commit ligado a la frontera sustituye su propietario por la ruta adquirida.

La transferencia de reservas comprueba la asociación exacta y su cuerpo actual. El preparador de paseo sigue exigiendo por separado un ciclo Idle activo; ampliar la conservación del cuerpo a una tarea pendiente no habilita un paseo concurrente.

## Validación y límites

**1426/1426 pruebas en 124 archivos**, 736605.8335 ms. Ambos módulos nativos recompilados y build de producto correcto en **47.70 s**. Los 16 archivos locales protegidos y el helper pthread original permanecen exactos. [Comandos, conjunto e inputs/artefactos](performance/native-idle-current-task-source-validation-20261116.json).

Los 9 casos nuevos usan la fuente, el adaptador y el control directo reales: cuatro perfiles en standalone/pthread, tarea de cosecha creada y asignada por el planificador normal, fases/presupuesto sustituidos, espera inmóvil, cancelación, revalidación y adquisición con la misma identidad física. La vía de asignación inmediata conserva su rechazo. No se fabrica una tarea asignada ni se modifica Game para fingir la pose posterior al paseo.

Este incremento no demuestra preparación/dibujo del nuevo relevo en GPU. Faltan su recorrido por los dos puertos, roster/Surface originales y hardware; las métricas gráficas de Home pertenecen a sus binarios y escenario históricos. El productor ordinario de Idle movido, tarea/Home durante paseo móvil, restauración móvil, aproximación/anclas/bloqueos, otras clases/finales/puertas y recuperación incremental integral de los 3123 recursos siguen pendientes. No se inicia D ni se afirma que los tirones hayan desaparecido.
