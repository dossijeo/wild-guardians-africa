# Idle inicial: petición pendiente en el control gráfico existente

Continúa [la espera de Game en el reloj común](e-r3-native-initial-idle-clock-20261116.md). Los eventos y el baseline transportan ahora la petición inicial vinculada a su cuerpo hasta el host gráfico. Es información pendiente, sin permiso de movimiento, dibujo o instalación de una animación ejecutable. La admisión gráfica inicial y la política completa Idle/Alert/paseo siguen abiertas.

## Referencia consultada antes del diseño

Se revisó el [código real de Dawn, `ObjectStorage.h`, revisión `922930e`](https://github.com/google/dawn/blob/922930e3193753e58591f14a96ab116e5d630964/src/dawn/wire/server/ObjectStorage.h#L42-L255): separa `Reserved` de `Allocated`, restringe `GetNativeHandle` a objetos asignados y exige estado reservado y generación coincidente en `FillReservationImpl`. Se adapta esa separación entre datos pendientes y objetos utilizables mediante el contexto de actor y las pruebas de admisión que Wild Guardians ya tiene. No se añade un registro, cola, motor o dependencia.

## Cambio

- El baseline añade `pendingInitialIdleRequests` con las referencias actuales que ya tienen cuerpo. `initialIdleRequest` aparece en un evento de espera sólo si su secuencia coincide exactamente con la petición nativa actual. Una declaración todavía sin cuerpo no expone una fuente física; su primer vínculo produce el nuevo evento previsto por el protocolo.
- El mismo contexto de actor conserva la referencia inmutable y la vincula a época, sesión, secuencia y watermark causal. Su getter de metadatos devuelve `null` antes del reloj correspondiente, después de sustituir la intención o al cerrar. No crea una ruta, prueba ejecutable o capacidad gráfica nueva.
- El control rechaza identidades y tiempos alterados, duplicados, colisiones con otras clases y un nacimiento inicial que pretenda sustituir un propietario anterior. Conserva también la identidad semántica de tarea/objetivo en el mismo contexto para impedir ese reemplazo sobre una espera de tarea.
- El relevo a Home comprueba una vez la identidad del cuerpo, flags, perfil, pose, fases y presupuesto contra la petición inicial retenida. La tarea genuina y Home consumen los metadatos anteriores mediante el log existente. No se repite esa comparación ni se serializan pruebas por dibujo.
- El host valida y transmite el nuevo campo al mismo control. Se mantienen las guardas históricas de bootstrap y la admisión preparada de las otras clases. El productor ordinario y la capacidad de ejecutar Idle inicial no se activan.

## Validación

Pasan los 11 casos dirigidos con WASM real, el control real y puertos de recursos/control reales con GPU simulada. Ejercitan Idle sin inicializar, descanso y vigilancia; nacimiento sin cuerpo y vínculo posterior; watermark; datos y clases alterados; cuerpo exacto al pasar a Home; tarea real y revocación; cierre; y relevo preparado a Home sobre el mismo cuerpo. Los baselines remotos duplicados o de otra sesión son rechazados por el host antes de enviar trabajo a la GPU.

Un cargador de lectura que elimina únicamente el campo nuevo del host hace fallar la prueba negativa remota: el receptor ignora entonces la información que debería validar. Es un contrajemplo específico del cableado; no modifica archivos del producto. La primera versión de esa prueba esperaba recibir el mensaje del host en el emisor, cuyo bootstrap existente termina por timeout. La prueba final comprueba el error concreto del host, el rechazo de bootstrap y cero envíos GPU; no se cambió esa política de transporte para satisfacerla.

Pasan 11/11 casos dirigidos (6.758,9346 ms) y 777/777 de regresión compartida en 71 archivos (437.264,3865 ms). La compilación y hashes se registran en [el resultado de validación](performance/native-initial-idle-control-validation-20261116.json). Los módulos nativos se reutilizan sin cambios del incremento anterior. Esta comprobación de protocolo no constituye aceptación de hardware de la animación Idle inicial.

La compilación de producto pasa en 47,74 s. Los nueve hashes de fuentes/módulos nativos y los 16 archivos previos protegidos permanecen idénticos por bytes. Este cambio de metadatos no crea geometrías, materiales, clips o recursos GPU.

## Siguiente punto

Faltan la admisión estacionaria inicial preparada sobre el actor residente y sus clips originales Idle/Alert, y la ejecución completa de los ciclos y paseo, con fases, anclas y RNG originales. Siguen abiertos otros finales y puertas, nacimiento físico preparado en una partida viva, productor ordinario, sustitución de mundo, recuperación incremental de los 3123 recursos sanos y aceptación A/B/C antes de D. Ningún cierre A6/A/B/C cambia por estos metadatos.
