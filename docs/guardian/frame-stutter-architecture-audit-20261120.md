# Auditoría arquitectónica de los tirones — 20 noviembre 2026

Entrega de apoyo a Sol, subordinada a [MIGRATION-OBJECTIVE](MIGRATION-OBJECTIVE.md), [plan integrado](integrated-gpu-migration-plan-20261104.md) y [A6](A6-CHECKLIST.md). No cierra A4, A5, A6 ni C4. Continúa la [recuperación incremental ya entregada](native-incremental-auto-recovery-handoff-20261120.md); reutilización de recursos y continuidad de presentación son propiedades independientes.

## Hallazgo que debe corregirse antes de ampliar el productor

**El presupuesto de preparación no limita la ocupación continua del Worker de dibujo.** `resourceBudget()` en `remote-webgpu-host.js` comprueba 2 ms **entre** trabajos. `prepare-world-frame` ejecuta admisión, validación, recorridos de dependencias, clasificación, cargas e inicialización sobre el mismo event loop que `present()`. Una tarea con prioridad background puede continuar en una microtarea larga después de ceder. Separar el puerto de control del FIFO de recursos no separa el tiempo de CPU.

En la ejecución real completa `live-a`, a las **10:57:28.549 UTC**, `resourceJobMaxType=prepare-world-frame` registra **28,515 ms**. La traza contiene `RunMicrotasks` de **28,547 ms de pared / 28,114 ms de CPU** sobre el mismo Worker que presenta. El siguiente frame llega tras **60,990 ms**, sin callbacks Host intermedios. No hay captura de imagen ni espera larga del compositor en ese intervalo. Esta es una infracción local demostrada de la autonomía temporal, aunque los recursos y la consecuencia funcional sean correctos.

El ensayo con marcas de fase (`live-phases`) termina **fallido** posteriormente: `Native Idle cycle has no submitted pick clock`. Se conserva el recibo de fallo; no certifica la vertical ni el drenaje final. Antes del error registra otra preparación, secuencia 106, de **31,335 ms**, una microtarea de **31,370 ms de pared / 20,080 ms de CPU**, y un intervalo de presentación de **61,565 ms**. Su desglose observado es:

| Tramo entre marcas | Pared (ms) | Contenido y límite de atribución |
|---|---:|---|
| Inicio → validate-operations | 12,670 | Admisión, límites, dos recorridos `packetBytes`, montaje y validación causal inicial. No identifica cuánto corresponde a cada llamada. |
| Snapshot → classify-ownership | 5,070 | Cierre de dependencias y admisión de clocks; no es sólo `snapshotResources`. |
| initialize-uploads → pin-and-publish-pending | 10,565 | `initializePreparedWorldFrame` y selección de cámaras. |
| first-use-encode → first-use-submit | 0,015 | En este paquete el primer uso no explica el bloqueo. |
| first-use-wait → ready | 14,185 | **Incluye espera asíncrona** de GPU/validación; no sumarla como CPU bloqueante. |

No se ha eliminado ningún límite ni sustituido una comprobación por una afirmación del productor. Los tiempos de las marcas son pared, no CPU: la diferencia de CPU de la segunda microtarea impide atribuir todo su tiempo a instrucciones del juego.

## Otros fenómenos separados

| Evidencia | Conclusión permitida | Pendiente |
|---|---|---|
| `live-a`, 10:58:00.216 UTC: intervalo 208,880 ms, draw 3,505 ms, ningún callback Host; `EndAccessImages` 237,225 ms de pared / 0,059 CPU | Espera del proceso GPU/compositor correlacionada con ausencia de oportunidades; no draw JS de 209 ms | Atribución SO/driver/dispositivo/compositor mediante experimento controlado |
| `live-a`, 10:56:56.516 UTC: intervalo 87,715 ms; `WebGPUDecoderImpl` dentro de una tarea GPU de 113,361 ms / 112,976 CPU | Existe también trabajo CPU real dentro del proceso GPU | Identificar llamada nativa y comparar frío/caliente; no llamarlo automáticamente compilación o espera de fence |
| `live-a`, 10:57:47.750 UTC: intervalo 82,650 ms, callback con `mutation-hold`; `intentControl.port.onmessage` 19,070 y 15,237 ms | La retención causal explica una oportunidad omitida; hay además control síncrono costoso | Desglosar los handlers. No retirar quiescence, fences ni presentar un estado sin autoridad |
| Callback mediano 33,333 ms, ≈30 Hz | El periodo nominal de esta pantalla no es un tirón ni mide CPU | Medir sobre oportunidades reales, no imponer 16,7 ms a una pantalla de 30 Hz |

Se amplió el análisis a **todos los snapshots registrados**, incluidos Home/NextTask y duplicados solapados: 15 recibos históricos, 1.421,967 s de historia, 24 s de exposición al primer segundo de minuto, **66 intervalos >100 ms, de los cuales 59 empiezan en esa fase**. El recuento preliminar de 35/38 sólo abarcaba el snapshot inicial y queda sustituido. La selección de casos es exploratoria; no presupone independencia estadística, causalidad ni cobertura de toda la vida del proceso. Algunos ensayos históricos son visuales: los solapamientos de captura quedan explícitos en el informe.

