# Control directo Farm23 terminada → Task6/14

Continúa la [fuente nativa](native-farm-arrived-task-source-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). El controlador conserva el permiso finito de los datos23 ya admitidos mientras la misma instancia corporal espera14. La fuente nativa y el protocolo TaskStart existentes se reutilizan. Actor/roster/Surface/hardware del relevo terminal siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Referencias y decisión

Se reconsulta el código real de [`RawId::zip/unzip` e `Id<T>` de wgpu26.0.1](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/id.rs#L45) y [`ActiveSubmission`/`LifetimeTracker::triage_submissions`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L273). Se mantienen familia/generación y la asociación de una versión residente, con retirada ligada al envío existente. Se adapta ese patrón al registro revocado actual: identidad nativa y prueba gráfica instalada se comprueban por separado, conservando el límite temporal original. No se añade registro, dependencia, fence ni evaluador de trayectorias/poses.

## Registro y permiso finitos

El evento debe ser `RouteInvalidated`6, con solicitud Task auténtica, handle23 revocado exacto y tiempo igual o posterior al final atestiguado. Mezclar otra familia, omitir la revocación o adelantar el final no modifica secuencia/propietario. El controlador reutiliza `actor.revoked`, fija su `safeUntil` al final real de23 y conserva la prueba gráfica que ya estaba instalada. El permiso tipado devuelve el mismo registro, época y final reales; no reabre la ruta genérica ni prolonga el motor más allá de ese final. Exige el watermark causal de la solicitud6.

Las consultas reutilizan referencias existentes y verificaciones constantes, sin nuevos objetos por fotograma. Los getters y la consulta de época de puerta reconocen ese registro retenido. La asignación14 guarda la asociación Farm anterior en su registro de tarea: tanto preparar como instalar14 rechazan otro cuerpo. La adquisición14 cierra el permiso23; sólo su asociación instalada habilita el movimiento nuevo. Cancelación/invalidation, retirada, removal y dispose también lo cierran.

Una fuente23 nativa sin instalación gráfica puede avanzar a la declaración6 y preparar14 nueva para su mismo cuerpo. No obtiene permiso para dibujar los datos23 antiguos, ni puede instalarlos retrospectivamente. Esto conserva la separación entre observar el log nativo y disponer de recursos residentes.

## Validación y alcance

Los20 casos principales cubren cuatro perfiles standalone/pthread, llegada con viaje o ya dentro del radio, cota/época/cuerpo exactos, revalidación tardía/cancelación/repreparación/adquisición, cuerpo extraño, reloj pendiente, metadatos falsos, instalación gráfica ausente y retirada/removal/dispose. Pasan37 del primer grupo ampliado con la regresión Farm24 y296 dirigidos totales. Un caso suplementario pasa con una referencia preparada23 cuyo origen precede a su adquisición: el final y la época conservados son los reales de la adquisición, incluso durante6.

Pasan2.580/2.581 de la selección amplia de244 archivos, con una comparación opcional omitida. El caso suplementario es de otro archivo y se ejecuta por separado: agregado único2.581/2.582 en245 archivos. No es una sola ejecución con2.581 aprobados. El fichero suplementario se añade después de iniciar la selección amplia; sus399 inputs anteriores permanecen exactos y no cambia producción. Build pasa en2m7s.

Los controles negativos de lectura fallan una vez cada uno, con19 casos filtrados y cero cancelaciones. El controlador anterior deja el registro sin incorporar la revocación terminal y su cota sigueInfinity; el motor previo ya tenía su propio final finito. El segundo control elimina sólo la comprobación de cuerpo al preparar14 y acepta indebidamente body3 en lugar de1.

La [evidencia](performance/native-farm-arrived-task-control-validation-20261118.json) congela400 inputs finales y64 fuentes/artefactos nativos idénticos a `ba114da0c`, sin recompilar. No hay GPU nueva: el dibujo, el frame retenido y su drain no se acreditan con estas instalaciones de prueba. La evidencia hardware de `ba114da0c` corresponde al controlador anterior. Se preservan16 archivos locales ajenos, worker pthread sin seguimiento y bytes previos de los cuatro documentos principales. Permanecen los siete fallos históricos fuera de selección. Siguen pendientes el consumidor terminal completo, Home/Idle, productor/cohort, recuperación y reutilización integral de3.123 recursos, además del seguimiento causal de continuidad/plataforma. Ningún padre A6/A/B/C se cierra.
