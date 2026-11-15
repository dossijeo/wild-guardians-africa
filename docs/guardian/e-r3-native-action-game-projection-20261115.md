# La partida proyecta acciones ejecutadas en nativo

Continúa la [admisión con paquete GPU retenido](e-r3-native-task-action-admission-20261115.md).
`Game.tick` consume ahora la acción estacionaria realmente emitida en C++,
conservando el avance de las otras tareas del mismo cohort. No concede todavía
sus consecuencias ni completa la restauración. e-R3/e-R4/f-R4, los once padres
A6 y la aceptación integrada A/B/C siguen abiertos; no se activa el productor
ordinario ni se altera el orden A → B → C → D.

## Una proyección del mismo propietario

La clasificación nativa del cohort acepta `ActionActive` únicamente si conserva
su asociación emitida y el cuerpo físico coherente. Otras intenciones, puertas,
retornos y estados sin proyección siguen rechazados. El reloj sigue siendo el
de ejecución común; no se añade un temporizador, registro de cuerpos o ejecutor.

El planificador comprueba partida, tarea, objetivo, trabajador, clase y frontera
ejecutada antes de proyectar la acción. Adopta el origen estacionario, orientación,
fases y presupuesto nativos. Actualiza la proyección de posiciones existente
para que la observación semántica no los devuelva como un movimiento físico.
La polilínea JS permanece vacía.

La entidad usa `nativeRouteAdmission='native-action'`, `status='acting'` y un
registro semántico `nativeTaskAction` con versión, clase, duración y progreso.
`actionRemaining` se deriva de esa lectura ejecutada; no se decrementa con `dt`.
La rama se consume antes de la locomoción y de la acción heredadas. Una marca
JS sin acción nativa no permite avanzar el tiempo. El commit asíncrono de acción
despierta también el gate existente de reconciliación, incluso si su liberación
de control falla después de que C++ haya confirmado la transición.

El trabajador mantiene su tarea y cuerpo cuando el progreso llega a la duración
declarada. La finalización nativa es un hecho temporal, no una admisión de los
recursos de cosecha, caja, carga, cultivo o reparación. `completeTask` rechaza
una tarea con marca nativa antes de modificar cosecha, dinero o estructuras.
No se conserva el orden inseguro de efectos seguido de un `finishAction` cuyo
rechazo se ignoraría para esta clase.

Esto deja pendiente el commit preparado de la consecuencia. No hay permiso
provisional ni una caída al ejecutor JS mientras se completa esa conexión.
Cancelar/liberar la tarea o recibir una invalidación retira el progreso
semántico junto con su marca. La revocación pendiente se reconcilia antes de
ejecutar otro intervalo.

## Guardado y límite de restauración

Los formatos confirmado y persistente validan la relación de tarea, propietario,
clase, duración, progreso, tiempo restante, estado y polilínea vacía. El registro
semántico no admite campos adicionales: no guarda handles, tickets, asociaciones
ni secuencias nativas. Una lectura posterior conserva el progreso y los datos
del trabajador.

La restauración de una acción aún exige una admisión estacionaria nueva. Tanto
el bridge como el planificador la rechazan explícitamente antes de restablecer
su sesión actual. No se reinicia la acción desde cero, no se fabrica un recorrido
y no se reutiliza el permiso serializado. **La restauración funcional de esta
clase sigue pendiente**; serializar el progreso no la acredita. Esta limitación
impide declarar completa la persistencia o activar la partida ordinaria.

## Código fuente consultado

Se volvió a leer Godot 4.4-stable,
[`RigidBody3D::_sync_body_state` y `_body_state_changed`, líneas 134–166](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/physics/rigid_body_3d.cpp).
La proyección física suprime la notificación que reenviaría su transform al
servidor. Se conserva esa dirección de propiedad con `projectedPositions` y el
cuerpo existente, igual que en la proyección de ruta anterior.

También se inspeccionó
[`AnimationPlayer::_process_playback_data` y `_blend_post_process`, líneas 193–235 y 307–335](https://github.com/godotengine/godot/blob/4.4-stable/scene/animation/animation_player.cpp).
Acota el progreso al final y comprueba que la animación mantiene su identidad
antes de notificar la finalización. Aquí se aplica esa comprobación de identidad
a la acción y tarea actuales, conservando la separación entre progreso y efecto.
El tiempo y los efectos de juego siguen en la autoridad; no se trasladan a una
señal de animación o a un fotograma GPU. No se añaden dependencias.

## Validación y siguiente tramo

La [transacción de admisión común](native-admission-vertical-20261115.md) se reutiliza desde
`src/world/native-resource-admission.js`, con perfiles tipados para primera
ruta, reanudación y acción. El bridge conserva autoridad, propuesta y commit;
el cliente de preparación comparte las mismas funciones de referencia e
identidad. No se duplica el protocolo para añadir una clase. Los helpers
`native-admission-vertical` y `native-admission-contract` ejercitan el host y
el control existentes con el mismo contrato de preparación tardía, cancelación,
cambio durante drenaje y fallo posterior al commit. Para una consecuencia
nueva aún hay que aportar su propuesta/efecto nativos y recursos tipados:
la transacción común no fabrica ese permiso.

La [evidencia del incremento](performance/native-action-game-projection-validation-20261115.json)
identifica los binarios reconstruidos, hashes, pruebas y límites. Las pruebas
usan llegadas de tareas realmente ejecutadas y el `Game.tick` normal, incluyendo
WASM pthread. La emisión del permiso usa el ABI confiado como componente;
la admisión con drenaje GPU se acredita por sus pruebas específicas existentes.

Se comprueban cuerpo y fases nativos, avance de otra tarea, pausa/tasa, corrección
de un contador JS alterado, validación previa a la proyección, cancelación,
serialización semántica y rechazo de restauración sin admisión nueva. Llegar al
final y seguir avanzando no cosecha, crea cajas, paga reparaciones ni libera la
tarea. La fuente no llama al movimiento o despeje JS para estas tareas.

Las regresiones GPU mantienen los escenarios anteriores de primera tarea,
Harvest y reanudación diferida, con preparador y dibujante reales. Su fuente
sigue siendo `SpatialGameSession` en la página; no demuestran la nueva proyección
de acciones en una autoridad Worker ni el flujo de consecuencias de producto.
Las comprobaciones de recursos conservados no cierran el caso de 3.123 recursos.

El siguiente tramo debe preparar y confirmar las consecuencias con los mismos
propietarios, permitir la admisión nueva desde el progreso guardado y conectar
el productor ordinario. Quedan además consumidor nuevo con acción emitida,
coherencia de publicaciones ordinarias, otras intenciones y aceptación integrada.
