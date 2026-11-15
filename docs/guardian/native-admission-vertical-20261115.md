# Vertical reutilizable de admisión nativa

Fecha: 2026-11-15. Rama: `codex/guardian-3d-animation`.
Implementada y conectada; no es una propuesta para implementar después.
No declara cerrado A6 ni la migración de consecuencias y persistencia.

## Qué se entrega

El bridge usa [createNativeResourceAdmission](../../src/world/native-resource-admission.js)
para el recorrido común:

`propuesta nativa → preparación asíncrona → drenaje → revalidación nativa actual → commit síncrono → retención → publicación y liberación`

El mismo recorrido sirve a las mutaciones de mundo y puertas, primera ruta,
reanudación y entrada en acción. Se extrajo la implementación existente de
`commitNativeWorldProposal`; no hay otro ejecutor, planificador, reloj, cola de
tareas, propietario de recursos ni bucle de reintentos. Los callbacks siguen
perteneciendo al bridge y el commit sigue siendo de C++/WASM.

Los [perfiles de admisión](../../src/world/native-resource-admission-profiles.js)
contienen las diferencias de primera ruta, reanudación y acción: referencia,
comparación, campos de transporte, compatibilidad declarada por el motor y
comprobación de la asignación efectivamente emitida. La autoridad y el
[cliente de preparación](../../src/simulation/native-resource-preparation-client.js)
usan estos mismos perfiles. Harvest/Plant/Water/Carry/Repair no necesitan
copias de la transacción por tener otra duración, clip o efecto.

