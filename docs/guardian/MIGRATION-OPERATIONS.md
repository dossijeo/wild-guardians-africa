# Entrada operativa de la migración

Índice de trabajo, no otro plan. Mandan el [objetivo](MIGRATION-OBJECTIVE.md), el
[plan integrado](integrated-gpu-migration-plan-20261104.md), el
[checklist A6](A6-CHECKLIST.md) y su [corrección prevalente](intent-route-architecture-correction-20261108.md).
Orden A → B → C → D. Este apoyo no activa autonomía ni cierra criterios.

Para investigar intervalos de presentación: [diagnóstico y herramientas de cadencia](native-frame-cadence-diagnosis-20261118.md).
Separa refresco de pantalla, guards del Host, CPU de dibujo y espera del compositor.

Desde la raíz del repositorio:

```powershell
node tools/guardian/migration-support/cli.mjs context
node tools/guardian/migration-support/cli.mjs context --json
```

Deriva HEAD, rama, diferencia con la referencia remota local, últimos commits,
filas e/f y los once padres A6 directamente del checklist. JSON añade hashes de
las cuatro fuentes y cambios de código. No cuenta tests como porcentaje ni
escribe en las fuentes. Ejecutar `git fetch origin codex/guardian-3d-animation`
antes de integrar; el comando de contexto no hace red.

## Siguiente entrega verificable

La vertical ordinaria Farm → Task → Harvest → Carry → Settlement → siguiente
Task ya tiene evidencia Worker/Surface/GPU; consultar sus informes desde
[CURRENT-STATUS](CURRENT-STATUS.md). El [origen Idle desde liquidación17](native-post-settlement-idle-source-20261120.md)
y su [consumidor adquirido](native-post-settlement-idle-consumer-20261120.md)
están implementados como componentes; su productor ordinario sigue desactivado.
La [corrección de recepción y preparación](native-resource-correction-20261120.md)
ya está publicada, con sus costes y límites documentados.

El relevo causal de incorporación Farm perdió una oportunidad de dibujo bajo
`nativeMutationHold`:49,415ms no acredita fluidez. Falta atribuir fence,
commit y comunicación antes de corregirlo; conservar las guardas. No ampliar ni
aceptar una dependencia cuyo defecto confirmado siga abierto. El siguiente
avance dependiente debe partir de esa base corregida y después integrar Idle
desde17 con interrupciones Task/Home y los cuerpos ya adquiridos. Home con una
propuesta pendiente se entrega por separado como componente nativo, sin activar
el productor ni aceptar GPU física. A6/A/B/C permanecen abiertos y D no se inicia.

## Coordinación de incidencias de cadencia

Por instrucción del usuario del20 de noviembre, el implementador de migración
detecta y comunica las incidencias; el agente de corrección investiga, implementa
y entrega la solución con evidencia, commits y restricciones. El implementador
contrasta la entrega antes de construir sobre ella. El plan original conserva
la autoridad; este reparto no cambia causalidad, identidad ni retirada.

En cada aviso incluir la frecuencia/plazo objetivo y su procedencia, commit y
cambios locales, comando/configuración y recibo/traza, intervalo y fase, tipo de
medida (CPU, GPU, envío del Host o presentación efectiva), rutas en edición y
jobs activos. Indicar datos ausentes; agrupar repeticiones de una causa abierta
y comunicar agravamiento o evidencia nueva. Acordar propiedad de las rutas antes
de modificar producción y una ventana sin suites/builds antes de medir GPU.

50ms es diagnóstico, no aceptación. La mediana de callbacks no fija el objetivo
del producto ni prueba scanout. Medir los plazos incumplidos y la variación de
la historia y las transiciones completas según C4. El primer caso del reparto
es el relevo causal anterior; no se rebaja ninguna guarda para ocultar su coste.

| Frontera | Propietarios que debe reutilizar Sol | Evidencia disponible |
|---|---|---|
| Asignación/ruta/acción | `src/world/wild-engine/spatial-intent-state.cpp`, `spatial-task-execution.inc`, `spatial-task-action-proposal.inc`, `spatial-intent-bridge.js` (incluye `createEventDrivenTaskPlanner`) | `native-task-resource-requests`, `native-task-start-*`, `native-task-action-*` |
| Proyección/consecuencia | `src/simulation/game.js`, `tasks.js`, `src/persistence/snapshots.js` | `native-task-game-execution`, `native-task-action-game-execution`; restauración y consecuencia preparadas |
| Admisión/control/recursos | `src/world/native-resource-admission.js`, perfiles existentes; `src/simulation/native-resource-preparation-client.js`, `native-intent-control-publication.js` | `native-admission-vertical`, `native-resource-preparation-channel`, guards del catálogo |
| Dibujo y propiedad | `src/rendering/webgpu-world-surface.js`, `webgpu-worker-roster.js`, `remote-webgpu-host.js`, `native-task-action-gpu-motion.js` | harness `native-first-task-world-owner`, `native-worker-world-owner`, lifecycle |

Los nombres cortos de pruebas corresponden a `tests/<nombre>.test.js`.
No copiar el ABI confiado de los fixtures a producción. No conceder consecuencias
desde clips, readback, recibos de preparación ni finalización del temporizador JS.
No reconstruir escena/dispositivo para una mutación ordinaria; conservar épocas,
reservas, drenaje, revocación directa y propiedad única.

