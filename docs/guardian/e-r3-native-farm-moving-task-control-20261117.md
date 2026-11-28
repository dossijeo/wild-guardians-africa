# Control y admisión Farm retenido → Task

Continúa la [fuente Farm→Task y Game](e-r3-native-farm-moving-task-source-20261117.md) siguiendo el [plan principal](integrated-gpu-migration-plan-20261104.md). El controlador directo conserva el cuerpo gráfico detenido al recibir la solicitud Task6 y sólo sustituye su permiso cuando se adquiere TaskStart14. La admisión cruza los puertos originales y exige ahora un ACK Task14 tipado. El relevo del actor/Surface y su hardware sigue pendiente. A6/A/B/C abiertos; D no iniciado.

## Código consultado y decisión

Antes de implementar se inspeccionan [`RawId::zip/unzip` e `Id<T>` de wgpu v26.0.1](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/id.rs#L45): la identidad distingue índice, generación y familia. Se conserva esa distinción con las referencias y registros existentes de Wild Guardians, sin otro registro de cuerpos ni conversión de Farm a Idle. También se inspeccionan [`Queue::on_submitted_work_done`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/queue.rs#L1435) y [`LifetimeTracker::add_work_done_closure`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L345): el recibo corresponde al trabajo enviado que termina. El ACK14 se amplía sobre ese drain existente, sin cola, fence o dependencia nueva.

## Propietario retenido y adquisición

El controlador comparte la consulta interna de fuente detenida para las familias12/24. Exige la clase exacta de la asociación de parada, la admisión de su fuente, el mismo actor/asignación/handle, el cuerpo y la proyección final instalados. La vista Farm conserva su clase Farm y obtiene su radio de la petición23 genuina. Home continúa limitado a su fuente Idle existente; Task recibe su continuación Farm por el campo y estado originales de solicitud6.

Una revocación Farm sin prueba instalada, o con identidad de parada pero sin proyección final, no puede ascender a permiso de cuerpo retenido mediante una solicitud nueva. Se rechaza antes de modificar la secuencia del controlador. La misma comprobación evita interpretar ese Farm como una fuente Idle para Home.

Mientras la solicitud Task espera recursos, el selector detenido tipado mantiene posición, yaw, fases y edad de parada. El permiso genérico de suspensión deja de ser válido. El cuerpo y el otro Task nativo permanecen en sus propietarios originales; revalidar o cancelar un candidato no cambia el cuerpo retenido. El marcador del hijo necesita además el watermark causal real de su solicitud para que la lease sea vigente.

La asignación real de Task14 retira el permiso detenido. El permiso nuevo sólo queda vigente tras instalar la asociación14 exacta y su cuerpo. El instalador comprueba toda la colección antes de modificar las asociaciones; un recibo con otro cuerpo no puede tomar prestada la identidad de la solicitud. No se conserva como vigente una plantilla antigua cancelada al adquirir un candidato distinto.

## ACK Task14

El formato anterior de ACK era genérico para esta clase: no declaraba su versión14, de modo que alterar ese campo no impedía el commit. Ahora el Host, después del drain existente, emite `nativeTaskStartVersion:1` y la plantilla TaskStart exacta del paquete retenido. El publicador los valida y conserva una copia canónica. El perfil común de admisión14 vuelve a comprobar versión y referencia, también si un adaptador sustituye el objeto del recibo.

Las pruebas atraviesan el publicador original y los puertos de control/preparación existentes. Comprueban cuatro perfiles, revalidación durante preparación/drain, una preparación y un commit sin refresh, el mismo cuerpo y progreso del Task independiente. Abort, frame inválido, versión incorrecta y plantilla ausente/ajena no adquieren movimiento. Una retirada nativa durante el drain devuelve `resources-changed`, cierra la lease detenida y no compromete14.

## Evidencia y límites

La [evidencia](performance/native-farm-moving-task-control-validation-20261117.json) recoge28 casos nuevos:17 de controlador y11 de admisión. Incluye standalone/pthread, conservación del mismo target elegido mientras Farm aún se movía, rechazo de solicitudes malformadas, de pruebas incompletas y de Home ficticio, revocación y adquisición exacta del nuevo cuerpo. Pasa100 casos dirigidos, junto con los recorridos anteriores Idle→Task/Home y la vertical real de cliente/Host con dispositivo simulado.

La prueba previa detecta que el controlador no consume la nueva solicitud Farm y deja vigente el permiso genérico anterior. El primer grupo ampliado pasa50/52: identifica el ACK14 genérico descrito arriba y una expectativa de test incorrecta para `resources-changed`. Tras ampliar el ACK y corregir esa expectativa, pasan66 casos antes de la validación final.

Los controles negativos son loaders de lectura. Eliminar sólo la comparación de cuerpo al instalar14 permite aceptar otra identidad retenida y la prueba falla. Eliminar sólo la comprobación de recibo del perfil14 permite que un adaptador devuelva versión0 y llegue indebidamente a `committed`; el test exige `invalid-receipt`. Los controles no alteran el árbol ni los WASM.

Las leases se instalan con hechos ABI de confianza; los handles GPU, paquetes retenidos y drain del nuevo recorrido Farm son dobles. La vertical común verifica el ACK real del Host sobre dispositivo simulado, pero este incremento no acredita aún el actor Farm→Task original en Surface/GPU. No se repite hardware ni se recompila C++; se conservan64 inputs/artefactos nativos,380 entradas de validación, los16 archivos locales ajenos y el worker pthread sin seguimiento. Los siete fallos históricos fuera de la selección siguen abiertos.

Quedan el actor/Surface y hardware del relevo Farm→Task, Home, finales y productor/cohort completos, guardado/recuperación y continuidad. Las mediciones históricas de641 IDs/0 recursos tardíos y los intervalos64,27/86,81 ms corresponden al stop24 anterior; no son medidas nuevas de Task14. La recuperación incremental de los3.123 recursos y la ausencia de tirones siguen pendientes. Se mantiene A/A6 → B1–B7 → C antes de D.
