# Adquisición preparada de Farm23 en el transactor existente

Continúa la [asociación en control directo](e-r3-native-farm-arrival-route-control-20261117.md) según el [plan principal](integrated-gpu-migration-plan-20261104.md). La fuente ofrece `startNativeFarmArrivalAfterGpuQuiescence` mediante el transactor compartido: prepara, espera al consumidor, revalida y adquiere la asociación23 real. Se añade el contrato de recibo de esta familia; su emisión por el consumidor gráfico y liberación por publicación/Host aún están pendientes. Game/productor ordinarios y bootstrap activo siguen cerrados. A6/A/B/C permanecen abiertos; D no se inicia.

## Implementación de referencia y decisión

Antes de implementar se consulta el código real de wgpu v26.0.1: [`Queue::on_submitted_work_done`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/queue.rs#L1435) y [`LifetimeTracker::add_work_done_closure` / `triage_submissions`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L296). El callback se vincula a la última submission activa y los recursos/callbacks se retiran al alcanzar su índice completado; no basta con haber construido datos. Se conserva esa separación en el protocolo existente de Wild Guardians: un paquete retenido y su recibo exacto preceden al commit físico. No se copia el tracker de wgpu ni se añade otra cola, fence, autoridad o dependencia. Se registran los hashes de ambas implementaciones consultadas.

## Cambios

El perfil `farm-arrival` reutiliza `createNativeResourceAdmission` y la compatibilidad de programa/puertas Float32. Exige `nativeFarmArrivalVersion:1`, `preparedFarmArrivalTemplate`, frontera preparada y secuencia real del frame retenido. La asociación final debe provenir del propietario nativo y coincidir con la referencia preparada, la revalidada y la asignación emitida. No se predice una secuencia ni se convierte una propuesta en permiso.

La entrada del bridge exige una petición vinculada real, trabajador `arriving`, centro/contrato y pose/fases/presupuesto exactos, sin Task/caja/Idle/ruta JS. Vuelve a contrastar esa fuente en retención, revalidación y commit. El adaptador es delgado: usa el mismo slot de propuesta y cancelación, transactor de recursos, frontera y publicación existentes. Tras el commit23 inicia el cacheado físico nativo y proyecta Game; el adaptador superior actualiza el mapa de posiciones ya existente. No modifica la asignación ordinaria de tareas.

La urgencia es un booleano explícito de esta API optativa y utiliza la política de velocidad/presupuesto de la propuesta nativa. Su selección en el productor ordinario según la semántica de Game sigue pendiente. No se habilita el cohort para ocultar los relevos de Task/Home/Idle que aún faltan.

El recibo de otra familia, versión/plantilla/frame ausentes, paquete incompleto, fuente alterada o cancelación impiden el commit. Una tarea genuina asignada durante la preparación consume la llegada pendiente como antes; la propuesta23 queda obsoleta y el cuerpo se conserva para Task14. Si el commit físico ya ocurrió y falla la retención posterior, el resultado informa `committed-control-failed` y cierra la fuente: no afirma haber deshecho un cambio físico.

## Validación y continuación

La [evidencia](performance/native-farm-arrival-route-admission-validation-20261117.json) contiene los resultados finales, selección y hashes. Las 18 pruebas nuevas usan ambos módulos nativos y el transactor real: cuatro perfiles caminando/corriendo, tiempo que avanza durante preparación/drain con compañero Task, recibos incompletos, otra familia, cambios semánticos y cancelación, tarea genuina concurrente, llegada cero, fallo posterior al commit y pthread. Los paquetes preparados y acuses de drain son dobles explícitos de prueba; no se presentan como recibos GPU reales ni aceptación gráfica de Farm23.

Un loader ESM de sólo lectura omite exclusivamente la comprobación de versión23 del perfil. La prueba detecta `committed` en vez de `invalid-receipt`, sin modificar el árbol ni los WASM. Las pruebas filtradas de ese control negativo no cuentan como fallos de la regresión final.

Los 64 inputs/artefactos nativos permanecen exactos. Se ejecutan la regresión compartida y el build, sin recompilar C++ ni repetir hardware por este adaptador de fuente. No cambian roster, Surface, puertos, Host o programas GPU. Los resultados históricos de la vertical previa —569 IDs conservados, 30 recursos tardíos y máximo global de 66,72 ms— siguen limitados a esa vertical. Farm23 y la recuperación incremental integral de 3.123 aún carecen de aceptación GPU.

Se continúa con la emisión y liberación de este recibo mediante publicación, puertos de recursos y consumidor original de roster/Surface/Host. Después deben completarse parada durante movimiento, finales hacia Idle/Task/Home, alternativas de entrada del cohort, contratos/puertas/raid, productor integral, guardado UI y continuidad/recovery. La autoridad ordinaria no activa Farm23 mientras esos relevos no estén preparados.
