# Primera tarea: continuidad de fases al admitir la ruta

Continuación de [la admisión gráfica retenida](e-r3-first-task-gpu-admission-20261115.md).
e-R3/e-R4/f-R4 y los once puntos principales de A6 siguen abiertos.

Al integrar el ejecutor de partida se detectó que la primera ruta reiniciaba las
fases Run/Walk/Carry, aunque el trabajador ya podía tener tiempo acumulado en sus
clips. La reanudación conservaba esos valores; faltaba declararlos en la primera
admisión. Copiarlos después del commit habría separado ejecución y representación.

El mismo candidato nativo acepta ahora `runPhase`, `walkPhase` y `carryPhase`
como datos iniciales. Se validan antes de preparar y se incorporan a los offsets
del timetable antes de capturar sus filas. La revalidación conserva esta semilla
en el borrador nativo existente. No añade un reloj o acumulador JS, una textura,
un registro de actores ni otro ejecutor. Los recursos y la ruta realmente emitida
comparten esas fases; suspensión y reanudación continúan desde el valor ejecutado.

El bridge exige la capacidad `nav_task_start_proposal_phase_version=1` y utiliza
`nav_task_start_proposal_stage_with_phases`. Se conserva el ABI anterior de ocho
argumentos, con fases cero para sus consumidores originales. Las identidades,
tickets, permiso de dibujo y comparación de recursos no cambian: los offsets ya
forman parte de las filas comparadas. Una semilla inválida no consume la solicitud.

## Referencia de código y decisión

Se leyó [Three r180, `AnimationAction`](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js):
`reset` (188–196), `_update` (521–557) y `_updateTime` (674–821).
La acción mantiene su tiempo entre activaciones; el reinicio es explícito y la
evaluación del clip aplica su duración y modo de bucle. Se conserva ese principio
de continuidad. Wild Engine sigue calculando las fases según distancia y las
calibraciones del juego, y el shader existente sigue evaluando el clip. No se
adopta el avance por Mixer ni se añade una dependencia.

## Validación y alcance

La [evidencia](performance/native-first-task-phases-validation-20261115.json)
registra las fuentes, hashes y comprobaciones. Se reconstruyen standalone y
pthread y pasan los 60 casos dirigidos, sin omisiones. Cubren semilla no nula,
espera con B activo, revalidación, emisión, lectura de ejecución real, suspensión,
reanudación, carga y rechazo de datos inválidos. La API antigua conserva su caso
de compatibilidad. La comparación GPU con nativo usa el margen del formato
Float32; la identidad de textura y su versión se comprueban exactamente.
Pasan también los 225 casos completos de los propietarios remoto, roster
nativo y cliente de mundo, sin fallos ni omisiones.
El producto compila en 43,66 segundos con los avisos anteriores.

En el [escenario GPU](performance/native-first-task-phases-gpu-20261115.json)
el trabajador A parte de fases `(23.125, 41.75, 9.5)`. Las verificaciones del
escenario comprueban la semilla recibida por preparación y las fases de la
ejecución real. En NVIDIA Turing, dos bloqueos de 1,8 segundos mantienen el
avance de B; hay 53 dibujos durante el segundo y cero recursos nuevos después
de `ready`. Se conservan rig, selección de ambos actores y drenaje final,
sin errores GPU, de página, consola o red. Se revisó la
[captura durante el bloqueo](performance/native-first-task-phases-blocked-20261115.png).

La fuente de ese escenario sigue siendo un `SpatialGameSession` en la página,
con los Workers reales de preparación y dibujo. Este incremento no activa la
partida ordinaria ni demuestra la migración de llegada/acción/consecuencia.
La carga se cubre en el contrato nativo de fases; no se amplía con ello la
admisión gráfica inicial, que sigue limitada a trabajadores sin caja.

El siguiente punto sigue siendo conectar el productor y ejecutor ordinarios en
la autoridad existente, sin bloquear su cola de avances durante la preparación.
La proyección de estado debe leer lo realmente ejecutado por Wild Engine y evitar
otra llamada a `moveWorker`. La llegada necesita su propia admisión de acción y
consecuencias antes de retirar la reserva; no basta con trasladar el booleano de
llegada al controlador heredado. Permanecen pendientes las demás intenciones,
cancelación/restauración completas y la aceptación integrada A/B/C.