Se conserva el mecanismo ya investigado en
[reanudación diferida](f-r4-deferred-native-resume-20261115.md) y
[admisión de acciones](e-r3-native-task-action-admission-20261115.md).
Esta extracción no introduce un mecanismo arquitectónico nuevo. Para uno nuevo
sigue vigente la consulta de código fuente exigida en
[MIGRATION-OBJECTIVE](MIGRATION-OBJECTIVE.md#flujo-de-implementación-arquitectónica).

## Uso desde producción

La instancia se crea una vez dentro del bridge con sus accesores actuales.
Las operaciones existentes ya la invocan; no hay que migrarlas otra vez.

| Entrada | Responsabilidad de la operación |
|---|---|
| `stage()` | Proponer en WASM sin aplicar el efecto; `1` preparado, `0` bloqueado, `-4` ocupado, `-2` no soportado. |
| `prepareResources({resources, proposedWorldBoundary, signal, deferredStart})` | Preparar en el propietario gráfico existente y devolver el recibo y handle `valid/commit/abort`. |
| `protocol` | Captura, ticket, snapshot o revalidación nativa, liberación y cancelación de su propuesta. |
| `commit(markCommitted, session, ticket, sequence, time, clockSequence)` | Invocar el commit nativo exacto; marcar inmediatamente el efecto físico antes de cualquier publicación que pueda fallar. |

El protocolo diferido usa `deferred`, `motionKind`, `retained`, `revalidate` y
`timeTranslation`; los protocolos de mundo conservan su snapshot exacto.
No marcar una consecuencia nueva como diferida para eludir su caducidad:
primero necesita revalidación física y un contrato de recursos nativos propio.

Entre revalidación y commit no se añade ningún `await`. El recurso preparado
conserva su identidad original; la asociación con la ejecución real sale del
motor. Una preparación incompatible produce `resources-changed` o `stale`.
`committed-control-failed` significa que el efecto físico ocurrió: no se trata
como rollback ni se reintenta ciegamente. La retirada del canal conserva esa
distinción. La vertical no llama a `completeTask` ni otorga permisos de efectos.

Para otra acción que ya use la declaración nativa de tareas, se aportan sus
hechos semánticos y recursos específicos al adaptador `task-action`. Para una
consecuencia todavía inexistente, el otro incremento debe implementar su
propuesta/commit nativos y delta gráfico, usando esta transacción común. No
copiar preparación, drenaje, cancelación o publicación en una función por tarea.

## Banco reutilizable de integración

- [native-admission-vertical](../../tests/helpers/native-admission-vertical.js):
  conecta planner nativo, publicación directa, MessageChannel de recursos y
  cliente/host gráficos existentes. `run` recibe la operación real;
  `onPrepare/onReady/onDrain` permiten controlar las fronteras en las pruebas.
  Puede cambiar de `task-start` a `task-action` conservando todos los propietarios.
- [native-admission-contract](../../tests/helpers/native-admission-contract.js):
  registra una sola batería de avance continuo, cancelación, cambio de intención,
  error de preparación y error de liberación después del commit. El adaptador
  del caso aporta `run/advance/binding/held/peer/cancel/close/time`.
- [native-admission-vertical.test](../../tests/native-admission-vertical.test.js):
  dos operaciones usan la misma batería. Además, una prueba encadena ruta real,
  llegada, declaración, admisión y final nativo de Harvest sobre los mismos
  propietarios. El final conserva la protección de consecuencias pendientes.
- [remote-webgpu-fixture](../../tests/helpers/remote-webgpu-fixture.js): fixture
  extraído de la suite remota; esa suite también lo importa. No se mantiene
  una segunda implementación del cliente, host o fixture.

La cola GPU de este banco es determinista y simulada. WASM, publicación,
MessageChannel, cliente y host son reales. No confundirlo con evidencia visual
o de hardware ni con activación ordinaria del juego completo.

## Iteración y cierre

Desde la raíz, con el Node 20 disponible en este entorno:

```powershell
# Iteración del adaptador de acción: cinco casos; el filtro no es aceptación total.
.cache/tooling/node20.exe --test --test-name-pattern='task-action:' tests/native-admission-vertical.test.js

# Contrato común y recorrido encadenado: once casos, unos cinco segundos aquí.
.cache/tooling/node20.exe --test tests/native-admission-vertical.test.js

# Cuando cambia la transacción o sus perfiles: fronteras y consumidores afectados.
.cache/tooling/node20.exe --test --test-concurrency=2 tests/native-admission-vertical.test.js tests/native-resource-preparation-channel.test.js tests/remote-webgpu.test.js tests/native-barrier-quiescence.test.js tests/native-gate-causal-transaction.test.js
```

Añadir las pruebas específicas del efecto cambiado. Al cerrar el incremento,
ejecutar compilación y regresión amplia correspondientes; hardware cuando se
modifique el contrato causal/gráfico. No repetirlos por un ajuste exclusivo del
harness o documentación. Conservar revisión/hashes y alcance de la evidencia
anterior, sin presentarla como una ejecución nueva del código modificado.
Los fallos históricos se registran y diagnostican, no se silencian.

## Evidencia y límites de entrega

[Registro de validación](performance/native-admission-vertical-validation-20261115.json).
Las once pruebas finales pasan. También pasaron 173 pruebas de host, mutaciones,
puertas y contrato compartido, y 38 de canal/bindings. No sumar esos grupos como
si fueran casos distintos: hay solapamientos entre selecciones.

La otra tarea verificó el conjunto con GPU NVIDIA Turing, build y regresión
amplia; el registro identifica sus hashes y artefactos. Cambios posteriores del
harness se verificaron con su selección afectada, sin repetir GPU/build.

| Entregable | Estado |
|---|---|
| Transacción común conectada a las operaciones actuales | Implementado y verificado. |
| Perfiles compartidos entre autoridad y cliente de recursos | Implementado y verificado. |
| Contrato común y recorrido encadenado reutilizables | Implementado; once pruebas finales. |
| Propuesta y commit de consecuencias específicas | Pendiente del incremento del otro agente; protección conservada. |
| Restauración funcional, productor ordinario completo y publicaciones ajenas | Pendientes de la migración; esta extracción no los cierra. |

La documentación de estado del plan sigue siendo la fuente de cierre A6. Este
documento describe la pieza entregada y cómo usarla, sin crear otro checklist
global ni convertir número de pruebas/commits en porcentaje de avance.
