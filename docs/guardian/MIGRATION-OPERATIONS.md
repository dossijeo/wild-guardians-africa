# Entrada operativa de la migración

El contraste a 4K/60 Hz confirmó que limitar las fábricas explícitas reduce su concurrencia de seis a una. El intervalo de arranque persistió (177,275 y 183,575 ms) y la primera adquisición tardó más en el recorrido candidato. El límite queda como parche de investigación. Las dos historias se verificaron hasta el drenaje, sin pérdida de traza y con restauración de 4K/30 Hz. Los bloqueos causales y C4 siguen abiertos. [Contraste y recibos](native-pipeline-cadence-comparison-20261120.md).

El cuerpo de una Task detenida ya da origen a una solicitud nativa de Home. Se libera la asignación anterior y Home18 adquiere el mismo cuerpo. La selección dirigida pasó 293 pruebas y la compilación aprobó. Quedan el disparo ordinario desde Game y el relevo por el canal real hasta GPU. [Transferencia nativa y validación](native-task-stopped-home-source-20261120.md).

Continuación parcial A6 e-R3/f-R4. La parada nativa de Task en marcha reutiliza la preparación y el cierre de paradas existentes. Sus 18 casos pasan en standalone y pthread. La regresión seleccionada pasa 5.177 pruebas en 394 archivos con una omisión histórica y compilación aprobada. Quedan la proyección retenida, la liberación de la tarea y el relevo hacia Home por el canal real. [Fuente, referencias y pruebas](native-task-route-stop-source-20261120.md).

La captura posterior a 4K/60 Hz completó el recorrido anterior con 4.964 dibujos y 5.008 oportunidades hasta el drenaje, sin pérdidas de traza. C4 sigue abierto. El arranque registra un intervalo de 168,275 ms y dos oportunidades quedan bloqueadas por mutaciones, incluida una con un bloqueo de 8,175 ms. Windows volvió a 4K/30 Hz. La captura es anterior a la recompilación de la fuente Task25. [Captura completa y casos pendientes](native-60fps-capture-20261120.md).

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

La [oportunidad previa a la mutación](native-mutation-opportunity-20261120.md)
y su [traspaso publicado](native-mutation-opportunity-handoff-20261120.md)
mejoran la alineación del hold, conservando el Quiesce y el drenaje originales.
Dos recorridos completos no bloquean oportunidades por esa guarda; after3
reconcilia todos sus ordinales hasta retired-drained. Es una mejora parcial,
no aceptación del objetivo de 60 FPS.

La [admisión ordinaria y selección coherente](native-ordinary-admission-pick-20261120.md)
ya están publicadas como componentes: la inspección ordinaria usa el presupuesto
y el FIFO existentes, y la consulta de selección revalida al propietario tras
esperar la inspección remota. 1310/1310 pruebas en 98 archivos seleccionados y
build; la suite conservadora de 1642 archivos no se ejecutó. AFTER2 completa el
recorrido GPU, segunda tarea, selección y drenaje; 2467 draws / 2491 oportunidades
contiguos hasta retired-drained, sin pérdida CDP ni stale-binding.

Siguen abiertos los holds 1 de 23,720 ms y 3 de 18,180 ms y el intervalo máximo
de 40,180 ms, medidos a 30 Hz frente al objetivo explícito 1000/60. No atribuir
todos los intervalos a admisión sin contrastar su ventana. La captura separada
temporal a 4K/60 Hz pasa funcionalmente, pero CDP pierde datos: no acredita la
historia completa ni la presentación física. El modo 4K/30 Hz quedó restaurado
sin persistir el registro. El agente de corrección conserva los casos de
cadencia y el capturador; reducir su volumen y contrastar el coste del observador
antes de repetir. Conservar guardas, fences e identidades, sin cachear permisos.
Los [contrastes anteriores](performance/native-mutation-60fps-contrast-20261120.json)
son históricos; no clasifican estos casos como residuales de D.

El siguiente avance dependiente debe contrastar esa base corregida antes de
integrar Idle desde 17 con interrupciones Task/Home y los cuerpos adquiridos.
[Home con propuesta pendiente](native-idle-home-pending-proposal-20261120.md)
ya está publicado como componente nativo; el productor Idle sigue desactivado.
A6/A/B/C permanecen abiertos y D no se inicia.

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

Objetivo exigido por el usuario: **60 FPS, 1000/60 = 16,666… ms**.
Los 30 Hz actuales no rebajan ese requisito; la validación física de 60 FPS
requiere un entorno adecuado. Comunicar toda superación con su fase,
procedencia y evidencia, agrupando las repeticiones de una causa.

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
