# Hierba WebGPU: límites temporales y de recuperación

La ruta de hierba de sabana y gran río solo se crea con `!temporal`, en desarrollo y con activación explícita. Esta restricción es necesaria: el propietario actual no participa en las transacciones temporales ni en la restauración de checkpoints. Esta nota identifica el trabajo pendiente; no habilita la hierba ni acredita una prueba integrada.

## Carrera al restaurar

`restoreTimelineCheckpoint()` en `temporal-surface-recovery.js` ejecuta `prepared.commit()` antes de esperar `onCheckpoint()`, que restaura las demás partes del estado de presentación. El commit de terreno y bioma llama sincrónicamente a sus notificaciones de publicación. Si se quitara el gate, `residency.onPublished` llamaría a `grassOwner.syncChunk()` y el propietario generaría candidatos con el índice de obstáculos que tenía antes de la restauración. La admisión se despacha en una microtarea y puede terminar mientras `onCheckpoint()` sigue pendiente: mostraría una combinación de terreno nuevo y ocupaciones antiguas. El checkpoint prepara terreno y bioma, no hierba, y no existe una garantía de transacción atómica para esta última.

En los límites normales del flujo temporal, el estado se confirma antes de `terrain.confirm()`, pero el índice del propietario solo se actualiza después, en `onConfirmed`. El callback de terreno puede generar candidatos con el índice anterior. La cancelación posterior normalmente ocurre antes de la microtarea, pero esa secuencia no protege una restauración asíncrona ni constituye por sí sola un contrato para todas las rutas. Los cambios de poblados, cultivos, agua y ocupaciones deben invalidar tanto los candidatos pendientes como la cobertura visible pertinente.

## Evolución conservadora

1. Mantener el gate mientras no se implementen y prueben las garantías siguientes. Antes de restaurar o reproducir, suspender el propietario, ocultar la cobertura afectada y cancelar admisiones; las respuestas tardías no deben publicar en el nuevo propietario.
2. Mientras dure la reproducción del diario no generar cobertura a partir de callbacks parciales. Al terminar `finishTimelineRecovery()`, reconstruir primero el índice de ocupaciones desde el estado confirmado recuperado y después enumerar el terreno visible con `residency.forEachVisibleGround`, usando sus revisiones y epoch confirmados. Si la recuperación falla o se cancela, mantener la hierba retirada y liberar candidatos y leases.
3. Para límites ordinarios, agrupar las invalidaciones de terreno y ocupaciones y generar únicamente después de confirmar la frontera. Cada candidato debe capturar un token de ocupación y el `epoch`/revisión del terreno; antes de publicar debe comparar con `residency.revisionAt()` y rechazar resultados obsoletos. Una ausencia de correspondencia conserva la cobertura retirada, sin modificar simulación. También deben invalidarse los chunks vecinos cuyos bordes de agua dependan del cambiado.
4. Para animación, determinar explícitamente qué reloj de simulación confirmado o histórico gobierna el viento durante pausas y reproducción de intervalos; no adelantar el tiempo ni usar reloj real. Si la cobertura debe estar presente atómicamente al presentar la frontera, incorporar un participante a `prepareWebGpuTemporalTerrain` y al coordinador, incluyendo abort, rollback y recuperación, en lugar de asumir que una admisión posterior cumple ese requisito.

## Comprobaciones necesarias

- Retrasar `onCheckpoint` después del commit; comprobar que no aparecen candidatos preparados con el estado anterior y que `finishTimelineRecovery` usa solo el estado y terreno restaurados.
- Retener la admisión mientras se aplican dos revisiones de terreno, un cambio de epoch y cambios de cultivos/edificios; verificar que ningún resultado antiguo reaparece y que agua y vecinos se reconstruyen de forma coherente.
- Forzar rechazo, cancelación, fallo de replay y cierre durante preparación; verificar liberación de recursos y ausencia de cobertura parcialmente recuperada.
- Verificar ausencia de avance de viento durante pausa y orden del tiempo de simulación con velocidad y reproducción histórica.
- Ampliar los controles existentes de `webgpu-temporal-terrain`, `webgpu-terrain-residency`, `terrain-history-receiver`, `temporal-surface-recovery` y `confirmed-presentation-stream`. Una prueba con dobles comprueba el contrato; sigue haciendo falta una partida WebGPU real para acreditar aspecto y continuidad.
