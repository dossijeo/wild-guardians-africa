# Farm y solicitud de refugio tras RaidSpawned

El caso de desierto 983 reproduce una incursión diurna con un trabajador y un facóquero. Al publicarse `RaidSpawned`, Game conserva la procedencia de Farm antes de limpiar la tarea. Si Farm espera recursos, se cancela su READY y la solicitud de refugio usa la pose de origen. Si Farm está adquirido, el productor prepara Stop24 con el cuerpo, el corredor y la fase vigentes. El roster conserva el actor durante la preparación y exige la pose del recibo adquirido al cambiar al estado estacionario.

El contrato v2 de Home lleva la secuencia del evento, el cuerpo del trabajador y la entrada de su aldea. Draw exige la misma fuente y rechaza usar el contrato para ocupar un cuerpo de Idle. El caso conserva la pose y las fases al declarar `pending-raid-flight-resources`. Ese estado transitorio mantiene cerrado el guardado público. La opción de desarrollo es `qualifyFarmFlee:true`.

OpenRA distingue la cancelación directa de una actividad en cola y la cancelación de una actividad activa que todavía debe completar su último tick. DetourCrowd retira la solicitud de movimiento sobre el mismo agente. Aquí se reutilizan el controlador cancelable, Stop24 y el contrato Home existente. [OpenRA Activity](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Game/Activities/Activity.cs#L183-L194) · [DetourCrowd 1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L609-L624).

## Controles de fuente

Los casos de autoridad y Host determinista parten del escenario de Farm original con un solo facóquero diurno. Comprueban aborto del READY tardío, Stop24 adquirido y la solicitud v2 atada a `event-29208`. El control gráfico rechaza otra incursión, otro actor, cambios de contrato o pose y una pose final sin recibo. En WASM, un componente aislado comprueba el corredor de huida a 2,4 m/s desde el mismo cuerpo y los rechazos de fuente ajena.

Los binarios standalone y pthread conservan las firmas anteriores y añaden `nav_intent_farm_flight_request` y `nav_home_flight_event`. El control pthread invocó ambos exports y publicó un chunk desde memoria compartida.

## Corte en GPU física

El arnés detiene los avances en el `RaidSpawned` real y permite confirmar el trabajo de recursos en ese mismo instante. NVIDIA recibió la declaración estacionaria v2 a 10,80 s para el actor 900011 y el cuerpo 1. En el caso pendiente, el READY retenido volvió después de cancelarse su solicitud y Farm quedó sin adquirir. La pose siguió en (−17,8 m, 0,2 m). Se conservaron la raíz del trabajador, sus 32 mallas y las referencias de los 1.408 atributos comparables. El consumidor confirmó el drenaje.

Con Farm activo, el primer intento abortó Stop24 antes de READY porque el roster exigía el estado de Farm anterior al evento. Con la corrección del roster, el siguiente intento adquirió Stop24, pero el Draw Worker aún recibió la solicitud v2 por delante del límite de secuencia del reloj. Un control determinista retuvo el primer RAF hasta que llegó esa solicitud y reprodujo diez bindings obsoletos. El productor confirma ahora su secuencia con el reloj causal existente, al mismo tiempo, tasa y pausa. El mismo control ya dibuja el ticket al primer RAF.

NVIDIA dibujó Stop24 con el ticket adquirido 4 en la secuencia 32, a 10,80 s. La solicitud v2 conservó el cuerpo 1 y la pose detenida (−17,418843 m, 0 m), con su fase y orientación. Los 1.408 atributos comparables conservaron tanto buffer como versión. Se conservaron la raíz y las 32 mallas originales y el consumidor confirmó el drenaje. El intervalo de ese dibujo fue de 33,30 ms y el máximo observado fue de 36,70 ms a 30 Hz. [Recibos, trazas y controles](performance/native-farm-raid-flight-handoff-20261125.json).

Pasaron 364 pruebas de la selección nativa y, con el ajuste final del reloj, 109 pruebas de la selección de relevo y gráficos. El build de producto pasó en 52,04 s.

## Trabajo pendiente

El escenario de desierto carece de cultivos y el selector ordinario elige un centro en una consulta independiente sobre el estado de nacimiento. El corte llega a la solicitud de refugio y reserva el GO de huida hasta comprobar la ejecución del animal. La cohorte mixta necesita validar la residencia, la separación durante ambos corredores y el margen de encuentro de Game. La marcha hasta la aldea, el ataque al centro, Recovery, la activación ordinaria y C4 continúan abiertos.
