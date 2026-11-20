# Recuperación incremental automática — 20 de noviembre de 2026

Subordinado a `MIGRATION-OBJECTIVE.md`, `A6-CHECKLIST.md` y al plan integrado. Este incremento no cierra A5, A6, e-R3 ni f-R4. Continúa las correcciones de recuperación retenida de Sol; no introduce otro propietario, caché, renderer, scheduler ni autoridad.

## Problema confirmado y corrección

Los **3.123 recursos** pertenecían al fallback histórico del laboratorio `audit_webgpu_temporal_ground.mjs`: su callback de recuperación creaba explícitamente otra Surface y otro consumidor. En HEAD `59c7d4a9c`, repetirlo da **1.893 recursos nuevos**. La infraestructura retenida ya existía y la reconexión manual de partida funcionaba; no se atribuye su implementación a este cambio.

Faltaba comprobar el recorrido automático desde un Worker que ya había fallado. Una inyección del error tipado `remote-frame-native-mutation-obsolete` en el `fail` real del Worker reprodujo el bloqueo: `markVisualLost` solicita quiescencia y flush a la autoridad, pero el receptor gráfico sólo aceptaba flush mientras `isRunning()`. Con `phase=failed`, aunque Surface y endpoint estaban retenidos, cerraba el endpoint con **Native resource flush unavailable or preparation pending**. La UI permanecía fallida y el dispatch bloqueado. El recibo negativo conserva la escena estable, el fallo y su estado final.

La corrección afecta únicamente a dos módulos de producción:

- `native-resource-preparation-receiver.js`: capacidad `canFlush`, cuyo valor por defecto sigue siendo `isRunning`. Sólo autoriza reconocer el drenaje del endpoint existente; preparación y admisión conservan sus condiciones originales.
- `webgpu-world-worker.js`: permite ese drenaje en `running` o en un fallo tipado retenido con Surface existente. El mensaje de flush del cliente también atraviesa exclusivamente esa excepción al guard terminal. No abre otros mensajes de trabajo en estado fallido.

El flush mantiene los guards de cierre, handle pendiente, ID monótono y flush concurrente. Espera los callbacks cancelados y vuelve a comprobar la capacidad al terminar. No certifica salud GPU: el rebind posterior sigue esperando el frame enviado, leyendo la salud del consumidor y comprobando recursos/puertos pendientes, generación, replay y frame nuevo. La pérdida de dispositivo y los fallos no retenibles siguen siendo terminales para ese propietario.

## Laboratorio reutilizable

Usar Node20 existente y un servidor Vite con el perfil Worker de producción. Coordinar una ventana sin build, profiler, otras pruebas GPU ni cambios de fuentes: Vite puede recargar la página al editar otro fixture.

```powershell
$env:PLAYWRIGHT_MODULE = 'C:/Users/Gabriel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:QA_BASE_URL = 'http://127.0.0.1:5218'

# Rechazo físico real y recuperación incremental sobre los propietarios originales.
$env:QA_NATIVE_RETAINED_RECOVERY = 'obsolete'
$env:QA_ARTIFACT_PREFIX = '.cache/incremental-component-new-run'
& .cache/tooling/node20.exe tools/experiments/audit_webgpu_temporal_ground.mjs

# Aplicación real: fallo tipado inyectado; recuperación, journal y handoff reales.
$env:QA_AUTOMATIC_RETAINED_RECOVERY = 'true'
$env:QA_ARTIFACT_PREFIX = '.cache/incremental-main-new-run'
& .cache/tooling/node20.exe tools/experiments/audit_main_retained_resources.mjs

# Control separado: pérdida real de dispositivo y sustitución necesaria.
$env:QA_RETAINED_RECOVERY = 'fresh'
$env:QA_ARTIFACT_PREFIX = '.cache/incremental-device-loss-new-run'
& .cache/tooling/node20.exe tools/experiments/audit_early_native_gpu_view.mjs

# Comparador histórico explícito: fuerza reconstrucción, no es aceptación incremental.
$env:QA_NATIVE_RETAINED_RECOVERY = 'false'
$env:QA_NATIVE_REPLAY = 'true'
$env:QA_NATIVE_OBSOLETE = 'true'
$env:OUTPUT = '.cache/incremental-fresh-control.json'
$env:QA_SCREENSHOT = '.cache/incremental-fresh-control.png'
& .cache/tooling/node20.exe tools/experiments/audit_webgpu_temporal_ground.mjs
```

Cada prefix debe ser nuevo; el componente conserva las fuentes servidas sin sobrescribirlas. El modo `obsolete` reutiliza el fixture nativo y el preparador de checkpoint existentes, con dos mutaciones reales (añadir y retirar una región). El DrawWorker rechaza realmente el frame antiguo antes del upload. El probe debe leer **0 antes y 123 después**, sin reescritura de control. El coordinador debe agrupar los dos avisos en una sola recuperación retenida. Se conservan las comprobaciones de identidad de objetos, geometrías, atributos, buffers nativos, presentación oculta hasta admisión, captura no vacía y drenaje final.

