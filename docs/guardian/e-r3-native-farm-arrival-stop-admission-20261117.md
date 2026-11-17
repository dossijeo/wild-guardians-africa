# Admisión y publicación de control para Farm24

Continúa el [control directo Farm24](e-r3-native-farm-arrival-stop-control-20261117.md), según el [plan principal](integrated-gpu-migration-plan-20261104.md). La fuente prepara, revalida y compromete la parada24 mediante el transactor existente. El publicador original de control conserva su plantilla en el hold, valida el ACK y publica la asociación final. Los canales de preparación de recursos, el consumidor gráfico24 y los relevos Task/Home siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Referencias y decisión

Antes de implementar se inspeccionan las implementaciones reales de [wgpu v26.0.1, `Queue::submit` y `on_submitted_work_done`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/queue.rs#L1129), y [`LifetimeTracker::track_submission` / `add_work_done_closure`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L210). El envío tiene un índice y el tracker conserva ejecuciones y callbacks asociados hasta su finalización. Se adapta esa separación sobre el protocolo ya existente: preparar datos no equivale a tener un paquete retenido ni un ACK de la frontera exacta. No se copia el tracker ni se añade cola, fence, controlador o dependencia.

## Fuente y transactor

El adaptador de parada diferida existente se comparte entre Idle12 y Farm24. Cada familia selecciona su asociación nativa vigente, codec, captura, revalidación y cancelación sobre el mismo slot de propuesta. Farm usa el perfil `farm-arrival-stop`, con plantilla, binding y colección de liberación propios. La entrada explícita es `stopNativeFarmArrivalAfterGpuQuiescence`; la mutación `stopFarmArrival` contrasta también la asociación completa entregada por el caller. La entrada genérica Idle anterior conserva su comportamiento y sus diagnósticos.

Durante preparación y drain se permite avanzar a los cuerpos. La fuente comprueba que el propietario y el mundo retenidos continúan vigentes; después del drain exige el mismo watermark de intents, revalida la pose nativa y conserva los propietarios del candidato preparado. Sólo entonces compromete24 ligado al ticket preparado original y obtiene del kernel la proyección final real. La referencia preparada y la adquirida pueden tener fronteras temporales distintas; no se cambia el origen preparado ni se reutiliza otro cuerpo.

No se publican chunks ni geometría para esta parada. El transactor exige retención de recursos antes de emitir la liberación. Un fallo posterior al commit físico devuelve `committed-control-failed` y cierra la conexión, sin presentar la mutación como cancelada. Game puede consultar después el cuerpo retenido por su proyección ya existente; el adaptador no abre el tick ordinario ni cambia la prioridad Task de `arriving`.

## Publicación y ACK

El hold original admite `preparedFarmArrivalStopTemplate`, excluye plantillas simultáneas de otras familias y comprueba que los propietarios ya fueron emitidos. Su ACK necesita versión1 de parada Farm, igualdad de plantilla, frontera y secuencia válida del frame preparado. El recibo retiene la plantilla del hold; por eso la comparación del ACK debe ocurrir antes de resolverlo.

La liberación copia `nativeFarmArrivalStops`, exige proyección final, frontera adquirida exacta, secuencias de fuente/propietarios anteriores al hold y ausencia de propietarios/cuerpos duplicados. Rechaza familias mezcladas, asociaciones ausentes y recibos ajenos a la plantilla preparada. Publica los eventos nativos y el reloj confirmado antes de enviar esa liberación. No acepta el ACK de Idle12 ni uno genérico como capacidad24.

## Evidencia y pendientes

La [evidencia](performance/native-farm-arrival-stop-admission-validation-20261117.json) recoge 21 casos nuevos y 91 dirigidos. Los cuatro perfiles pasan en standalone/pthread usando fuente, log, controlador, publicador y MessagePort reales. Los handles de recursos, el drain y la secuencia de frame son dobles explícitos: no acreditan preparación ni ejecución GPU24. Las pruebas cubren avance durante ambas esperas, pose final revalidada, Task14 independiente, estabilidad de cuerpos/RNG/economía/tareas, espejo Game posterior, ACKs inválidos, plantillas conflictivas/ajenas, nuevo intent durante drain, llegada durante preparación, cancelación y fallos posteriores al commit.

El control negativo usa un loader ESM de sólo lectura para eliminar únicamente la igualdad de plantilla en el ACK Farm24 del publicador. Se mantiene la versión y el resto del protocolo. La prueba con plantilla de ACK alterada falla porque la fuente llega a comprometer indebidamente la parada. El árbol y los WASM permanecen intactos; este fallo intencionado no pertenece a la regresión final.

Se congelan 368 entradas de validación y se verifican 64 inputs/artefactos nativos sin recompilar. Se preservan los 16 archivos locales ajenos y el worker pthread sin seguimiento. El draw Worker sigue sin anunciar parada24. No se repite hardware; los huecos de la evidencia histórica Farm23 y la recuperación incremental integral de 3.123 recursos permanecen abiertos.

Continúan los contratos de preparación24 en los puertos existentes, cliente/Host/reloj/picking/Surface/actor original y hardware, además de Task/Home desde Farm retenido y finales Idle/Task/Home. Siguen cohort y mecánicas restantes, productor integral, guardado UI, planificación de preparación y continuidad A/A6/B/C.
