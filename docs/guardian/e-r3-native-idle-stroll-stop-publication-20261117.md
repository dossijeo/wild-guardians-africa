# Identidad de parada móvil en el canal directo

Continúa el [control de adquisición de la parada](e-r3-native-idle-stroll-stop-control-20261117.md). El puerto de autoridad existente transporta ahora su template preparado, versión de recibo y atestación final. El transactor y el consumidor gráfico todavía no producen este recorrido. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Referencias consultadas y decisión

Se vuelve a leer [`prepare_assets`, Bevy v0.17.2](https://github.com/bevyengine/bevy/blob/v0.17.2/crates/bevy_render/src/render_asset.rs): al procesar trabajo aplazado descarta la versión anterior si el ID fue actualizado o retirado. Se conserva la identidad preparada en el hold existente y se exige su igualdad en el recibo y la atestación sucesora; otra familia o un template sustituido no sirven para liberar esa preparación. No se añade otro hold, cola ni registro.

Se contrasta [`Queue::write_buffer` y `PendingWrites::pre_submit`, wgpu v26.0.1](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/queue.rs): las escrituras pendientes se incorporan al envío y retienen los temporales necesarios. Sigue siendo referencia para integrar después los parámetros finales del cuerpo en el Host. **Este incremento no implementa ese refresco ni deduce que una pose anterior esté preparada.** No hay dependencias nuevas.

## Contrato del mismo puerto

`quiesceGpuForMutation` acepta `preparedIdleStrollStopTemplate` con su frontera y propietarios ya emitidos. Es exclusivo respecto a los otros templates. El tiempo preparado puede ser anterior al reloj actual, pero no puede pertenecer a otra frontera o asignación futura.

El ACK debe devolver `nativeIdleStrollStopVersion: 1`, el template exacto y el ID del frame preparado, además de la identidad causal habitual. Un recibo de paseo22, una versión incorrecta o un frame ausente cierran la conexión sin conceder un recibo de parada.

`releaseGpuAfterMutation` valida `nativeStrollStops` como una única atestación, referida a la frontera final publicada y al template retenido. No permite omitirla, sustituirla por cuerpos capturados ni mezclar propietarios de otras familias. Un rechazo no consume el hold; el recibo válido sólo se utiliza una vez. Cancelar no publica propiedad de cuerpo.

El Host rechaza explícitamente los templates/atestaciones de esta familia hasta conectar el programa de pose final. El mensaje no puede ser ignorado ni reconocido como si fuera el antiguo paquete de suspensión. No se anuncia una capacidad gráfica nueva.

## Validación y continuación

Las [evidencias](performance/native-idle-stroll-stop-publication-validation-20261117.json) identifican pruebas, entradas y build. Los 16 casos nuevos usan fuentes nativas y canales reales para los cuatro perfiles en standalone/pthread; el recibo de drenaje y frame es un doble determinista, no evidencia GPU. La preparación precede al avance; el drenaje permite otro avance, la fuente revalida y el canal entrega la atestación final al control existente.

Se comprueban sustituciones, omisiones, duplicados, frontera ajena, propietario futuro, cancelación y recibo de un solo uso. Otro caso ejercita el Host de producción con dispositivo simulado e inyecta el campo todavía no admitido: debe rechazarlo sin enviar comandos.

Pasan **556 pruebas en 41 archivos, 183.075,0059 ms**, incluyendo los controles afectados y el Host completo simulado. El build pasa en **45,43 s**. Se verifican 136 entradas probadas, los 61 hashes nativos sin recompilar y los 16 archivos ajenos protegidos; el helper pthread sigue sin seguimiento y byte a byte intacto.

La aceptación NVIDIA/Turing del commit anterior se mantiene identificada como tal; no se repite ni se presenta como evidencia nueva del recorrido diferido. Su autoridad permanecía retenida durante preparación.

Sigue el template/recibo en el transactor y canal de terreno y el muestreo final de pose, fases y picking en roster/motores/Host con autoridad continua. Después continúa Home desde el cuerpo suspendido. Tarea durante paseo, restauración móvil, cohorte/productor ordinarios y recuperación incremental integral de 3.123 recursos siguen pendientes. No se inicia D.
