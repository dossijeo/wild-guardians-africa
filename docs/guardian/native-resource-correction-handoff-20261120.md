# Traspaso a Sol: preparación GPU y tirones — 2026-11-20

Rama compartida `codex/guardian-3d-animation`, base `bac8fe876`. Implementación: `6df182f5f` (DTO) y `b946c9477` (transporte, preparación y pruebas). [Informe, contratos y resultados](native-resource-correction-20261120.md). Esta entrega continúa la recuperación incremental de 3.123 recursos ya integrada en `78aacb134/e7fb1d5fd` y las cesiones de paquetes de Sol. No cambia sus criterios ni declara A5/A6 cerrados.

## Uso inmediato

La corrección se activa en el Draw Worker normal; no requiere flags del juego. El handshake negocia transporte acotado y el mismo dispositivo prepara sus copias internas antes de READY. No añadas esperas de GPU para devolver créditos: despacho, publicación causal y retirada son confirmaciones distintas.

Pruebas rápidas de propiedad, transporte, cancelación y preparación:

```powershell
.cache/tooling/node20.exe --test tests/remote-resource-transport.test.js tests/remote-resource-uploads.test.js tests/remote-image-copy-preparation.test.js tests/remote-preparation-slices.test.js tests/native-task-reference-canonical-reuse.test.js tests/native-audit-preparation-costs.test.js
```

Para seleccionar regresiones con la infraestructura existente:

```powershell
.cache/tooling/node20.exe tools/guardian/migration-support/cli.mjs impact --files src/rendering/remote-webgpu-host.js,src/rendering/remote-webgpu-client.js --tier integration
```

El primer comando ejecuta pruebas; el segundo muestra la selección. Usa `--run` para ejecutarla y mantén las pruebas nativas obligatorias. La selección amplia y sus variables WASM exactas están en `performance/native-resource-correction-20261120/native-resource-correction-validation.json`; contiene 384 archivos y conserva las exclusiones históricas. No hace falta recompilar WASM para esta corrección.

Paridad GPU de las regiones, con el Vite existente sirviendo en 5218 y el Playwright ya instalado:

```powershell
$env:BASE_URL='http://127.0.0.1:5218'
$env:OUTPUT='.cache/remote-image-parity.json'
.cache/tooling/node20.exe tools/guardian/audit_remote_image_regions.mjs
```

Debe producir ocho combinaciones con `mismatches: 0`, conservar el asset original, confirmar drenaje y terminar con `remainingResources: 0`. `--benchmark` mide el coste nativo por región por separado; no es un criterio de fluidez. Usa `PLAYWRIGHT_MODULE` si la instalación existente está en otra ruta.

Repetir la vertical completa con el auditor original, sin crear otro fixture:

```powershell
$env:QA_BASE_URL='http://127.0.0.1:5218'
$env:QA_NATIVE_BIRTH_SCENARIO='cancel-after-task'
$env:QA_NATIVE_BIRTH_FOLLOW_ACTION='true'
$env:QA_NATIVE_BIRTH_FOLLOW_CONSEQUENCE='true'
$env:QA_NATIVE_BIRTH_FOLLOW_SETTLEMENT='true'
$env:QA_NATIVE_BIRTH_FOLLOW_HOME='false'
$env:QA_NATIVE_BIRTH_FOLLOW_NEXT_TASK='true'
$env:QA_NATIVE_EXISTING_PROFILE='youngMale'
$env:QA_NATIVE_NEWBORN_PROFILE='youngMale'
$env:QA_NATIVE_CAPTURE_MODE='timing'
$env:QA_NATIVE_TRACE='true'
$env:QA_NATIVE_PIPELINE_TRACE='false'
$env:QA_NATIVE_PREPARATION_TRACE='true'
$env:QA_NATIVE_RESOURCE_TRACE='true'
$env:OUTPUT='.cache/resource-delivery.json'
.cache/tooling/node20.exe tools/guardian/audit_native_farm_birth_world_owner.mjs
.cache/tooling/node20.exe tools/guardian/analyze_native_frame_cadence.mjs .cache/resource-delivery.json .cache/resource-delivery.trace.json .cache/resource-delivery-cadence.json
```

