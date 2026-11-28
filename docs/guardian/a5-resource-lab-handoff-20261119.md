# Traspaso a Sol — laboratorio A5 de recursos lejanos

Entrada operativa del complemento `a5` del CLI existente. Sigue subordinado a [MIGRATION-OPERATIONS](MIGRATION-OPERATIONS.md), [plan integrado](integrated-gpu-migration-plan-20261104.md) y [A6-CHECKLIST](A6-CHECKLIST.md). Investigación y mapa de propietarios: [informe A5](a5-resource-ownership-20261119.md). No sustituye el plan ni actualiza sus gates.

**Implementación:** commit `26ed02f0c`, `Add reusable A5 far-resource ownership laboratory`. El commit documental que contiene este archivo añade evidencia y traspaso. No hay cambio de producción ni ahorro atribuido a esta entrega. Auditor cedido por Sol: SHA-256 `930f526fbfb1461c8f4add4e89d8f502679a91016f9bc6fd75961f546850693e`.

## Uso inmediato

Desde la raíz, con Node 20 del entorno existente (las versiones modernas de Node pueden rechazar los imports JSON `assert` del proyecto):

```powershell
$a5Node = '.cache/tooling/node20.exe'
# Plan, selección y obligaciones, sin ejecutar.
& $a5Node tools/guardian/migration-support/cli.mjs a5
& $a5Node tools/guardian/migration-support/cli.mjs a5 --scenario local,retirement

# Recalcular aceptación de evidencia archivada: no requiere servidor ni GPU.
& $a5Node tools/guardian/migration-support/cli.mjs a5 --receipt docs/guardian/performance/a5-resources-20261119/main.json.gz
# Control conocido: debe devolver 1 y unchanged-source-content-local.
& $a5Node tools/guardian/migration-support/cli.mjs a5 --receipt docs/guardian/performance/a5-resources-20261119/rejected-lod-pilot.json.gz

# Componentes solamente: salida 2 porque falta la obligación GPU.
& $a5Node tools/guardian/migration-support/cli.mjs a5 --run
```

Para repetir A–F sobre WebGPU real, acordar primero una ventana sin build, suite intensa ni cambios de archivos servidos/WASM. Usar el Vite existente de Sol y un árbol/binarios coherentes; el comando no compila ni actualiza WASM por su cuenta. No abrir otro servidor sobre el mismo puerto.

```powershell
$env:QA_BASE_URL = 'http://127.0.0.1:5218'
$env:PLAYWRIGHT_MODULE = 'C:/Users/Gabriel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
& $a5Node tools/guardian/migration-support/cli.mjs a5 --run --gpu
```

El módulo Playwright indicado ya existe en esta máquina. En otra, apuntar a la instalación disponible; no se incorpora ninguna dependencia. Se usa Edge headless con WebGPU. La ejecución conservada duró aproximadamente tres minutos. El comando imprime la carpeta `.cache/migration-support/...-a5-...` con `report.json`, `summary.json`, logs, recibo completo, módulos servidos y capturas. Reservar espacio: el recibo sin comprimir ronda 475 MB debido a los inventarios completos de la instrumentación existente. No usar esta instrumentación para medir cadencia.

`--scenario` reduce componentes dirigidos, conservando siempre registry, admisión, uploads y negativos A5. Con `--gpu`, A–F se ejecutan **una sola vez juntos** sobre el mismo main/Worker/propietarios. No se duplican fixtures. Sin `QA_A5_RESOURCE_LAB=true`, el auditor anterior conserva su flujo habitual; el CLI activa esa opción sólo en su proceso de navegador.

Salidas del proceso Node: `0` evidencia completa aceptada; `1` error o criterio rechazado; `2` falta GPU, caso pendiente o fingerprint alterado. PowerShell puede convertir una salida nativa no nula en código 1 de su propio proceso: consultar `$LASTEXITCODE` inmediatamente después del comando para distinguirla. `--receipt` sólo reclasifica el archivo histórico; no certifica el árbol actual ni ejecuta nuevas mediciones.

## Qué ejecuta y qué permite detectar

| Escenario | Operación real | Condición exigida |
|---|---|---|
| A. Frío | Main original, partida `microevent-world`, seed 712, sabana, pausa controlada | Inventario desde primer estado listo y fábricas acumuladas; renderer nuevo, sin prometer cachés del driver vacías |
| B. Progresión | Demanda ordinaria de cobertura regional y admisión existentes | Observación de progreso real hasta `wanted=offered`, sin pendientes; conservar coste incremental |
| C. Estabilizado | Dos ventanas sin recuperación | Ninguna fábrica, fork, pareja o identidad residente nueva |
| D. Recuperación | Dos recuperaciones retenidas del main original | Misma binding/client/canvas, propietarios, atributos, materiales, atlas y presentación actual |
| E. Local | Invalidación gráfica dirigida de la última región no residente disponible | Contenido equivalente, sólo parejas de esa región sustituidas, anteriores retiradas y sus buffers destruidos |
| F. Cancelación/retirada | Invalidación durante construcción de candidato; readmisión; cierre de cobertura y después main | Candidato obsoleto retirado; todos los buffers geométricos atribuidos liberados; cero leases, atlas dispuesto; drain y ACK final; actores ajenos preservados |

