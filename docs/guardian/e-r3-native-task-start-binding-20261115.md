# e-R3 parcial: asociación nativa de recursos de primera asignación

Fecha: 2026-11-15. Base: `803c41b96`. Continúa el
[candidato de primera ruta](e-r3-native-task-start-proposal-20261115.md).
El [plan integrado](integrated-gpu-migration-plan-20261104.md) mantiene el orden
A → B → C → D. Todos los padres A6 y e-R3/e-R4/f-R4 siguen abiertos.

## Identidad y propietario

La confirmación nativa puede asociar al slot ejecutable el origen exacto de los
recursos que se prepararon. `nav_task_start_proposal_commit_bound` acepta el ticket
actual o el inmediatamente anterior cuya proyección Float32 de movimiento y
puertas se haya probado idéntica. Rechaza un antecesor arbitrario, una proyección
diferente o la tupla física obsoleta. La comprobación física y la publicación de
la única `RouteAssigned` siguen usando la transacción nativa existente.

El mismo `RouteSlot` conserva metadatos inmutables: origen preparado, origen
confirmado y secuencia realmente asignada. No duplica puntos, cuerpos, reservas
ni planes. Liberar o reemplazar la versión retira la asociación. La consulta
comprueba actor, estado activo, slot, generación, cuerpo, instante y secuencia
antes de devolverla. El commit nativo anterior sigue existiendo y no genera
esta asociación por inferencia.

La proyección directa devuelve una `native-task-start-reference` para cada
origen y los IDs de puertas del slot vigente. Copiar esa relación no concede
autoridad. `NativeRouteControl` exige también la asignación recibida del origen
directo, su handle exacto y, en el recorrido normal, la solicitud pendiente
previamente observada. Un lease preparado no permite dibujar antes de recibir
ambos hechos.

## Consumidores nuevos y solicitudes pendientes

La baseline nativa incorpora descriptores de solicitudes `AwaitingResources`
vigentes, sin geometría ni permiso de ejecución. Los eventos de estado 6 adjuntan
el mismo descriptor únicamente si sigue vigente esa secuencia. Su búsqueda usa
un mapa temporal por lote; el transporte no conserva un registro de asociaciones.

Un consumidor que se conecta después de confirmar recibe la asignación vigente
y la relación original desde el slot nativo. Puede instalarla como bootstrap
sin exigirle una historia de solicitudes anterior a su conexión. Se mantienen
las comprobaciones de sesión, generación, secuencia y origen ejecutado. El host
gráfico acepta esos hechos en su baseline directa. Las demás rutas continúan
con su identidad y reloj existentes.

## Fuente consultada y decisión

Se leyó el código de [Jolt v5.3.0, `BodyManager::TryGetBody`](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyManager.h)
(133–156): comprueba límites, slot vivo e identidad completa antes de aceptar
una referencia. Se adapta esa comprobación al slot y su generación existentes.
No se añade Jolt, un registro JS de rutas ni otra autoridad.

Para la conexión gráfica siguiente se revisó también código real de Three r180:
[`Textures.updateTexture`](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Textures.js)
(188–190, 244–289) distingue versión de datos e inicialización de la asignación;
[`Bindings._update`](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js)
(225–254, 300–302) separa actualización de datos y sustitución de generación.
La decisión es conservar los recursos sin cambios y actualizar datos cuando su
representación cambie, utilizando el mecanismo existente. Este incremento no
declara implementada esa conexión gráfica.

## Validación y alcance pendiente

La [evidencia](performance/native-task-start-binding-validation-20261115.json)
registra hashes y resultados. Se comprueban preparación sin permiso de dibujo,
asignación real, desplazamiento compatible del origen, consumidor nuevo con
solicitudes ya pendientes, consumidor posterior a la asignación, revocación,
transporte de baseline, referencias falsificadas, tickets antecesores y pthread.

También se conserva un caso donde el inicio pasa de 10 a 10,4 segundos y una
muestra cambia de representación Float32. Debe rechazarse la asociación de los
recursos originales. No se usa tolerancia ni se fuerza una pausa del reloj para
hacerlo pasar. Sigue pendiente preparar solo los datos que hayan cambiado antes
de producir el efecto físico.

Este incremento valida identidad y permisos del componente. Falta unir la
primera asignación con el preparador, roster, paquete retenido, fence GPU y
liberación directa del recorrido real; falta su prueba gráfica con B avanzando.
La regresión GPU registrada ejercita el recorrido existente de reanudación,
no acredita admisión gráfica de una primera tarea. El modo ordinario pendiente
de recursos sigue sin activarse en producto. Tampoco se declara resuelta la
recuperación del recorrido anterior de reanudación ni la aceptación integrada
de mecánicas, persistencia y clases del plan.
