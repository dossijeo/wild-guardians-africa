# Control directo para la parada Farm24

Continúa la [proyección Farm retenida](e-r3-native-farm-arrival-held-projection-20261117.md) y el [contrato de parada](e-r3-native-farm-arrival-stop-data-20261117.md), según el [plan principal](integrated-gpu-migration-plan-20261104.md). El controlador original puede preparar la parada Farm24, aceptar su revocación nativa y comprobar la instalación final. Se comparte la implementación de parada con Idle12; siguen pendientes la admisión de fuente y el transporte/publicación de recursos24, su consumidor gráfico y los relevos Task/Home. A6/A/B/C abiertos; D no iniciado.

## Código consultado y adaptación

Se inspecciona de nuevo el código real de [wgpu v26.0.1, `RawId::zip/unzip` e `Id<T>`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/id.rs#L83): el índice/época identifica una asignación y el marcador distingue la familia de recurso. Se adapta esa separación al controlador existente: las familias12/24 comparten validaciones, pero exigen su codec, fuente emitida y marca de admisión propios. No se incorpora wgpu ni un registro, controlador o dependencia nuevos. El hash del código consultado consta en la evidencia.

## Revocación y permiso retenido

La observación de la ABI real confirma que la parada24 emite `RouteInvalidated`, estado4, con el handle anterior revocado. El control rechazaba toda transición desde Farm23. Ahora acepta esa revocación acotada al intervalo de movimiento, sin nueva ruta, tarea, objetivo ni asociaciones de otra familia. La generación revocada debe coincidir y la comprobación previa de revocación tardía se conserva. Una llegada de distancia cero o una transición en el antiguo deadline no adquieren este caso.

Aceptar el evento ordenado cierra la ruta anterior; no concede una pose retenida. La instalación final exige el reloj confirmado en la frontera adquirida, el registro revocado exacto, la fuente Farm23 previamente admitida, el cuerpo original y la prueba24 correspondiente. La marca de admisión permanece en ese registro al revocarlo. Toda la colección de propietarios se valida antes de escribir: un recibo posterior inválido, repetido o ajeno no instala un prefijo.

Las funciones internas de instalación, preparación y lectura de cuerpo se extraen del caso Idle12. Dos descripciones inmutables seleccionan codec y campos de la prueba existente. Se mantienen las entradas Idle y se añaden `installFarmArrivalStops`, `admitFarmArrivalStop` y `admitFarmArrivalStoppedBody`. Los recibos de otra familia se rechazan incluso si un caller cambia etiquetas estructuralmente válidas: el registro debe conservar la fuente emitida/admitida correspondiente.

La lease de cuerpo entrega únicamente los valores finales de la proyección nativa instalada y la edad de suspensión respecto al origen real de Farm23. La preparación no expone valores ni sampler; un recibo sin proyección puede acreditar la parada, pero no una pose dibujable. La ruta Task independiente sigue avanzando mientras el cuerpo Farm queda retenido. El retiro real del propietario o el cierre del control invalidan las leases. No se añade muestreo de tiempo ni se asignan cuerpos, mallas o bancos.

## Validación y límites

La [evidencia](performance/native-farm-arrival-stop-control-validation-20261117.json) recoge 18 casos nuevos y 69 dirigidos. Los cuatro perfiles pasan en standalone/pthread: preparación móvil, revalidación tardía, revocación real, reloj retrasado, instalación exacta, fuente sin admisión, lectura final, retiro y continuidad del Task independiente. También se prueban atomicidad, generaciones/asignaciones/fronteras ajenas, exclusión simétrica12/24, llegada cero y cancelación. Se extrae sin cambiar su lógica la fixture Farm23 de control para compartir el log/clock genuinos entre los tests.

La primera ejecución nueva pasa16/18. Los dos fallos son expectativas del test: el wrapper de una llegada cero devuelve `blocked`, y una lease nueva no se puede crear entre revocación e instalación. Se corrigen esas expectativas; no se relaja la implementación para satisfacerlas. Los 33 casos de control anteriores ya pasaban antes de estas correcciones.

Un loader ESM de sólo lectura elimina únicamente la comprobación de familia/fuente admitida durante la instalación. La prueba con un Farm24 real retaggeado como Idle12 falla porque el controlador lo acepta indebidamente. El árbol y los WASM permanecen intactos; ese fallo intencionado se separa de la regresión final. Se congelan 366 entradas de validación y se verifican los 64 inputs/artefactos nativos sin recompilación. Se preservan los 16 archivos locales ajenos y el worker pthread sin seguimiento.

Las instalaciones de las fixtures son llamadas confiadas de autoridad sobre log/ABI reales; no prueban una preparación gráfica ni un recibo GPU. No se anuncia Farm24 en el draw Worker ni se abre el tick/productor ordinario. No hay hardware nuevo. Permanecen los huecos de la evidencia histórica Farm23 y la validación integral de reutilización de 3.123 recursos.

Continúan la admisión de fuente24 sobre el transactor existente, publicación/ambos puertos/cliente/Host/reloj/picking/Surface/actor original, hardware y relevo nativo Task/Home desde Farm retenido. Después siguen los finales Idle/Task/Home, cohort y mecánicas restantes, productor integral, guardado UI y continuidad A/A6/B/C sin alterar la prioridad Task original de `arriving`.
