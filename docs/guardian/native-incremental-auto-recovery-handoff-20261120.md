# Traspaso a Sol — recuperación incremental automática

Corrección de producción y sus 10 casos nuevos: `78aacb134` (`Drain retained preparation endpoints before automatic GPU recovery`), sobre `59c7d4a9c`. La ampliación del laboratorio y este recibo se entregan en el commit siguiente de la misma rama; el mensaje directo de entrega identifica ambos hashes y la sincronización remota.

La recuperación retenida existente ya podía conservar recursos; faltaba drenar el endpoint de preparación después de que el Worker entrara en fallo retenido. `markVisualLost` fallaba antes del rebind. La corrección separa `canFlush` de `isRunning`, conserva el endpoint original y no autoriza trabajo nuevo ni elimina la comprobación posterior de salud GPU.

Propiedad coordinada: dos módulos de producción (`native-resource-preparation-receiver.js`, `webgpu-world-worker.js`), pruebas de receptor/Worker y extensiones de los auditores existentes. Sin cambios en Surface, Host, main, cliente, Game, autoridad, WASM, Farm ni módulos Idle. Sol conserva su modificación posterior de picking/preparación en Surface.

Uso inmediato, con Node20, Playwright existente y Vite configurado como indica [el informe](native-incremental-auto-recovery-20261120.md):

- `QA_NATIVE_RETAINED_RECOVERY=obsolete` + `audit_webgpu_temporal_ground.mjs`: rechazo nativo real; upload 0→123, checkpoint/replay incremental, identidad y drenaje sobre propietarios originales.
- `QA_AUTOMATIC_RETAINED_RECOVERY=true` + `audit_main_retained_resources.mjs`: dos fallos tipados en el Worker real y dos recuperaciones automáticas completas desde main/autoridad. No llama al atajo manual de reattach.
- `QA_RETAINED_RECOVERY=fresh` + `audit_early_native_gpu_view.mjs`: control separado de pérdida real del dispositivo. Su resultado se registra aparte; no es aceptación incremental.
- `tests/native-resource-retained-flush.test.js` y `tests/webgpu-retained-worker.test.js`: negativo anterior y regresión del flush con fallo retenido, callbacks pendientes, cierre, propietarios perdidos e IDs antiguos. La selección reproducible de 118 pruebas está en el informe.

Demostrado: dos recuperaciones automáticas sin sustituir binding/canvas/cliente, 15.423 filas de recursos idénticas, cero fábricas/forks/compilaciones adicionales. El componente físico conserva 9 chunks, 175 nodos y 180 generaciones inmutables; prepara 80 recursos de demanda transitoria más el probe. No se confunde ese coste con reconstrucción de residentes. Build y 118 dirigidas pasan.

Se puede dejar de usar el contador histórico 3.123 como prueba de que toda recuperación reconstruye recursos: el comparador antiguo fuerza esa política (ahora 1.893), y no representaba el intento retenido actual de main. El nuevo negativo sí detecta el bloqueo automático que no aparecía al reconectar manualmente.

No se cierra ningún gate. La inyección tipada de main y la mutación nativa del componente son ensayos complementarios; mutación ordinaria con productor/cohort activo, cadencia y demás verticales requieren sus pruebas propias. Los pilotos inválidos y fallidos se conservan, no se sustituyen por resultados favorables.

**Pendiente para Sol:** el control de pérdida real del dispositivo falla antes y después con `Native resource flush unavailable` sobre un endpoint ya cerrado. Reproducción con `QA_RETAINED_RECOVERY=fresh`; recibos `incremental-20261120-device-loss-baseline.json.gz` y `incremental-20261120-device-loss.json.gz` en [la evidencia](performance/native-incremental-auto-recovery-20261120/validation.json). La autoridad/productor debe resolver el retiro terminal sin fingir un ACK de drenaje. No ampliar `canFlush` al propietario destruido. Sol confirmó recepción y seguimiento de este pendiente al reanudar Idle.

El test de timeout de continuación cargaba el Worker de producto con un doble de Surface que carecía de `rebindTimelineRecovery`. La prueba de retención incluye ahora esa capacidad explícita y una segunda prueba exige el cierre cuando falta. Se conservaron las aserciones de retención y se verificaron las 12 pruebas del archivo. El caso de pérdida real del dispositivo conserva su reproducción separada. [Pruebas de continuación](../../tests/native-frame-continuation.test.js).

Los 5.807 inputs y 15 archivos ajenos se comprobaron antes de liberar la ventana. La evidencia corresponde a esa instantánea; no atribuir estos resultados a ediciones posteriores de Idle. Main, Surface, Host y WASM permanecieron intactos durante la corrección medida.
