# Guardado público de Farm activo o retenido

Subordinado a [MIGRATION-OBJECTIVE](MIGRATION-OBJECTIVE.md),
[plan integrado](integrated-gpu-migration-plan-20261104.md) y
[A6-CHECKLIST](A6-CHECKLIST.md). A6 y C4 siguen abiertos.

El guardado público rechazaba todo Farm con `physics-active`, aunque el formato
ya validaba su pose semántica y la restauración fría ya preparaba un nuevo Farm.
Se habilitan los estados pendientes y activos con contrato vigente, y los
retenidos. No se serializan cuerpos, handles de ruta ni permisos gráficos.

El corredor activo expirado continúa rechazado. Farm ya detenido al expirar
restaura una intención Home desde su pose, por la misma normalización fría y
preparación Home existentes. No se inventa un Stop24 ni se reanuda el corredor
guardado. El guardado vuelve a validar el snapshot completo antes de persistir.
La disponibilidad consultada por publicación usa un lookup de perfil, sin
reescanear tareas/estructuras ni añadir otro validador por fotograma.

## Rutas e integración

- `confirmed-live-state.js`: sustituye la exclusión general de Farm por la
  exclusión del corredor pendiente/activo expirado; demás restricciones intactas.
- `spatial-intent-bridge.js`: retarget de Farm **retenido** expirado a Home solo
  en restauración fría, tras validar semántica y antes de adquirir recursos.
- `native-farm-public-checkpoint.test.mjs`: nueve controles, reutilizando los
  fixtures y los propietarios nativos/puertos/Host existentes.
- `native-farm-arrival-route-projection.test.js`: las tres aserciones de
  disponibilidad de Farm válido se actualizan al nuevo comportamiento público.
  Las negativas de identidad, mutación y mundo físico vivo se conservan.

No cambia WASM, ABI, serialización, validación de topología, guardas de ejecución,
renderer, motor del portón, preparación ni retirada gráfica.

## Evidencia y comandos

Después de integrar:

```powershell
.cache/tooling/node20.exe --test --test-concurrency=1 tests/native-farm-public-checkpoint.test.mjs
.cache/tooling/node20.exe --test --test-concurrency=1 tests/native-farm-arrival-route-projection.test.js tests/native-farm-restored-authority.test.js tests/native-farm-idle-approach-live-state.test.js tests/confirmed-live-state.test.js tests/worker-checkpoint-store.test.js
```

Privado antes de integrar: `--loader ./.cache/farm-save-loader.mjs` y, para el
archivo nuevo todavía virtual, `.cache/farm-save-test.mjs`.

- Nuevos: 9/9. Incluyen checkpoint desde autoridad ordinaria, nueva época,
  misma topología/pose/fases con READY retenido, readmisión y Home por contrato
  expirado solo desde pose retenida.
- Impacto seleccionado: 78/78, no suite completa. Incluye combinaciones de
  perfiles pending/moving/held, transiciones Farm→stroll→Idle y persistencia Worker.
- Negativos contra producción sin el parche: seis fallos de siete controles
  iniciales; el control de rechazo conserva su éxito. Los dos controles añadidos
  posteriormente también fallan por el bloqueo de guardado. No se modificó la
  expectativa para presentar el baseline como aprobado.
- Caso público exacto del portón `(-14,8.2)`: checkpoint t10.65, z11.3999838104,
  apertura0.2158244453; pose/fases/apertura exactas durante nueva preparación;
  después cruza y llega Idle t17, z5.1998462677, apertura1, HP60. Archivo privado
  `farm-save-gate-positive.json`, generado reutilizando el control previo con
  salida separada. El negativo original permanece intacto.

Estos controles usan WASM real, autoridad de producción y un doble de la cola gráfica.

La selección integrada de 47 archivos ejecutó 730 casos. Pasaron 711 y 19 todavía esperaban el rechazo general del guardado Farm. Se actualizaron las cinco aserciones de disponibilidad que generaban esos casos en las pruebas de Game y proyección de Farm retenido. Pasaron los 39 casos de ambos archivos en la repetición, con los mismos binarios y código de producción. El build WebGPU Worker con Draw remoto pasó en 1 min 24 s.

## Fuentes consultadas

