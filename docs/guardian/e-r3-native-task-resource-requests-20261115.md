# e-R3 parcial: reservar tareas sin emitir todavía sus rutas

Fecha: 2026-11-15. Base: `7d3099463`. Rama: `codex/guardian-3d-animation`.
Continúa el [plan integrado](integrated-gpu-migration-plan-20261104.md) tras la
[reanudación diferida](f-r4-deferred-native-resume-20261115.md).
Todos los padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

El commit ordinario de tareas emitía `RouteActive` antes de preparar sus recursos.
El reloj causal exige reservas y ejecución coherentes para toda ruta activa;
publicar esa ruta prematuramente impide continuar el cohort existente. Relajar
esa comprobación concedería tiempo de presentación sin la prueba necesaria.

## Implementación en los propietarios existentes

El mismo planificador global puede confirmar su lote con
`commitTaskBatchToState(state, plan, {navVersion, pendingResources:true})`.
Valida el lote completo y conserva su selección, orden y reservas de tarea.
Wild Engine almacena los puntos en el mismo `RouteSlot` y emite `IntentChanged`
con `AwaitingResources=6`, sin handle ejecutable ni secuencia de asignación.
El espejo JS confirma la reserva de tarea, deja al trabajador en `waiting-task`
y no instala un camino JS. El estado nuevo se añade sin renumerar los anteriores.

La API `pendingTaskRoute(actor)` devuelve una copia descriptiva con identidad de
solicitud, sesión, slot, generación, secuencia de solicitud, origen y puntos.
No contiene `nativeRoute`, `routeHandle` ni asignación futura. Los accesores de
ruta ejecutable, tiempo, preparación de movimiento y reserva rechazan incluso
un handle fabricado con los mismos números del slot pendiente. El espejo de
control conserva la solicitud pendiente sin concederle una admisión de dibujo.

El slot sigue ocupado y participa en el índice inverso de dependencias espaciales.
Los cambios pertinentes pueden invalidarlo y replantearlo mediante los eventos
existentes. El requisito de preparación sobrevive al replanteo: vuelve a producir
otra solicitud, nunca `RouteActive`. Cancelar una solicitud retira sus puntos sin
revocar un handle que nunca se publicó. Las demás reservas permanecen intactas.

El marcador persistible `nativeRouteAdmission:'pending-resources'` se valida en
el snapshot y se conserva al restaurar. Antes del primer replanteo de la nueva
sesión se restablece ese requisito en el propietario nativo. La restauración no
emite fugazmente una ruta ejecutable. La liberación ordinaria de tarea retira el
marcador; la futura publicación confirmada de una ruta también lo retira al
proyectar el evento nativo.

## Fuente consultada y decisión

Se revisó código real de [DetourCrowd v1.6.0, DetourCrowd.cpp](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp):
`requestMoveTarget` (547–598), `updateMoveRequest` (638–850) y la aplicación del
resultado (763–850). Distingue una solicitud pendiente del corredor aplicado y
comprueba su fuente actual al recibir un resultado diferido. Se adapta esa
separación al registro nativo y al lote existentes. No se adopta su movimiento
parcial ni su steering local: Wild Guardians sigue requiriendo una ruta completa
autorizada. No se añade una biblioteca, planificador, ejecutor ni registro de
trayectorias alternativo.

## Validación y trabajo que sigue

La [evidencia de validación](performance/native-task-resource-requests-validation-20261115.json)
registra las pruebas, ambos binarios, compilación y regresión gráfica.
El caso nuevo usa dos tareas ordinarias de cosecha reservadas por el planificador
global, dos cuerpos que permanecen quietos y un tercer trabajador que ya ejecuta
su ruta nativa. Durante 100 pasos de 20 ms continúa ese tercer cuerpo sin nuevas
consultas de planificación ni asignaciones de las dos solicitudes. Se ejercitan
también copias de datos, identidades ajenas, cancelación, replanteo, destrucción
del objetivo, guardado/restauración, rechazo previo del lote y pthread.

Pasan los nueve casos finales de solicitudes. La selección dirigida con WASM
ejecuta 101 casos: pasan 98 y los otros tres fallan también con el binario anterior.
La regresión amplia ejecuta 1840 casos de 170 archivos, sin omisiones: pasan 1835;
se conservan esos tres fallos antiguos y los dos Carry/Harvest ya registrados.
Ambas variantes nativas compilan, producto compila en 42,98 s y pasan los controles
de sintaxis. La regresión GPU existente de reanudación diferida conserva 54 dibujos
durante el bloqueo posterior al commit, cero creaciones tras readiness, entrada
de ambos trabajadores, cero errores GPU y drenaje; no acredita todavía el dibujo
de una primera asignación desde una solicitud de tarea.

Este incremento no publica todavía una primera ruta después de readiness ni
activa el modo pendiente en la partida. El consumidor de recursos debe construir
el candidato temporal desde la solicitud y los hechos físicos actuales, preparar
el recurso, drenar la GPU y confirmar la asignación real con la prueba nativa
actual. Debe enlazar esa solicitud con la asignación por el canal directo, sin
simular una suspensión previa ni exponer anticipadamente `RouteActive`.
Esa es la siguiente entrega; siguen las demás intenciones, acciones, consecuencias,
persistencia completa y aceptación integrada A/B/C antes de D.
