# Recibo y reloj de Farm23 en el cliente/Host originales

Continúa los [adaptadores de terreno/GPU/reloj/picking](e-r3-native-farm-arrival-route-clock-20261117.md) y el [contrato de publicación/puertos](e-r3-native-farm-arrival-route-ports-20261117.md) según el [plan principal](integrated-gpu-migration-plan-20261104.md). El cliente y Host originales admiten, por capacidad explícita, el paquete preparado23, su reloj relativo/origen y el recibo/liberación de la asociación real. El draw Worker aún no anuncia la capacidad: faltan el consumidor de roster/Surface y su validación de hardware. Game/productor ordinarios y bootstrap activo siguen cerrados. A6/A/B/C permanecen abiertos; D no se inicia.

## Referencia y decisión

Antes de implementar se vuelve a consultar [wgpu v26.0.1, `LifetimeTracker::add_work_done_closure` y `triage_submissions`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L296). El callback corresponde a una submission y se recupera cuando se completa su índice. Se mantiene ese patrón en el punto que el Host ya posee: el acuse23 se emite después de `device.queue.onSubmittedWorkDone()`, conservando el paquete retenido y su identidad. No se añade otra cola, fence, ejecutor, reloj o dependencia; se amplía el contrato de movimiento existente. El hash consultado queda en la evidencia.

## Implementación

El cliente exige `nativeFarmArrivalVersion:1` para registrar el reloj o preparar un frame23. Valida semántica relativa/origen modular, época y exclusión de otras familias; copia el binding por el transporte existente. El commit del paquete exige la asociación23 y su referencia preparada exacta. La capacidad ausente conserva el rechazo anterior antes de publicar un frame.

El Host normaliza la referencia, conserva su clave de reloj y obtiene una lease de `admitFarmArrival`. La preparación exige su plantilla y frontera; el permiso actual sólo existe tras instalar la asociación emitida bajo el watermark nativo. El límite de recursos, origen de ejecución, pausa y snapshot de picking usan el mismo recorrido que Home/Stroll. El snapshot enviado incluye edad relativa Float32 y origen real, sin convertir un reloj global o un origen modular aislado en edad de movimiento.

La quiescencia exige el paquete retenido exacto y al menos un binding **relativo** de Farm que coincida con su plantilla. El acuse23 sólo se envía tras el drain. La liberación valida versión/frontera, asociación, plantilla, frame, exclusión de familias y control vigente antes de adoptar el paquete. Las otras familias tampoco pueden incluir asociaciones Farm en su liberación. El bootstrap de un Farm activo sigue rechazado. Un fallo posterior al commit físico informa/cierra el control; no inventa una reversión.

La primera imagen adoptada usa edad cero y el origen realmente adquirido, también si la preparación o el drain avanzaron el reloj. Las imágenes siguientes quedan limitadas por la frontera causal recibida. La llegada cero conserva el punto y las fases nativos y continúa `arriving`, sin una consecuencia Idle ficticia. El draw Worker conserva su lista de capacidades anterior hasta completar roster/Surface; los tests optan explícitamente por el contrato que el Host ya implementa.

## Validación y continuación

La [evidencia](performance/native-farm-arrival-route-remote-validation-20261117.json) contiene los resultados finales y hashes. Las 19 pruebas nuevas usan servicio nativo, publicación, cliente y Host de producción: cuatro perfiles con origen exacto/tardío, binding/plantilla/fuente/época/capacidad incorrectos, llegada cero, drain bloqueado, cancelación durante drain, liberación final ausente, aliases de familia y pthread.

Los puertos y el dispositivo/cola del fixture son dobles deterministas. El **acuse23 lo produce el Host**, no un callback que lo fabrique. El caso de drain retenido verifica que el cuerpo sigue pendiente hasta resolver la promesa de trabajo enviado. La primera imagen y las siguientes exponen el reloj esperado al capturador de picking. El paquete gráfico del test es mínimo: no certifica todavía el actor original de roster/Surface, Workers de navegador, hardware, continuidad o recuperación integral.

Un loader ESM de sólo lectura elimina únicamente la exigencia del reloj relativo en la quiescencia del Host. El caso sin ese reloj pasa a adquirir físicamente la ruta y falla por el estado `committed` prohibido, sin modificar el árbol ni los WASM. Es evidencia de que el Host comprueba ese requisito antes del commit, no sólo la forma del recibo. Los casos filtrados no cuentan como fallos de la regresión final.

Se ejecutan regresión compartida y build; los 64 inputs/artefactos nativos permanecen exactos, sin recompilar C++ ni repetir hardware. Los 569 IDs conservados, 30 recursos tardíos y máximo global de 66,72 ms siguen siendo evidencia histórica de otra vertical. La recuperación incremental integral de 3.123 y la ausencia de tirones siguen sin acreditarse.

Se continúa con la preparación/adopción de Farm en el actor y banco originales, roster/Surface y el recurso retenido de ambos puertos. Después se habilita la capacidad del draw Worker con evidencia del recorrido completo y hardware. Siguen pendientes los relevos durante movimiento y finales Idle/Task/Home, alternativas de entrada/cohort, contratos/puertas/raid, productor integral, guardado UI y aceptación integrada A/A6/B/C.
