# Farm móvil en Game y despacho de parada preparada — 2026-11-19

Continuación e-R3/f-R4 del [plan integrado](integrated-gpu-migration-plan-20261104.md), después del [extremo Farm23 en Game](native-farm-terminal-game-20261119.md). Se conecta la ruta móvil existente al reloj de Game y el preparador existente24 al despacho de intenciones. La admisión Farm del roster de la autoridad ordinaria sigue cerrada: faltan su alimentación y alternativas de ciclo completo. A6/A/B/C abiertos; D no iniciado, f-R3 seguro.

## Decisión y fuente consultada

Se vuelve a abrir y leer el código real de [DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp): requestMoveTarget, requestMoveTargetReplan, resetMoveTarget y updateMoveRequest distinguen petición, corredor y agente vivo. Se adapta esa separación al lote nativo y cuerpo existentes; no se incorpora el crowd, su cola ni otra dependencia.

El validador físico Farm adapta además el criterio que ya usa nativeHeldIdleStrollBodyCurrent: disponibilidad para tareas y propiedad física son distintas. Al vencer el contrato, dejar de ser elegible no destruye el vínculo Farm mientras espera24. Se mantienen fuente, sesión, secuencia, generación, slot, cuerpo, flags, radio, perfil, centro, pose ejecutada, reservas y reloj; Home ya solicitado exige ineligibilidad. La lectura de Game valida también estado lógico, perfil/origen y la ausencia de lesión, recuperación, caída, caja o tarea ajena. Declarar una llegada nueva sigue exigiendo contrato válido.

## Implementación

Game reconoce únicamente la ejecución Farm nativa actual. Proyecta su caché antes de avanzar y conserva arriving, fases, presupuesto y cuerpo; no entra en el movimiento JS ni crea Idle o Task ficticios. También adopta la pose realmente retenida cuando se ha comprometido24.

La selección de tareas conserva al trabajador Farm como candidato. Si el lote elige una Farm móvil, commitTaskBatchToState devuelve cero asignaciones y conserva la propuesta existente; no reserva una tarea anticipadamente ni copia una cola. nativeFarmArrivalStopRequest deriva la solicitud del lote, objetivo y binding actuales. El productor usa stopNativeFarmArrivalAfterGpuQuiescence y prepareNativeGateResources, que ya transportan24. La identidad distingue trabajo y Home, evita reiniciar por cada pose y aborta por obsolescencia. La notificación real de24 invalida la propuesta y despierta el replanteo desde el cuerpo retenido, que puede reclamar6 y adquirir14.

El contrato vencido tiene prioridad Home: retira la elegibilidad, solicita la parada real y no permite reclamar trabajo; una vez detenido declara19 y adquiere18 sobre el mismo cuerpo. Al cruzar la hora de término se proyecta primero la pose nativa recién ejecutada, antes de notificar disponibilidad: enviar la pose JS del intervalo anterior había hecho rechazar el delta nativo. No se usa un reset para recuperar esa notificación.

La atomicidad del lote permanece: mientras alguno requiere24 no compromete nuevas asignaciones del mismo lote. Los cuerpos ya ejecutándose siguen avanzando. La independencia de nuevas admisiones bajo preparación lenta sigue siendo un requisito de integración, no queda aceptada por este incremento.

## Validación

El baseline de 44 casos tenía 2 pases y 42 fallos con el producto anterior. La primera ejecución candidata dio 18/44 y detectó el guard de contrato todavía cerrado y la pose antigua en el aviso de disponibilidad; se corrigieron. El fixture de retirada restauró una planta inmadura con su agua válida para no probar accidentalmente otro harvest automático ni leer un array de agua vacío. La segunda ejecución pasó 44/44. Se añadieron seis rechazos de semántica incompatible y se corrigió la aceptación de IDs numéricos y textuales del nuevo getter.

Los 50 casos nuevos cubren cuatro perfiles y ambos módulos nativos, avance real de Farm y peer, selección sin asignación anticipada, continuación durante preparación,24→6→14, vencimiento por día/hora→24→19→18, retirada anterior a24, despacho por el canal existente, cancelación y rechazos antes de tiempo/cuerpos. Los callbacks controlados del test de despacho no fabrican un permiso GPU.

Las expectativas antiguas de exclusión en Game y de excepción del lote se actualizan en doce archivos existentes, manteniendo las comprobaciones de permisos, cuerpo, fases, control, fuente y ausencia de efectos prematuros. Los 133 dirigidos y los 300 casos de los trece archivos de prueba modificados pasan. La primera selección completa se detuvo tras observar 52 fallos de contratos antiguos; su log parcial se conserva y no se presenta como una ejecución completa. La selección final termina 4553/4554 en 348 archivos, cero fallos y una comparación WASM opcional omitida. Las tres exclusiones históricas de host/timeline siguen abiertas y sin repetir.

Pasan 17 sintaxis y el build de producto WebGPU/Worker con dibujo remoto, 59.231 s totales. Se reconstruyen standalone/pthread con la receta canónica y outputs aislados: cambian spatial-task-execution.inc, spatial-route-execution.h y ambos WASM; JS pthread y worker conservan bytes. Se fijan 628 inputs, 64 nativos y 16 archivos ajenos; los cuatro documentos principales anteriores conservan su contenido íntegro.

La regresión hardware del consumidor ya existente Farm24→Task6/14 en nvidia/turing conserva 649 IDs inmutables, sustituye 1 dato de movimiento, prepara 70 recursos y crea 0 después de READY. Completa picking, adopción y drenaje, con 54/52 dibujos durante los bloqueos de 1800 ms y sin errores navegador/HTTP/GPU. Es timing sin PNG, con fuente de componente: no acredita el nuevo productor Farm ordinario ni cadencia global.

## Pendiente verificado y siguiente punto

Un ensayo separado retira la tarea DESPUÉS del commit24 y antes de su reclamación. Tras otro segundo de Game conserva el cuerpo en arriving/native-farm-arrival-held, sin tarea ni ruta activa. Es seguridad de retención, no finalización de la mecánica: falta una continuación Farm preparada o una alternativa válida cuando desaparece el sucesor. Este caso se conserva como pendiente y no como aceptación. Debe resolverse antes de abrir el roster/producción Farm ordinarios; no se convierte en un Idle ficticio.

Después siguen la alimentación Farm/Idle terminal ordinaria, nacimientos y cohortes restantes, independencia de nuevas admisiones del lote, consumidor/cohort fallido, pérdida de dispositivo, coste de publicación pausada, autonomía VFX, coste inicial, cadencia y plataformas. La reutilización caliente de main sigue heredada de 9456d2571; este incremento no promete ausencia total de tirones ni cierra la migración.

[Recibo y evidencias](performance/native-farm-moving-game-validation-20261119.json).
