# Control Farm23 terminada → Idle21

Continúa la [fuente Idle nativa](native-farm-arrived-idle-cycle-source-20261118.md) del [plan integrado](integrated-gpu-migration-plan-20261104.md). El controlador admite preparar Idle21 desde el Farm23 realmente instalado y transfiere el permiso al programa nuevo sólo tras su adquisición e instalación exactas. No hay20/24 ni fuente Idle ficticia. Actor/roster, puertos, Surface y GPU del nuevo relevo siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Referencias y decisión

Antes de implementar se consulta el código real de [`RawId::zip/unzip` e `Id<T>` de wgpu26.0.1](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/id.rs#L42) y [`LifetimeTracker::triage_submissions`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L296). El primero vincula índice/época al contexto del recurso; el segundo conserva referencias hasta retirar las submissions completadas. Se adapta esa separación usando los registros y pruebas actuales: cerrar un permiso no reconstruye ni libera prematuramente los recursos residentes. No se añade propietario, registro, timer, fence ni dependencia.

## Admisión, transferencia y cierre

El primer ciclo con `native-farm-arrival-idle-source` exige la prueba Farm instalada y su registro vigente. Contrasta cuerpo, perfil, perfil del trabajador, centro, flags, radio, posición final, época/sesión, asignación y final REAL. La revocación debe corresponder al handle actual. La preparación conserva el mismo registro Farm y su permiso durante espera, cancelación de la propuesta y revalidación; no alarga su ejecución física ni concede movimiento Idle.

El `RouteCompleted`7 real con Idle21 se acepta como el relevo tipado del corredor. Cierra Farm inmediatamente y fija `safeUntil` del registro revocado en su final nativo finito, también si la referencia gráfica original fue preparada antes de una adquisición tardía. Idle sigue sin permiso de dibujo hasta instalar su asociación exacta bajo el watermark causal. Se reutilizan `issued`, `proofLeaseCurrent` y la instalación atómica existentes.

Las fases y el nacimiento semántico pertenecen al nativo. El controlador no recalcula trayectorias para contrastar fases: la asociación completa emitida debe coincidir al instalar. Alterar yaw en un hecho de control impide instalar la asociación nativa real y no habilita el candidato preparado. `bootstrap` histórico permanece rechazado. Sin instalación del Farm padre, el contrato Idle existente rechaza preparación y adquisición; el log nativo por sí solo no concede permisos gráficos retrospectivos.

Las pruebas descubren además que la cancelación nativa5 de un Farm activo quedaba rechazada por el guard de ciclo de vida. Se admite ahora únicamente `RouteInvalidated`5 con su revocación exacta y sin otra familia. Cierra el actor sin conceder otro propietario; el límite del registro es el menor entre el instante de cancelación y el final físico anterior. Esto cubre retiro/removal tanto en movimiento como durante preparación Idle, manteniendo separada la liberación gráfica diferida.

## Validación y alcance

Pasan25 casos nuevos y136 dirigidos en8 archivos: cuatro perfiles standalone/pthread, llegada con viaje o ya dentro del radio; espera1.8s, cancelación/revalidación y adquisición tardía; watermark pendiente, identidad/metadata incompatible sin avance de cursor, instalación atómica, bootstrap rechazado, mismatch de fase nativa y cierre por retiro/removal/dispose. La regresión final pasa2779/2780 casos en252 archivos, con cero fallos/cancelaciones y una omisión opcional, en401.306s. Build de producto pasa en1m35s. Los414 inputs finales y64 inputs/artefactos nativos coinciden; no hay rebuild WASM.

La primera regresión encontró dos expectativas anteriores que clasificaban cualquier cancelación5 como inválida. Se mantienen todos los rechazos de suspensión/adquisición incorrectas y se añaden cancelaciones reales del motor para llegada de distancia cero y para una parada preparada cancelada antes del retiro. No se excluye ninguna prueba nueva fallida: la regresión completa se repite y pasa sobre esas expectativas corregidas. Los únicos cambios después del build son esos dos archivos de pruebas; el runtime no cambia.

Los cuatro controles negativos de sólo lectura fallan una vez, con24 casos filtrados y cero cancelaciones. El módulo de `15e1146ff` rechaza el nuevo origen. Eliminar únicamente la comparación de cuerpo acepta otro cuerpo; quitar la cota terminal ensancha el registro antiguo; quitar la aceptación de cancelación deja vigente el permiso. Ningún control modifica archivos de producto.

Los tests ejercitan WASM standalone/pthread, journal, reloj y controlador reales, con instalaciones de pruebas de confianza. No acreditan un paquete gráfico retenido, recibo, drain ni hardware del nuevo Idle. No se atribuye a este controlador la regresión GPU del commit de fuente anterior.

La sonda siguiente usa modelo, bancos y terreno originales, conserva una sola adquisición del actor y obtiene21 nativo; el roster responde `Native initial Idle body has no matching pending worker`. Hay que reconocer el extremo Farm sin modificar anticipadamente el estado Game ni fabricar un cuerpo inicial. Siguen aproximación Idle fuera del ancla, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación de cadencia/plataforma. La evidencia desfavorable Home264/147ms conserva su alcance; no se declara ausencia de tirones.

Los [resultados y hashes](performance/native-farm-arrived-idle-cycle-control-validation-20261118.json) identifican los inputs finales. Se conservan16 archivos ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales.