El informe deriva automáticamente tipos de fábricas, compilaciones, forks, copias CPU y atribución por propietario. Los eventos del observador son identidades escalares y referencias débiles; no poseen recursos ni añaden un renderer/gestor. Las sustituciones de módulos ocurren sólo en respuestas del servidor interceptadas por el auditor. Los anclajes se comprueban y fallan si falta o se duplica alguno.

## Validación y evidencia entregadas

- GPU A–F sobre NVIDIA/Turing reportado por el adaptador: recibo aceptado, cero errores GPU, dos controles y dos recuperaciones; 26.666 recursos / 907 compilaciones / 582 parejas estables. Fingerprint antes/después estable sobre HEAD `9f22a331e` con los cambios locales preexistentes registrados.
- 293/293 componentes en esa ventana. Después se reforzó exclusivamente el clasificador: ejecución de componentes final **299/299**, y **43/43** en la comprobación de los 36 tests A5 más siete del soporte existente. Estas cifras se solapan; no sumarlas. Ninguna equivale a la suite completa del repositorio.
- Clasificador final aplicado al mismo recibo: 10.476 buffers privados del inventario previo al cierre y 10.584 creaciones INDEX/VERTEX atribuidas en toda la traza, destruidos; ocho texturas de atlas dispuestas y cero leases.
- Siete corrupciones deliberadas del recibo GPU real rechazadas (reconstrucción, fábrica extra, disposición prematura, alias, progresión ausente, drain ausente, lease huérfana). Los tests de esquema añaden cancelación incompleta, buffers no liberados, forks, materiales, atlas e inventarios incompletos. Son controles del clasificador, no otra ejecución GPU.
- Backend registrador con gestores y constructor real de Three para vida útil: clon profundo y wrappers privados conservan fuente; compartir atributo/índice destruye buffers ajenos; borrar atributos antes de `dispose` produce error; compartir arrays deja escrituras CPU acopladas.
- Piloto inicial rechazado conservado íntegro. La sustitución de `2,2` cambió LOD/partición; no se rebajó el comparador para aprobarla. No se ha presentado como fallo de producción corregido.

Archivos bajo [performance/a5-resources-20261119](performance/a5-resources-20261119/manifest.json): recibos gzip válido/rechazado, fingerprints y hashes, resúmenes, logs, negativos, resultados de vida útil, capturas y referencias de investigación. Los hashes de módulos servidos quedan archivados; sus textos completos permanecen en la carpeta `.cache` original. No se incluyen fuentes de librerías de terceros.

## Límites e integración pendiente

E sustituye preparación gráfica con datos nativos sin modificar. F incluye retirada de cobertura completa; no reemplaza una campaña de desplazamiento de cámara/descarga individual. No se prueban cambios de terreno nativo, device loss, memoria real del driver, presión prolongada, Farm, productor ordinario, cohortes o e-R3. Las capturas revisadas conservan el encuadre y la presentación; no demuestran equivalencia visual de impostores fuera del encuadre. Los hashes de contenido son diagnósticos CPU, no readback GPU.

Las regresiones existentes seleccionadas cubren publicaciones/cancelaciones/fences con dobles; sus resultados se distinguen del navegador real. Ni la instrumentación ni los negativos de recibos prueban cadencia. Ningún control nuevo cambia las expectativas de pruebas anteriores.

La clonación profunda observada copia 85.449.112 bytes CPU en la escena estabilizada. Es un **candidato de investigación**, no ahorro demostrado. Si Sol desea optimizarla, conservar wrappers privados y demostrar inmutabilidad de los arrays concretos, supresión/LOD correctos y disposición de otro propietario vivo. No compartir directamente atributos entre geometrías ni añadir refcounts/cachés paralelos.

Sol puede acelerar ahora: revisar `summary.json` en lugar de otra traza completa; usar `a5 --scenario local,retirement` al cambiar propietarios; reclasificar recibos sin GPU; reutilizar la prueba real de Three al considerar una geometría; repetir A–F antes/después de una corrección delimitada. Cualquier modificación de producción y actualización del checklist siguen siendo su responsabilidad.

## Coordinación realizada

Comunicación directa con el chat de Sol `01a1d588-5060-7f50-9872-1623ecffdd8b`, autorizada por el usuario. Sol confirmó cesión del auditor y rutas A5, dos ventanas exclusivas de GPU y después la reserva temporal de índice/HEAD. Ambas ventanas se liberaron explícitamente; los cambios Farm y ajenos se conservaron sin stage por nuestra parte. Los commits y estado remoto finales se envían por ese mismo canal, sin afirmar cierre de ningún gate.