El modo automático del auditor main usa el fixture de observación ya existente. Sólo inyecta el fallo en `Worker.fail`; no inventa una mutación nativa, ACK, checkpoint, salud GPU ni resultado de recuperación. Dos ventanas de referencia preceden a dos fallos y dos recuperaciones reales. Se exige el mismo binding/canvas/cliente, las mismas filas de recursos residentes, cero reconstrucciones en la escena estable, una llamada real a `markVisualLost` y una recuperación por fallo. El componente y la aplicación son pruebas complementarias: no se presentan como un único ensayo de mutación ordinaria end-to-end.

## Validación y traspaso

| Ensayo | Antes | Después |
|---|---|---|
| Automático en main, fallo tipado inyectado en Worker real | Flush rechazado; cliente fallido y dispatch bloqueado | Dos recuperaciones; mismo binding/canvas/cliente; 15.423 filas residentes iguales; 0 fábricas, 0 forks de uniformes/bindings y 0 compilaciones adicionales |
| Rechazo nativo real en componente | Comparador histórico fuerza otra Surface: 1.893 recursos | Mismo renderer/dispositivo/escena; 9 chunks, 175 nodos y 180 generaciones inmutables retenidos; probe 0→123 |
| Demanda transitoria del componente | Se reconstruía toda la Surface | 80 recursos de la región transitoria más 1 buffer del probe; 59 forks de uniformes y 65 de bindings, 0 de buffers de geometría/texturas; sin ocultarlos bajo el contador de fábricas |
| Checkpoint idéntico posterior | — | 0 fábricas, 0 forks; tres dibujos estables sin crear recursos |
| Nuevos controles CPU | Receptor: 1 pasa / 5 fallan. Worker: 2 pasan / 2 fallan (11 existentes omitidos por filtro) | Selección completa dirigida: 118/118 en 10 archivos, 0 omisiones/cancelaciones/fallos |

El build Vite y su postprocesado terminan con código 0. No se recompila WASM. La selección dirigida incluye los tests de flush, canal de preparación, coordinador automático, Worker/cliente retenidos, host retenido, transporte, handoff y preparaciones de frames; no se presenta como suite universal. Se conserva el primer intento de implementación incompleto (117/118: faltaba enrutar flush del cliente antes del guard terminal), además del piloto GPU invalidado por HMR. Ninguno cuenta como aceptación.

**Control terminal pendiente, confirmado preexistente:** destruir realmente el dispositivo falla tanto con estos cambios como con los dos módulos restaurados exactamente a `59c7d4a9c`. Ambos recibos muestran `Native resource flush unavailable`; el baseline agota el plazo de 180 segundos sin propietario gráfico recuperado. No se ha aprobado este control ni permitido certificar un endpoint destruido. Sol recibió ambas reproducciones y asumió su seguimiento desde la autoridad/productor. Este fallo es distinto del endpoint vivo retenido que corrige esta entrega.

Antes de liberar la ventana se verificaron **5.807 inputs** y **15 archivos ajenos**, sin diferencias respecto de sus hashes registrados. Las fuentes corregidas se restauraron byte por byte tras el control baseline. Sol reanudó después su trabajo Idle en otras rutas: estos resultados corresponden a la instantánea medida, no certifican sus modificaciones posteriores.

```powershell
& .cache/tooling/node20.exe --test --test-concurrency=2 tests/native-resource-retained-flush.test.js tests/webgpu-retained-worker.test.js tests/native-resource-flush.test.js tests/native-resource-preparation-channel.test.js tests/webgpu-auto-recovery-qa.test.js tests/webgpu-retained-handoff.test.js tests/worker-runtime-host-retained-recovery.test.js tests/retained-recovery-transport.test.js tests/webgpu-surface-handoff.test.js tests/remote-frame-preparations.test.js
& .cache/tooling/node20.exe node_modules/vite/bin/vite.js build
```

Los resultados, hashes y controles se detallan en [el recibo de validación](performance/native-incremental-auto-recovery-20261120/validation.json) y en [el handoff a Sol](native-incremental-auto-recovery-handoff-20261120.md). Los artefactos gzip conservan sus bytes originales y hashes SHA-256; `.gitattributes` evita conversiones de fin de línea en esta evidencia. No comparar los 26 mil recursos del arranque de sabana con los 1.893 del fixture desierto: comparar el delta sobre cada escena y las identidades que debe conservar.

El coste inicial, la demanda transitoria legítima y los forks se informan por separado. Cero reconstrucciones no demuestra cadencia ni ausencia de tirones. La mutación ordinaria con productor/cohort activo y el resto de verticales siguen bajo responsabilidad de Sol y los criterios originales.
