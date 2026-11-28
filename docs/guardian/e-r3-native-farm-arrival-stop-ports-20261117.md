# Farm24 en los canales originales de preparación

Continúa la [admisión y publicación de control Farm24](e-r3-native-farm-arrival-stop-admission-20261117.md), según el [plan principal](integrated-gpu-migration-plan-20261104.md). Los protocolos originales de recursos nativos y propuestas de terreno conservan ahora la plantilla24 y su asociación final. Se usa la preparación genérica existente, sin otro tipo de comando o canal. El consumidor gráfico24, Surface/Host/reloj/picking y los relevos Task/Home siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Referencia y adaptación

Antes de implementar se inspecciona el código real de [wgpu v26.0.1, `LifetimeTracker::track_submission` y `triage_submissions`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L210): retiene recursos asociados a una submission y sólo retira los correspondientes al trabajo completado. También se contrasta la identidad de índice/época en [`RawId` e `Id<T>`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/id.rs#L83). Se adapta la separación entre identidad, familia y vida retenida sobre los slots/protocolos existentes. La reserva de bytes sigue siendo el cálculo que Wild Guardians ya usa para Idle12; no se atribuye a wgpu un algoritmo de presupuesto ni se añade dependencia, cola o propietario.

## Terreno y reserva

Dos descripciones inmutables seleccionan el codec y los nombres de plantilla/recibo de Idle12 o Farm24. No guardan actores ni recursos. La propuesta de terreno admite24 como clase explícita y sigue excluyendo13–23. Exige plantilla24 tipada, efectos de cuerpos y cero geometría; no publica chunks para detener el trabajador.

La reserva conserva el preview copiado, la referencia y la asociación final con proyección, usando el codec de la familia correcta. El receptor recalcula esos bytes antes de preparar y limita la asociación adquirida a la reserva retenida. La revalidación temporal puede cambiar valores, pero no su forma ni el conjunto de propietarios reservado.

Propuesta, READY ACK y commit mantienen la identidad de familia. No admiten una plantilla Idle adicional, una referencia ajena ni la actualización de una preparación sin tipo. El commit exige asociación con proyección, referencia preparada y frontera adquirida exactas. El receptor conserva esa frontera separada de la original y entrega el binding al handle retenido cuando llega el siguiente batch confirmado, sin preparar de nuevo.

## Ambos accesos al preparador nativo

El cliente compartido detecta una propuesta24 tipada en `prepareNativeGateResources`, valida su referencia antes de enviarla y exige su plantilla en el recibo. La conexión directa conserva ese getter sobre el mismo proxy; el receptor común transporta los campos12/24 y rechaza intentos de envolver una parada en otra clase o refrescarla con comandos de otro recurso. No se añade un método específico ni otro protocolo de refresh.

El commit del proxy exige la asociación adquirida con proyección y su frontera exacta antes de enviar el comando. Los recibos que mezclan plantillas12/24 se rechazan. La ruta genérica anterior sin plantilla y los recursos diferidos de otras familias conservan su comportamiento. No se añade permiso de movimiento ni se abre el tick/productor de Farm.

## Evidencia y límites

La [evidencia](performance/native-farm-arrival-stop-ports-validation-20261117.json) recoge 21 casos nuevos y 96 dirigidos. Los cuatro perfiles pasan por el cliente/receptor ordinario compartido y la conexión directa; pthread usa el mismo recorrido. Son reales la fuente Farm23→24, Task14 independiente, log, publicador de control, MessageChannels de recursos/terreno y adopción del batch confirmado. El acceso ordinario usa el protocolo compartido, no un draw Worker real. El handle gráfico, el drain y la secuencia de frame son dobles; no prueban ejecución GPU24.

Se comprueban una sola preparación, copias de efectos sin alias, conservación de plantilla/fronteras, presupuesto para el binding final, adopción diferida sin repreparar y continuidad física del Task independiente. Los casos negativos cubren plantillas ausentes/ajenas/mezcladas en las tres capas, comandos de otra clase, commit sin asociación, movimiento13–23 disfrazado, geometría indebida, presupuesto declarado de menos y cancelación entre canales.

Los primeros ocho fallos nuevos pertenecían a la fixture: un spread copiaba el valor de su getter antes de preparar. Se conserva el getter vivo y se espera el estado `armed` por su canal real. La ampliación posterior detecta una expectativa demasiado precisa para el rechazo de un ID reutilizado entre dos mensajes; se aceptan los dos rechazos válidos antes de probar el ID siguiente. No se relajan comprobaciones de producto para resolver esos tests.

El control negativo elimina sólo la igualdad de bytes del receptor mediante un loader ESM de lectura. La propuesta24 declara un byte menos y pasa indebidamente hasta el commit; la prueba falla. Se preservan el árbol y los WASM. Ese resultado intencionado queda fuera de la regresión final.

Se congelan 369 entradas de validación y se verifican 64 inputs/artefactos nativos sin recompilar. Se preservan los 16 archivos locales ajenos y el worker pthread sin seguimiento. No hay hardware nuevo ni capacidad24 anunciada en el draw Worker. Los huecos históricos de Farm23 y la recuperación incremental integral de los 3.123 recursos siguen abiertos.

Continúan cliente/Host/Surface, reloj/picking y actor original para24, validación hardware y los relevos nativos Task/Home desde Farm retenido. Siguen los finales Idle/Task/Home, cohort y mecánicas restantes, productor integral, guardado UI y continuidad A/A6/B/C, manteniendo la prioridad Task original de `arriving`.