- [Jolt 5.3.0 PhysicsSystem SaveState/RestoreState](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/PhysicsSystem.cpp#L2412-L2472): restaura y valida estado físico mediante sus dueños, incluyendo actualización de broadphase.
- [Detour 1.6.0 PathCorridor reset](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourPathCorridor.cpp#L214-L221): reinicia desde una posición/referencia y no presume vigencia del corredor anterior.

Patrón aplicable: distinguir estado durable de permisos transitorios. En Wild se
reutilizan la restauración y la admisión ya existentes; estas referencias externas
no otorgan autoridad ni sustituyen la comprobación causal.

## Guardado y recarga físicos

Edge 158 y la NVIDIA GTX 1660 dibujaron Farm con el portón de zarzas `structure-1000000` en `(-14, 8.2)`. El coordinador público guardó la partida en `t=10.50`, secuencia 16. El trabajador estaba en `(-13.9898178157, 11.3999838104)` y la hoja en apertura `0.2158244453`. La recarga fría conservó exactamente la pose, la orientación, las fases, el presupuesto de carrera y la apertura durante la pausa. El primer paquete nuevo esperó a que se liberara READY y su declaración conservó la pose guardada.

La autoridad nueva adquirió Farm con el ticket 2. El primer dibujo escribió la apertura `0.2158244401` en Float32. Farm cruzó el vano y el ciclo Idle del ticket 4 se dibujó en `(-13.9752302170, 5.1998462677)` con el portón abierto. Se mantuvieron el cuerpo 1 y las raíces gráficas de la recarga. Los 831 buffers comparables conservaron su referencia. Ambos consumidores drenaron. El primer ensayo llegó a Idle y agotó el plazo porque el observador esperaba la familia Initial Idle20. La repetición verificó el ciclo Idle que recibe el cuerpo directamente de Farm. [Recibo, posiciones, recursos y hashes](performance/native-farm-public-checkpoint-20261123.json).

La pantalla estaba a 30 Hz. Antes de guardar se registraron 257 intervalos y el máximo fue 36,20 ms. La recarga registró 471 y el máximo fue 46,40 ms en el paquete 14 sin ticket, antes de adquirir Farm. Todos superaron el objetivo de 16,67 ms. El intervalo máximo solapó dos lotes Dawn en `CrGpuMain` durante 14,16 y 27,12 ms. Los lotes incluyeron cuatro llamadas `APICreateShaderModule` con 12,31, 9,61, 17,11 y 9,46 ms de CPU.

El segundo VSync llegó a Viz 32,92 ms después de iniciar el dibujo anterior. El compositor emitió su `BeginFrame` a los 46,23 ms, dentro de la tarea que confirmó el swap pendiente. El Draw Worker lo recibió 0,15 ms después. El código de Chromium retiene el `BeginFrame` mientras el compositor espera y lo vuelve a emitir al confirmar el swap. [Confirmación del swap](https://github.com/chromium/chromium/blob/main/components/viz/service/display/display_scheduler.cc#L793-L814), [Emisión de BeginFrame pendiente](https://github.com/chromium/chromium/blob/main/components/viz/common/frame_sinks/begin_frame_source.cc#L531-L556).

Los flujos del scheduler identifican la espera anterior. El trabajo WebGPU que liberó el `SyncToken` del swap tardó 76,94 ms entre su encolado y su ejecución. Durante esa espera, 25 trabajos del scheduler ocuparon 76,66 ms de pared en `CrGpuMain`. Dentro de ellos hubo 75,92 ms en el decoder Dawn y 70,38 ms en la creación de siete módulos shader. Son niveles anidados del mismo hilo de CPU. `SyncToken::Release` desbloqueó el swap y su confirmación precedió a la entrega de `BeginFrame`. [Flujos del scheduler de Chromium](https://github.com/chromium/chromium/blob/main/gpu/command_buffer/service/scheduler.cc#L318-L343), [Recibo correlacionado](performance/native-farm-public-checkpoint-20261123.json).

Las etiquetas Dawn sitúan los siete módulos en cuatro materiales del trabajador `youngMale`. Se crearon las etapas de vértice y fragmento de `Kofi head continuous skin shading`, `Actor eyelid original fur` y `Worker oral tissue`, y la etapa de fragmento de `BakedMaterial.001`. Queda comparar el WGSL y comprobar cuánto trabajo se puede reutilizar con el propietario de pipelines existente. [Materiales del perfil](../../public/content/character-preview/youngMale/bc7/materials.gltf), [Etiquetas y tiempos](performance/native-farm-public-checkpoint-20261123.json).

La mayor copia de imagen por región tras recargar duró 4,40 ms durante un intervalo de 37,80 ms con el ticket 2. Formó parte de seis regiones de 512×512 de una imagen de 4096×2048. La instrumentación conserva las 96 regiones más lentas a partir de 0,75 ms. Ambas sesiones tienen un historial contiguo de envíos y la traza se exportó sin pérdida. [Correlación y traza](performance/native-farm-public-checkpoint-20261123.json).

El siguiente bloqueo de esta cadena aparece en el avance posterior al inicio de una incursión diurna. El relevo de Farm a Flee requiere conservar el cuerpo del trabajador y admitir la locomoción de los animales en la cohorte. El primer caso integrado de AttackCrops es la dependencia documentada para ese borde. [Base Flee](performance/native-daytime-flee-baseline-20261121.json), [Estado de AttackCrops](native-ordinary-attack-crops-20261121.md).