No ejecutes GPU junto a builds, suites o benchmarks de otro agente. Congela fuentes y modelos antes/después. El recibo debe completar consecuencia, settlement, siguiente tarea, picking y drain sin errores. Examina **toda la historia**, no sólo las ventanas bloqueadas. Para contrastar sin observadores, establece `QA_NATIVE_TRACE`, `QA_NATIVE_PREPARATION_TRACE` y `QA_NATIVE_RESOURCE_TRACE` en `false` y usa otra salida; entonces no hay traza para el último comando. `collectNativeHostHistory(receipt.result)` del mismo analizador permite examinar todos los intervalos del recibo.

## Qué se entrega y qué acelera

- `remote-webgpu-client/host`: ocho créditos, bytes privados transferidos, cancelación que atraviesa saturación, snapshots fijados durante uploads y preparación incremental con reintento. Evita repetir investigación de deserialización, pérdida de payloads o alias entre generaciones.
- `remote-resource-uploads` y `remote-image-copy-preparation`: regiones nativas de **512** y preparación explícita de los dos formatos de imagen antes de READY. El recibo expone su coste inicial; una cola vacía no acredita que el primer uso esté preparado.
- Tres validadores DTO: reutilización de salidas propias e inmutables, con controles negativos de clones/forgeries. La admisión del Host reutiliza trabajo dentro de una invocación síncrona sin persistir permisos.
- Tests y laboratorio de píxeles: reproducen transporte, identidad, cancelación, COW y cierre. El negativo de alpha demuestra por qué no se puede sustituir la captura por `createImageBitmap(bitmap)`.
- Instrumentación opcional en el auditor existente: deserializaciones y copias nativas separadas del tiempo total de fase. Sus muestras lentas están acotadas y no representan un histograma completo.

Sol puede continuar Home/e-R3 y el productor ordinario sobre estas fronteras sin volver a implementar su corrección. Para añadir otros formatos o fuentes de imagen, amplía el oráculo nativo y verifica el primer uso real; no asumas que el warm-up actual los cubre. Para cohortes mayores, comprueba la unidad indivisible de un buffer y todos sus bindings dependientes.

## Validación y responsabilidades

Selección amplia anterior al último guard: 5.036 aprobadas, una omisión opcional histórica, cero fallos; build correcto. Después del guard: **458/458** dirigidas y build correcto. Ambas tienen fuentes y logs diferenciados. La advertencia de tamaño de chunks de Vite se conserva, no es un fallo resuelto por este trabajo.

GPU con traza: 2.453 muestras, ningún intervalo >50 ms, máximo 49,670 ms; sin traza anterior al guard: 2.443, ninguno >50 ms, máximo 38,935 ms. La **entrega final** tras el guard repite 2.443 muestras, ninguno >50 ms, máximo **49,415 ms**, p95 33,450 ms, 9.053 inputs intactos, vertical/drain completos y 8/8 comparaciones de píxeles exactas. Preparación interna inicial 115,775 ms. El informe distingue coste inicial, coste agregado de copias y cadencia. Estos ensayos no prueban todos los dispositivos, una cadencia física universal ni la pérdida real de dispositivo.

Propiedad acordada: Astra ha cambiado únicamente transporte/Host, helpers, tres DTO y sus pruebas/herramientas. Sol mantiene Game, kernel/WASM, Farm, rutas, productor, control nativo y estado canónico. Los archivos ajenos y nativos instalados permanecen intactos. No se modifica `main`. El manifiesto conserva la base y hashes de fuentes; los commits de entrega se comunican por el canal entre agentes y se registran en el historial de estos archivos.

La auditoría A5 y sus comandos siguen en [su traspaso](a5-resource-lab-handoff-20261119.md). Esta entrega no introduce un plan paralelo ni acepta como óptimas las 907 compilaciones o los 26.666 recursos iniciales. Las optimizaciones de geometría compartida necesitan sus propias pruebas de vidas y retirada.