## Laboratorio y validación por impacto

```powershell
# Ver selección y límites sin ejecutar nada
node tools/guardian/migration-support/cli.mjs lab --scenario all
node tools/guardian/migration-support/cli.mjs impact --base origin/codex/guardian-3d-animation
# Acotar el incremento propio en un árbol compartido (lista explícita de rutas)
node tools/guardian/migration-support/cli.mjs impact --files src/world/native-resource-admission.js --tier focused
node tools/guardian/migration-support/cli.mjs impact --files src/world/native-resource-admission.js --tier focused --run
# El mismo escenario existente con personajes, modelos, Workers y WebGPU reales
$env:QA_BASE_URL = 'http://127.0.0.1:5181'
# Solo si Playwright no está resoluble: ruta a su instalación ya disponible.
# $env:PLAYWRIGHT_MODULE = 'C:/ruta/existente/node_modules/playwright'
node tools/guardian/migration-support/cli.mjs lab --scenario harvest --run --gpu
node tools/guardian/migration-support/cli.mjs lab --scenario gates,recovery --run --gpu
```

Usar el servidor Vite existente; si no hay ninguno, `npm run dev -- --port 5181`.
Requiere Edge con WebGPU hardware y el Playwright ya disponible. No se instala
nada ni se reconstruye WASM. Si el ABI está desfasado, el fallo se conserva y Sol
usa su procedimiento de build; este apoyo no compila mientras Sol cambia C++.

Las suites existentes usan import assertions JSON compatibles con Node 20. Si el
CLI arranca con Node ≥22 y existe `.cache/tooling/node20.exe`, reutiliza ese Node
para los procesos hijos; también admite `MIGRATION_NODE` como ruta explícita.
El comando real queda en cada recibo. En otro equipo, ejecutar el CLI directamente
con el Node compatible ya instalado o fijar esa variable. No se descarga un runtime.
`WILD_ENGINE_NATIVE_ROUTE_WASM` apunta por defecto al WASM actual del repositorio;
una ruta explícita se conserva y se registra. No usa un prototipo antiguo por omisión.

Variaciones reproducibles: `obstacles`, `gates`, `concurrent`, `pause`,
`invalidation`, `preparation`, `recovery`, `harvest`. Cada una selecciona fixtures
existentes y sus parámetros exactos. `all` ejecuta la unión sin repetir archivos
Node ni invocaciones GPU idénticas. Obstáculos/pausa/invalidation tienen cobertura
de componente; no se presentan como variaciones ya conectadas al ciclo completo.
El escenario Harvest GPU enlaza asignación, ruta, movimiento, llegada y acción en
la misma ejecución. Puertas/recovery siguen siendo harnesses complementarios.
Las fases aún sin productor están en
[aceptación pendiente](../../tests/migration-harvest-acceptance.pending.test.js),
con TODO explícito; no tests vacíos aprobados. Usar `--require-complete` para que
la falta de la vertical completa produzca código 2 incluso si los componentes pasan.

| Nivel | Selección y obligación |
|---|---|
| `focused` | Imports locales transitivos y guards obligatorios de autoridad, causalidad y recursos para cambios de runtime; no build/GPU redundantes en cada edición. |
| `integration` | Añade fronteras comunes, los tres harnesses GPU y build para cambios de runtime. Sin `--gpu` queda pendiente, código 2. |
| `broad` | Todas las pruebas `*.test.js`; incluye los TODO de aceptación, que impiden informar cobertura completa. Build/GPU cuando aplica. Ejecutar al cerrar entrega, no en cada edición. |

Cambios nativos amplían cobertura ABI/semántica. Archivos sin mapa, recursos,
configuración y módulos sin consumidores de tests fuerzan regresión completa.
No es un analizador de JavaScript completo: imports calculados y accesos por
texto requieren revisar la selección y ampliar a `integration`/`broad`. Nunca
rebajar un gate original porque el selector sugiera menos pruebas. No ejecuta
campañas C ni benchmarks D automáticamente.

Cada ejecución guarda comando, entorno de escenario, TAP/log, hashes SHA-256,
HEAD, Node y huella del código antes/después en `.cache/migration-support/`.
Cambios concurrentes invalidan la evidencia (código 2); no se reutilizan verdes
cacheados. Código 1 significa fallo; 2 significa incompleto/cambiado; 0 solo
significa que las comprobaciones solicitadas pasaron. Los skips/TODO no pasan
por aceptación. Un log fallido nunca se convierte en aprobado por ser preexistente.

Para diagnosticar un fallo: conservar report/log, repetir el archivo exacto;
comparar con evidencia anterior o checkout aislado del commit previo con sus
binarios. No resetear este árbol, cambiar expectativas ni atribuir causalidad
si los hashes cambiaron. [Registro de validación](MIGRATION-SUPPORT-VALIDATION.md).

## Investigación, cierre y traspaso

[Procedimiento y fuentes](MIGRATION-RESEARCH.md), [matriz de verticales](MIGRATION-VERTICALS.md)
y [traspaso a Sol](MIGRATION-SUPPORT-HANDOFF.md). Comprobar integridad del índice:
`node tools/guardian/migration-support/cli.mjs check`.

Solo añadir al índice de Git rutas propias; nunca `git add .`, stash/reset global
ni force push. La herramienta es aditiva y no modifica plan, producción, binarios,
configuración npm ni harnesses que Sol está editando.