La API oficial `IDesktopWallpaper` devuelve estado **3**, intervalo **60.000 ms** y cuatro monitores. La observación concurrente detecta cambio de identidad de fondo en un monitor a 10:57:01.568, 10:58:01.403 y 10:59:01.411 UTC. Son tiempos de **lectura completada**, no timestamps del inicio de la transición. El cambio de fondo es una hipótesis concreta para los picos periódicos; **no está probado que los cause**. No se cambió la configuración del escritorio. El contraste temporal necesita autorización del usuario, alterar una sola variable y restaurarla; no bloquea la corrección del trabajo monolítico.

Referencias verificadas el 20/11/2026: [GetStatus](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-idesktopwallpaper-getstatus), [GetSlideshowOptions](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-idesktopwallpaper-getslideshowoptions), [vtable del SDK](https://github.com/microsoft/win32metadata/blob/main/generation/WinSDK/RecompiledIdlHeaders/um/ShObjIdl_core.h). La interpretación de la traza se apoya en los eventos observados, no en asumir que una revisión pública de Chromium coincide con el binario Edge instalado. Véanse también las referencias fijadas de [primer uso](native-prepared-first-use-20261120.md) y [atribución de pipelines](native-pipeline-gap-attribution-20261120.md).

## Cambio arquitectónico a implementar por Sol

Sol conserva la propiedad de Host, control causal, Farm y productor. Ha recibido el bloqueo y priorizado su corrección antes de habilitar Idle. Esta entrega modifica sólo QA, análisis y evidencia. No agrega renderer, gestor de recursos, caché global ni ejecutor.

El siguiente entregable verificable es **preparación incremental con trabajo acotado dentro del paquete**, sobre los propietarios existentes. Debe cubrir también los recorridos CPU previos a las cargas, no sólo factories o compilaciones. El paquete candidato necesita conservar su contexto, identidad, pins y cancelación mientras el activo continúa presentándose. Una mera cesión entre `prepare-world-frame` completos reproduce el problema actual.

No insertar `await` indiscriminadamente: `resolutionResources` es contexto compartido temporal, la propiedad se clasifica antes de escribir y el snapshot se fija después del análisis. Al ceder hay que impedir resoluciones con otro snapshot, recursos retirados entre pasos, cargas en buffers activos incompatibles y publicación de una generación invalidada. Revalidar época/cancelación en las fronteras existentes y conservar READY después de cargas, primer uso y confirmaciones. Si una llamada WebGPU indivisible domina, medirla aparte; un temporizador no puede interrumpirla.

Aceptación propuesta para contrastar con A4/A6, sin reemplazarla:

1. Control negativo: el paquete que fuerza recorridos/cargas suficientes mantiene el fallo de ocupación larga en el padre; un contador o un cambio de umbral no lo arregla.
2. Tras el cambio, registrar el máximo tramo síncrono de preparación y callbacks del actor activo durante la preparación candidata. La latencia total de preparar puede crecer; el tiempo continuo que impide presentar debe quedar acotado.
3. Cancelación, revocación nativa, retirada y disposición intercaladas conservan identidades, permisos y drenaje. Ningún READY adelantado, buffer residente destruido, fence omitido ni retag de órdenes antiguas.
4. Repetir frío/caliente y demanda incremental, con y sin instrumentación. Mantener separadas esperas externas, tiempo de CPU, oportunidades, publicación y scanout. Esta auditoría instrumentada no prueba fluidez sin instrumentación ni equivalencia visual mediante screenshots.

## Herramientas y reproducción

Desde la raíz del repositorio, Node 20 (el entorno local tiene `.cache/tooling/node20.exe`):

```powershell
.cache/tooling/node20.exe --test tests/native-frame-cadence-analysis.test.js tests/native-audit-preparation-costs.test.js
.cache/tooling/node20.exe --max-old-space-size=6144 docs/guardian/performance/frame-stutter-architecture-audit-20261120/reproduce.mjs --traces
.cache/tooling/node20.exe --max-old-space-size=6144 tools/guardian/analyze_native_frame_cadence.mjs --cohort docs/guardian/performance/frame-stutter-architecture-audit-20261120/cohort.json .cache/cadence-cohort.json
.cache/tooling/node20.exe tools/guardian/native-audit-preparation-costs.mjs docs/guardian/performance/frame-stutter-architecture-audit-20261120/live-phases.failure.json.gz .cache/preparation-costs.json
```

Resultado: 12 tests aprobados; hashes de los artefactos originales verificados; 15 casos / 66 gaps / 59 en fase; 12 secuencias con marcas y `runOutcome: failed` para el segundo ensayo. `reproduce.mjs` puede regenerar informes derivados; no cambia el estado de aprobación de los recibos. Sin `--traces` evita repetir el análisis de dos trazas grandes. Los casos de la cohorte reutilizan archivos ya archivados, sin duplicar fixtures ni receipts.

Para repetir en GPU real con el servidor Vite existente y una ventana coordinada sin tests/builds concurrentes:

```powershell
$env:QA_BASE_URL='http://127.0.0.1:5218'
$env:QA_NATIVE_BIRTH_SCENARIO='cancel-after-task'
$env:QA_NATIVE_BIRTH_FOLLOW_ACTION='true'
$env:QA_NATIVE_BIRTH_FOLLOW_CONSEQUENCE='true'
$env:QA_NATIVE_BIRTH_FOLLOW_SETTLEMENT='true'
$env:QA_NATIVE_BIRTH_FOLLOW_NEXT_TASK='true'
$env:QA_NATIVE_NEWBORN_PROFILE='youngMale'
$env:QA_NATIVE_CAPTURE_MODE='timing'
$env:QA_NATIVE_TRACE='true'
$env:QA_NATIVE_PIPELINE_TRACE='false'
$env:QA_NATIVE_PREPARATION_TRACE='true'
$env:OUTPUT='.cache/preparation-audit.json'
# PLAYWRIGHT_MODULE debe apuntar a Playwright ya instalado; no instalar otro.
.cache/tooling/node20.exe tools/guardian/audit_native_farm_birth_world_owner.mjs
```

El primer ensayo usó `QA_NATIVE_PIPELINE_TRACE=true` y preparación desactivada. Ambas anotaciones del mismo Host son mutuamente excluyentes; el runner lo rechaza explícitamente. Las marcas son opcionales, sólo en la respuesta QA de Playwright, fallan si cambian los puntos de inserción, y no alteran scheduling, operaciones GPU, autoridad o permisos. El segundo ensayo falló con Idle: reproducir ese fallo no constituye aceptación de la vertical y debe diagnosticarse por separado.

Observador Windows opcional, sólo lectura, sin guardar rutas o imágenes personales:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/guardian/observe_desktop_slideshow.ps1 -DurationSeconds 150 -Output .cache/wallpaper-observation.json
```

`Bypass` afecta únicamente a ese proceso; no modifica la política persistente. Sin ese parámetro este equipo rechazó ejecutar el archivo por su política local. La observación inicial de 150 s y la versión entregada de 0 s funcionaron. No usar cambios observados por polling como timestamp exacto del compositor.

## Procedencia, validación y traspaso

Base **e7fb1d5fddfde620cf5b1861081db858e2995649**, rama compartida `codex/guardian-3d-animation`, más cambios locales Idle de Sol, con productor Idle deshabilitado. Manifest de 5.814 entradas para `live-a` y 5.815 para fases; ambas comprobaciones posteriores no detectan cambios. Los archivos clave de producción ensayados y lockfile están comprimidos junto a la evidencia. Esta prueba no certifica commits o fuentes que Sol cambie posteriormente.

Hardware observado: NVIDIA/Turing, display ≈30 Hz. `live-a` completó la vertical del runner y drenó, conservó 590 identidades, con 154 recursos preparados y 1.777 contabilizados después de READY durante el recorrido posterior. Son demandas de distinto alcance; no se interpretan como reconstrucción gratuita ni preparación mínima. Los dos bloques iniciales de 1,8 s tuvieron 54 frames y máximo <33,5 ms, pero **no cubren** los tirones posteriores. Por eso los bloques aislados no bastan para aceptar fluidez.

No se ha ejecutado una nueva suite completa ni build para cambios sólo de instrumentación. Las 12 pruebas dirigidas incluyen rechazo de seams modificados, anotaciones duplicadas/conflictivas, historias incompletas/contradictorias, mezcla de propietarios, pérdida de snapshots tardíos y falsa equivalencia pared/CPU. Las trazas declaran `dataLossOccurred=false`. Se conservan íntegros el fallo Idle y los artefactos instrumentados. No se atribuyen a esta entrega las correcciones de primer uso o de control realizadas por Sol.

Evidencia: [directorio](performance/frame-stutter-architecture-audit-20261120/), [cohorte](performance/frame-stutter-architecture-audit-20261120/cohort-analysis.json), [preparación](performance/frame-stutter-architecture-audit-20261120/preparation-analysis.json), [traza analizada completa](performance/frame-stutter-architecture-audit-20261120/live-a-analysis.json), [traza analizada del fallo](performance/frame-stutter-architecture-audit-20261120/live-phases-analysis.json), [tests](performance/frame-stutter-architecture-audit-20261120/tests.log).

Traspaso a Sol: utilizar primero la reproducción offline y el paquete de secuencia 106 para diseñar una cesión segura dentro de preparación; mantener Idle sin activar hasta demostrar el acotamiento; investigar el coste de los handlers de control sin quitar la barrera. La hipótesis del escritorio y la tarea CPU del proceso GPU siguen abiertas. No hace falta repetir las quince pruebas históricas para recuperar estos hallazgos. Los commits y confirmación de entrega se comunican por el canal directo del implementador.
