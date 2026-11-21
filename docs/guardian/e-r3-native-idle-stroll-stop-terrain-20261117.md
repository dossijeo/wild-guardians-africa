# Template de parada móvil en el canal de terreno existente

Continúa la [identidad en el canal directo](e-r3-native-idle-stroll-stop-publication-20261117.md). El canal de terreno conserva ahora la referencia tipada de parada12 junto a los efectos copiados que ya transportaba. Este incremento no habilita un commit revalidado ni el muestreo GPU final. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Fuente consultada y decisión

Se contrasta de nuevo [`prepare_assets`, Bevy v0.17.2](https://github.com/bevyengine/bevy/blob/v0.17.2/crates/bevy_render/src/render_asset.rs): el trabajo aplazado conserva su versión, comprueba actualizaciones/retiradas y contabiliza bytes con el limitador existente antes de seguir preparando. Se adapta ese patrón al único slot especulativo de nuestro canal de terreno: identidad exacta y cargo de metadatos en la reserva existente. No se introduce otro preparador, cola, presupuesto ni dependencia.

## Transporte y límites de adquisición

El productor sólo acepta `nativeStop` si la propuesta tipada12, sus propietarios, poses y frontera coinciden. Envía `nativeIdleStrollStopTemplate` junto a los efectos copiados y añade `estimateRetainedBytes` de la referencia al cargo existente. El receptor reconstruye y valida el mismo sobre contra los efectos recibidos; rechaza geometría, propietarios sustituidos y un cargo de bytes que no coincida antes de entrar al preparador gráfico.

El preparador recibe el template inmutable. Debe devolver `preparedIdleStrollStopTemplate` y una frontera de comandos preparados exactos. El ACK conserva ambos y el productor los contrasta antes de exponer su handle. Una respuesta genérica sin template no puede sustituir esa preparación. Cancelación y errores liberan el mismo slot y el handle retenido.

El commit del canal sigue exigiendo su frontera exacta. Una revalidación temporal no puede eludir esa condición ni declarar preparada la pose anterior. Surface rechaza explícitamente la nueva familia tipada hasta incorporar su consumidor final. La ruta anterior sin template sigue disponible con sus límites existentes; no se anuncia capacidad nueva.

## Validación y continuación

Las [evidencias](performance/native-idle-stroll-stop-terrain-validation-20261117.json) recogen comandos y entradas. Los 15 casos nuevos usan fuente12 real y ambos puertos del canal de terreno en los cuatro perfiles, standalone/pthread. El handle gráfico es un doble determinista: no representa evidencia de GPU ni del commit diferido.

La preparación permite avanzar al cuerpo sin conceder suspensión. Se comprueban identidad devuelta, reserva, copias de los buffers y liberación al cancelar. Propietarios, familia, bytes o ACKs alterados se rechazan; un commit con el tiempo revalidado sigue rechazado hasta conectar el mecanismo final.

Pasan **571 pruebas en 42 archivos, 190.634,6435 ms**, incluidos los contratos de terreno, puertos, adquisición y Host afectados. El build pasa en **49,87 s**. Se verifican las 140 entradas probadas, los 61 hashes nativos sin recompilar y los 16 archivos ajenos protegidos; el helper pthread sigue sin seguimiento y byte a byte intacto.

La aceptación NVIDIA/Turing de `db962b49c` permanece identificada como evidencia anterior, con autoridad retenida durante preparación. No se presenta como una nueva ejecución ni como validación de esta familia tipada.

Continúa el transactor con el template y recibo ya transportados, y el consumidor de pose/fases/picking final en roster/motores/Host con autoridad continua. Después sigue Home desde el cuerpo suspendido. Tarea durante paseo, restauración móvil, cohorte/productor ordinarios y recuperación incremental integral de 3.123 recursos siguen pendientes. No se inicia D.
