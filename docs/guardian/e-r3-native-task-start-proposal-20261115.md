# e-R3 parcial: preparar la primera ruta desde su solicitud nativa

Fecha: 2026-11-15. Base: `c73c3fd88`. Rama: `codex/guardian-3d-animation`.
Continúa las [reservas ordinarias pendientes de recursos](e-r3-native-task-resource-requests-20261115.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Todos los padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

## Candidato y confirmación

Una solicitud `AwaitingResources=6` conserva su tarea y sus puntos en el registro
nativo. Sus números de slot/generación siguen rechazados por los accesores de
ruta ejecutable. La nueva `prepareNativeTaskStartProposal(request, policy)` del
propietario existente construye ahora un candidato temporal sin emitir todavía
una asignación. El inicio se toma de la frontera nativa actual; `requestedAt`
conserva por separado el instante de la solicitud original.

Wild Engine verifica la solicitud vigente, su tarea y objetivo, la vinculación
real trabajador/cuerpo, posición, radio, estado físico y perfil. Reutiliza el
compilador temporal, las fases, las esperas de puertas, sus barridos y la prueba
analítica de reservas existentes. Los cuerpos incapacitados no pueden iniciar
su tarea de trabajo. Preparar no mueve el cuerpo ni instala un motor ni publica
su trayectoria en el cohort ejecutable.

El candidato ocupa la misma reserva transaccional de mutaciones, como tipo 14.
Comparte `PendingNativeMotionDraft`, captura de muestras y comparación de curvas
con la reanudación tipo 13. Cada tipo conserva sus accesores e identidad propios.
Cancelar el candidato mantiene la solicitud y las demás tareas del lote.

La captura devuelve `native-task-start-proposal`, puntos/muestras/puertas propios
y una referencia `native-task-start-reference`. Identifica tarea, objetivo,
solicitud, cuerpo y frontera preparada. El handle esperado describe la generación
reservada; no aporta una secuencia futura ni permite leer una ruta ejecutable.
Los validadores distinguen esta primera asignación de una reanudación suspendida.

La revalidación reconstruye el candidato con la prueba física actual y reemplaza
el ticket. Conserva los resultados de igualdad nativa y de proyección Float32
introducidos para reanudación. Esa comparación describe recursos; la confirmación
exige además la tupla nativa exacta y vigente. El commit vuelve a comprobar la
vinculación del cuerpo: puede cambiar sin mover ningún disco ni alterar su contador
de mutación. Una vinculación obsoleta cancela el candidato antes de publicar.

Solo la confirmación nativa emite `RouteAssigned`, con la secuencia realmente
asignada y el inicio confirmado. La primera ruta puede continuar por la suspensión
y reanudación existentes conservando esa identidad real. La otra tarea del mismo
lote puede obtener su propia primera asignación sin sustituir a los cuerpos que
ya ejecutan.

## Fuente consultada y decisión

Se revisó [Jolt v5.3.0, BodyInterface.cpp](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyInterface.cpp),
`AddBodiesPrepare`, `AddBodiesFinalize` y `AddBodiesAbort` (167–185), y su
[implementación BroadPhaseQuadTree.cpp](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Collision/BroadPhase/BroadPhaseQuadTree.cpp)
(140–261). Prepara un estado por capas, confirma su incorporación con las
identidades comprobadas y permite abortar retirando el bookkeeping de preparación.
Se adapta la separación de preparación/confirmación/cancelación a nuestra reserva
nativa existente. Wild Guardians mantiene su propietario, sus revisiones y su
prueba física actual; no incorpora Jolt ni otro registro de cuerpos.

La comprobación de fuente actual continúa el patrón ya revisado en
[DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp),
`updateMoveRequest` (763–850). No se añade una dependencia o un planificador.

## Validación y siguiente punto

La [evidencia de validación](performance/native-task-start-validation-20261115.json)
registra resultados y hashes. Los casos nuevos parten del planificador global
de tareas de cosecha y de cuerpos físicos reales del fixture. B avanza dos segundos
mientras A permanece pendiente. Después de revalidar, la confirmación nativa
publica una sola asignación de A y ambos cuerpos avanzan conforme a sus muestras
nativas, sin publicaciones periódicas de posición JS. Se ejercitan también
cancelación, tickets/tipos ajenos, vencimiento temporal, cambio de vinculación sin
movimiento, incapacidad, copias propias, validadores, lote completo y pthread.

Pasan 13 casos nuevos y las 55 pruebas dirigidas. La selección amplia ejecuta
1854 casos de 171 archivos: pasan 1849 y se conservan los cinco fallos previos
documentados, sin omisiones. Compilan standalone/pthread y producto (45,41 s);
pasan los controles de 366 HTML/308 scripts y del JS modificado. NVIDIA Turing
mantiene 54 dibujos durante el bloqueo posterior al commit de la reanudación
existente, cero creaciones tras readiness, entrada de ambos trabajadores,
cero errores GPU y drenaje al cerrar.

La prueba de commit del kernel usa un llamador nativo de confianza y verifica su
contrato transaccional. Todavía falta enlazar esta nueva familia al preparador,
paquete retenido, drenaje y acreditación directa de la primera asignación. La API
JS nueva expone preparación, captura, revalidación y cancelación; no expone un
atajo de commit inicial que omita esa coordinación gráfica. La regresión GPU de
reanudación existente comprueba el código compartido, no la admisión gráfica de
este tipo nuevo. No se activa el modo pendiente en la partida.

Ese enlace es el siguiente punto, con B ejecutándose durante toda preparación y
drenaje. Siguen pendientes todas las intenciones/acciones, clases físicas, cambios
legítimos de representación durante la espera, consecuencias, persistencia y
aceptación integrada A/B/C antes de D. Ningún recuento de cierre cambia.
