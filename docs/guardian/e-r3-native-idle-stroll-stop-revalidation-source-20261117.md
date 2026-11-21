# Revalidación nativa de la parada móvil y su recibo de preparación

Continúa la [suspensión gráfica del paseo](e-r3-native-idle-stroll-stop-consumer-20261117.md). Aquella aceptación conserva recursos residentes, pero mantiene el reloj de autoridad durante la preparación. Este incremento añade la dependencia nativa necesaria para dejarlo avanzar: recalcular el cierre de parada en la frontera final y vincularla a la preparación original. La actualización/admisión GPU de esa pose nueva sigue pendiente. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Código consultado y adaptación

Se leyó [`prepare_assets` y la extracción de eventos, Bevy v0.17.2](https://github.com/bevyengine/bevy/blob/v0.17.2/crates/bevy_render/src/render_asset.rs). Una preparación aplazada se descarta si otra extracción ha actualizado o retirado ese ID. Se adapta su comprobación de vigencia antes de reutilizar recursos. No se adopta su retirada anticipada del recurso renderizado: Wild Guardians conserva la presentación anterior hasta admitir el relevo.

Se leyó también [`Queue::write_buffer` y `PendingWrites::pre_submit`, wgpu v26.0.1](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/queue.rs): las escrituras pendientes y sus recursos temporales se incorporan al envío conservando su vida útil. Es la referencia para actualizar después los parámetros del cuerpo mediante el Host existente; este incremento no afirma haber integrado esa actualización.

La implementación reutiliza el patrón de nuestras propuestas nativas de movimiento: conservar una fuente original acotada, limpiar la propuesta actual y volver a pasar por su preflight/stage en la autoridad. Reutiliza íntegramente `projectWorldRouteStops`; no incorpora dependencia, otro mundo, cuerpo, solver, reloj o registro de rutas.

## Frontera final y compatibilidad de propietarios

`spatial_world_proposal_revalidate_stop(session, ticket)` sólo acepta una propuesta de recursos de familia 12 vigente como candidata retenida. Comprueba sesión, hechos, intenciones, motores y revisiones del mundo. Los contadores de entidades y cuerpos cambian con los ticks de ejecución: se vuelve a probar su estado físico actual y la asociación 22 original en vez de confundir ese movimiento con una modificación de assets.

El mismo selector de sesión/actor/slot/generación/asignación debe identificar todavía al paseo activo. Su cuerpo debe coincidir con la pose ejecutada y admitir suspensión. Llegar mientras se prepara invalida esa fuente móvil; no se revive el paseo ni se inventa una fase REST. La revalidación vuelve a proyectar los cuerpos y motores afectados, emite un ticket nuevo y mantiene cero cambios de geometría con las mismas revisiones canónicas.

Sólo se conserva **una preparación original** con sus filas de cuerpos/motores, además de la proyección actual. Las revalidaciones sucesivas no forman una cadena de permisos. `nav_idle_stroll_stop_proposal_translation_ptr` devuelve ocho valores:

| Posición | Valor |
|---|---|
| 0 | Versión 1 |
| 1–2 | Ticket preparado original y ticket actual |
| 3–4 | Tiempo preparado original y tiempo actual |
| 5 | Igualdad del conjunto de propietarios y formas de recurso |
| 6–7 | Cantidad actual de cuerpos y motores |

Se comparan actor, asignación, slot, generación, cuerpo, clase de consecuencia y generación suspendida, además de ID/mecanismo de cada motor. **La igualdad de propietarios no significa igualdad de poses, de uniformes o de un frame preparado.** Las filas actuales contienen la pose ejecutada nueva y la apertura final de cada motor. El consumidor deberá actualizar sus datos y demostrar que retuvo el paquete correcto antes de autorizar el relevo.

## Commit ligado a la preparación

`spatial_world_proposal_stop_commit_bound` conserva el commit físico existente. Exige la frontera final exacta y el ticket de preparación. Acepta el original sólo si los propietarios siguen siendo compatibles; un ticket intermedio o ajeno no sustituye al original. Si el cierre cambió, sólo puede usarse una preparación completa de la propuesta actual.

El recibo `spatial_world_stop_binding_ptr` contiene cinco valores: versión 1, ticket/tiempo preparados y ticket/tiempo adquiridos. Se registra tras un commit nativo correcto en el propietario de la última publicación canónica del mundo, sin historial ni nuevo mapa. La siguiente publicación de movimiento lo sustituye. Es un hecho de la fuente que permitirá asociar preparación y suspensión final; por sí solo no es un permiso gráfico.

El snapshot exacto genérico y los commits de otras familias conservan sus criterios. Un snapshot temporal obsoleto sigue rechazándose. La entrada nueva revalida expresamente la candidata retenida; no convierte un ACK viejo en una frontera nueva.

## Evidencia y pendiente inmediato

Las pruebas específicas usan ABI y cuerpos reales; no simulan un recibo gráfico. Los cuatro perfiles, tanto standalone como pthread, avanzan al actor y a su compañero durante la preparación. Dos revalidaciones conservan el origen inicial y capturan la última pose sin mover cuerpos, consumir RNG, cambiar el estado Game ni publicar una asignación. El commit conserva cuerpo y slot, publica la frontera final sin geometría y registra el par de tickets nativo.

Un segundo Home genuino cruza la trayectoria futura: el cierre pasa de uno a dos cuerpos. El commit con la preparación original se rechaza sin detener a ninguno; la preparación actual puede cubrir ambos. Se comprueban además sesión/ticket ajenos, cambio de intención, llegada durante preparación, otra familia de mundo y avance posterior a la última revalidación.

Pasan **1.617 pruebas en 142 archivos, 800.715,2781 ms**, sin fallos, cancelaciones u omisiones; incluyen las 13 nuevas pruebas específicas (también verificadas por separado en 5.677,8948 ms). Ambos módulos se reconstruyen con los mismos 61 inputs de fuente/build/artefactos registrados y el helper pthread original se conserva sin seguimiento.

La regresión GPU existente se repite con los binarios recompilados: NVIDIA/Turing conserva 681 IDs residentes, prepara 68 recursos de protocolo, no crea shaders/pipelines y no asigna después de READY. El Host copia 120 uniformes (13.408 bytes) y 120 bindings, sin copiar buffers estáticos o texturas. Dibuja 54 frames durante el bloqueo de 1.800 ms, ambos actores pasan picking y el drain se confirma; se inspecciona la captura. **Esta regresión aún mantiene el reloj durante la preparación y no valida la nueva ruta GPU revalidada.** El build de producto pasa en 48,53 s.

Los comandos, hashes y resultados finales se recogen en [la evidencia de validación](performance/native-idle-stroll-stop-revalidation-source-validation-20261117.json). Falta integrar la referencia tipada y el recibo directo con los puertos, el refresco de uniformes del roster/motores y la admisión del Host manteniendo la autoridad en marcha. Después continúa el relevo Home desde la fuente suspendida ya implementada. Tarea durante paseo, restauración móvil, cohorte/productor ordinarios y recuperación incremental integral de los 3.123 recursos siguen pendientes; no se inicia D.
