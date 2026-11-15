# El bucle de partida consume la ejecución nativa de tareas

Continuación del [canal de preparación de la autoridad](e-r3-native-resource-channel-20261115.md).
Se mantienen abiertos e-R3/e-R4/f-R4, los once puntos principales de A6 y la
aceptación integrada A/B/C. Este incremento conecta el ejecutor al bucle real;
no activa todavía el productor ordinario ni la nueva admisión de acciones.

## Un movimiento y una proyección

`Game.tick` avanza el cohort nativo antes de adoptar el tiempo del paso. Primero
reconcilia los eventos pendientes en la frontera actual: una cancelación no puede
dejar que la ruta anterior ejecute otro intervalo. El nuevo watermark causal se
confirma después del trabajo semántico del mismo paso. `advanceReal` conserva
su relación entre tiempo lógico y tiempo real al entregar la tasa al ejecutor.

Wild Engine expone una lectura versionada de 31 números de la intención actual:
actor/tarea/objetivo, sesión/slot/generación/asignación, cuerpo, tiempo ejecutado,
destino y los 18 campos de su pose ya ejecutada. Comprueba el vínculo vigente y
que el cuerpo físico coincide con esa pose. No muestrea una posición futura ni
copia puntos de la ruta. Las filas se copian antes de otras llamadas a WASM.

El planificador proyecta posición, orientación, fases y presupuesto en la entidad
del juego. Conserva la polilínea únicamente en nativo; el `path` JS de esta clase
es un array vacío. Actualiza la proyección de posición existente para no devolver
ese cambio como otro movimiento. La reconciliación topológica también omite el
antiguo envío del sufijo JS para estas tareas.

El bucle real de trabajadores consume esa lectura antes de la locomoción antigua:
no llama a `moveWorker`, a su muestreo de despeje ni a su replanificación para
una tarea nativa ejecutada. La comprobación de modo es constante en la ruta
heredada; no se añaden lecturas de poses por trabajador cuando no está activo
el ejecutor nativo.

## Llegada y recursos de acción

Una llegada ejecutada retiene su reserva y declara los recursos de la acción en
la misma intención nativa. La declaración conserva asignación, cuerpo, primer
instante, clase, duración y orientación. Es idempotente para la misma política;
una política distinta no la sustituye silenciosamente. No emite otra asignación,
no inicia `ActionActive` y no aplica cosecha, recogida o reparación.

`nav_intent_action_active` rechaza las tareas que exigen recursos: el acceso
heredado no puede convertir la declaración en permiso. Revocar o reemplazar la
ruta retira la declaración. El resto del cohort sigue avanzando mientras ese
trabajador permanece en el destino. **La admisión gráfica de esta acción y sus
consecuencias todavía no están implementadas**; esa espera no es una tarea
terminada ni un criterio de aceptación satisfecho.

## Guardado y fronteras de la clase actual

El estado confirmado y el guardado usan `nativeRouteAdmission='native-task'`
solo para una tarea asignada, `walking` y sin polilínea JS. Es estado semántico,
no un handle o permiso guardado. La carga reconstruye `pending-resources`,
`waiting-task` y `path=null`, conservando posición, fases y presupuesto; se
requiere otra admisión y los handles anteriores dejan de ser válidos. Los
replanteos vuelven también a ese estado serializable. Un estado nativo no puede
pasar al movimiento heredado sin un planificador de admisión.

La clase conectada es la de tareas de trabajadores sin carga ya admitidas por
el protocolo nativo. Se rechazan antes del avance los otros tipos de intención,
puertas, raid, cuerpo con actualización JS, deambulación, retorno y estados de
incapacidad/recuperación que aún no tienen esta proyección. Alcanzar la frontera
de retorno del contrato tampoco activa un segundo ejecutor. Estos rechazos
mantienen explícito el trabajo pendiente; no se habilitan en el juego ordinario.

La reentrada desde un guardado se valida como solicitud nueva. Servir la acción
pendiente al restaurar en el destino, incluido el caso sin recorrido, sigue
dependiendo de la nueva admisión de acciones; no se afirma aquí su ejecución.

## Referencia y validación

Se leyó [Godot 4.4-stable, `RigidBody3D::_sync_body_state` y `_body_state_changed`](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/physics/rigid_body_3d.cpp)
(134–166): aplica el estado físico al nodo evitando que la notificación lo
devuelva al servidor como otra transformación. Se adapta esa dirección de
propiedad al ejecutor y al registro existentes. La espera de recursos mantiene
el patrón de solicitud/referencia retenida ya revisado en
[ResourceLoader](e-r3-native-resource-channel-20261115.md#código-fuente-consultado).
No se añade un motor, biblioteca o registro de trayectorias.

La [evidencia final](performance/native-task-game-execution-validation-20261115.json)
recoge la selección dirigida, la regresión amplia y hashes congelados. Los casos
nuevos ejercitan el `Game.tick` real con dos tareas del lote global y WASM real,
incluido pthread. Hacen fallar el movimiento/despeje JS si se invoca, comparan
entidades con cuerpos y fases nativos, mantienen A en su destino mientras B
avanza, comprueban cancelación previa al paso y guardado/carga sin permisos
reutilizables. Los arneses corregidos conservan sus
[26 verificaciones de grabación](performance/native-resource-worker-harness-validation-20261115.json).

Las regresiones GPU conservan los escenarios anteriores de primera tarea y
reanudación; **siguen teniendo una fuente `SpatialGameSession` en la página**.
No son una prueba GPU del nuevo productor ordinario ni del flujo de acciones.
La evidencia diferencia esa regresión de la nueva ejecución funcional en el bucle
de partida. Los cinco fallos históricos de la selección amplia permanecen
identificados y no se declaran corregidos.

Quedan conectar el productor y los cuerpos de todas las intenciones desde la
autoridad, servir las solicitudes de acción con recursos preparados y efectos
confirmados, completar puertas/otros estados/persistencia y aceptar A–F/B/C.
