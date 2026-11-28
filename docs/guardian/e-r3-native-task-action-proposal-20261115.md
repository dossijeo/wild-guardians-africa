# Candidato de acción desde una llegada ejecutada

Continuación de la [ejecución nativa en `Game.tick`](e-r3-native-task-game-execution-20261115.md).
Se mantienen abiertos e-R3/e-R4/f-R4, los once puntos principales de A6 y la
aceptación A/B/C. El incremento resuelve la preparación y revalidación del
candidato nativo de acción; **todavía no admite el clip ni ejecuta la acción**.

## Identidad y preparación

La solicitud de acción que produce la llegada real alimenta ahora una propuesta
de la familia 15 en el mismo slot de mutaciones existente. Conserva exactamente
actor, tarea, objetivo, cuerpo, sesión/slot/generación, asignación, primer instante
de solicitud, clase, duración y orientación. No hay otro registro de trayectorias.

Wild Engine exige una llegada ya ejecutada, reserva vigente, tarea asignada y
objetivo activo. Comprueba también el vínculo actual trabajador/cuerpo, sus
flags, radio y posición. La propuesta copia posición, fases y presupuesto de la
caché ejecutada, sin evaluar otra pose ni copiar la ruta. Su intervalo comienza
en la frontera causal actual y conserva la duración declarada por las reglas.

El candidato no emite una transición, no predice una secuencia de acción, no
libera la ruta y no altera la reserva. La familia no puede pasar por los lectores,
canceladores o commits de primera ruta, reanudación o recursos de terreno.
Cancelar el candidato retira solo esa preparación: la solicitud y el disco
ocupado permanecen. La protección física existente impide reasignar su cuerpo
mientras la ruta sigue reservada.

## Preparación tardía

La revalidación usa únicamente la identidad retenida en nativo. Una cancelación,
replanificación, retirada del cuerpo o cambio de la fuente no puede convertirse
silenciosamente en otra acción. Una propuesta vigente recibe un ticket nuevo y
un intervalo desde el tiempo actual. El otro trabajador puede seguir ejecutando
su tarea mientras el primero espera.

`sameSourceState` compara identidad, política, pose y fases entre candidatos;
**no acredita compatibilidad Float32, recursos GPU preparados ni autorización de
efectos**. El siguiente paso debe asociar el paquete gráfico retenido y su recibo
al commit exacto de la acción mediante los propietarios y el control directo
existentes. No hay una entrada de commit de acción habilitada en este incremento.

El lector exacto de una propuesta obsoleta la rechaza. El coordinador que espera
preparación debe revalidar el ticket antes de capturar la nueva frontera, igual
que en la admisión de primera ruta. Cambiar de sesión o cargar una partida no
restaura candidatos ni permisos: se conserva el estado semántico ya documentado
y se solicita otra admisión.

## Código fuente consultado y decisión

Se revisó [Godot 4.4-stable, `AnimationMixer::_blend_process` y `_call_object`](https://github.com/godotengine/godot/blob/4.4-stable/scene/animation/animation_mixer.cpp)
(1553–1579 y 1908–1925). La evaluación de actualización omite callbacks de método;
la invocación comprueba la identidad del objeto y permite diferir la llamada.
Se adapta la separación entre preparar/evaluar y ejecutar consecuencias, con
revalidación de identidad al aplicar. Wild Guardians conserva sus propias reglas,
su propietario autoritativo y su protocolo causal. No se añade una dependencia.

## Evidencia y pendientes

La [evidencia final](performance/native-task-action-proposal-validation-20261115.json)
registra hashes, compilación standalone/pthread y resultados. Los doce casos
nuevos parten de `Game.tick` real y del lote global de dos tareas, con WASM real.
Comprueban fuente/cuerpo/fases, espera con B avanzando, exclusividad del slot,
cancelación/replanificación/retirada, aislamiento de protocolos, rechazo antes
de llegar, datos sin alias y carga sin permisos reutilizables. Se comparte el
fixture del ejecutor anterior sin cambiar sus diez comprobaciones.

Las regresiones GPU mantienen los escenarios existentes de primera tarea y
reanudación con `SpatialGameSession` en la página y los Workers gráficos reales.
No prueban todavía la acción gráfica nueva ni el productor ordinario. Los cinco
fallos históricos de la selección amplia siguen identificados; no se presenta
esa selección como una suite completamente verde.

Quedan preparar y asociar los clips/recursos de acción, admitir su transición
con el recibo GPU actual y conectar su ejecución y consecuencias a la autoridad.
Siguen pendientes el productor ordinario, el resto de intenciones y su ciclo de
vida, puertas y la aceptación integrada; este candidato no cierra esos puntos.
