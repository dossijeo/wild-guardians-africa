# Cadencia del Host y esperas de presentación

Traspaso a Sol High, 2026-11-18. Continúa la [corrección de presentación al release](native-mutation-release-presentation-20261118.md), commit `7ea08d55b`, sin sustituir el [plan](integrated-gpu-migration-plan-20261104.md) ni cerrar A6. [Evidencia reproducible](performance/native-frame-cadence-validation-20261118.json).

## Diagnóstico y solución

Hay causas distintas detrás de «decenas de milisegundos entre fotogramas»:

1. **Refresco normal:** Windows informa GTX 1660, 3840×2160, **30 Hz**. Las trazas miden una mediana RAF de 33,33 ms. Ese intervalo no es el coste CPU del dibujo; este último alcanza 4,53–6,02 ms como máximo en los cuatro ensayos nuevos. Tampoco mide tiempo GPU ni presentación física en pantalla.
2. **Espera evitable del protocolo:** una RAF podía entrar durante la barrera, no dibujar y esperar otra vuelta después de recibir el release válido. Sol corrigió la programación en `7ea08d55b`: termina el dibujo pendiente desde el control directo validado, usando el mismo camino y todos sus guards, sin otra cadena RAF. Se reutiliza esa solución acordada; no se implementa un segundo ejecutor. Un hold real sigue siendo visible: no se envían comandos durante el drenaje ni antes de la adquisición autorizada.
3. **Esperas externas al Host:** el pico anterior de 113,44 ms coincide con `Scheduler::RunTask` del proceso GPU de 123,984 ms de pared y 0,410 ms de CPU de ese hilo. No hay callback RAF intermedio; el Host sí atiende control directo. La traza ampliada nueva localiza picos de 145,02/111,80/95,59 ms dentro de `SkiaOutputSurfaceImplOnGpu::EndAccessImages`, durante `SwapBuffers`: 177,505/129,918/112,988 ms de pared frente a 0,066/0,568/0,058 ms de CPU. Es evidencia de espera en el acceso compartido del compositor, **no prueba de un coste GPU equivalente ni identificación del mecanismo concreto del driver**. La traza antigua no incluía `viz`; no se le atribuye retrospectivamente el mismo método.

La hipótesis inicial de que las capturas explicaban los picos no se confirmó: hay picos también sin capturas. No se presenta el modo temporal como una mejora de rendimiento. El arranque y preparación inicial también contienen trabajo Dawn/compilación y procesamiento WebGPU; los máximos completos se conservan y no se descartan para anunciar «cero tirones».

La solución de arquitectura de aplicación elimina la espera añadida tras el release y conserva independencia del preparador, reloj nativo finito, autorización, frontera de mundo y propiedad de recursos. Este incremento hace observables sus decisiones. No cambia el refresco del monitor, no introduce temporizadores para sustituir RAF y no quita fences para sortear una espera del compositor. **No está demostrada ni implementada la eliminación de todos los picos del navegador/controlador.** La continuidad de actores independientes durante un hold global sigue pendiente del contrato A6/C3; retrasos deliberados de 50/100 ms no pueden declararse eliminados.

## Herramientas incorporadas

- `remote-webgpu-host.js`: `inspect().presentationOpportunities` conserva las últimas 512 oportunidades RAF, en orden, con hora absoluta, intervalo, resultado, `holdId` y secuencia. Resultados: `submitted`, `no-submission`, `hidden`, `consumer-retirement`, `mutation-hold`, `awaiting-native-baseline`, `awaiting-prepared-frame`, `stale-binding`, `stale-world`, `causal-floor`, `failed`/`stopped`. Un release directo no se hace pasar por RAF. Los contadores y muestras históricos conservan su significado; las muestras registran intentos de dibujo y el resultado nuevo distingue si hubo submit. El anillo es acotado y no crea recursos GPU.
- `native-audit-capture.mjs`, conectado al runner existente: `QA_NATIVE_CAPTURE_MODE=visual` por defecto mantiene las imágenes y registra inicio/fin en el reloj absoluto del navegador. `timing` conserva los checkpoints y omite las capturas; declara `visualEvidence:false`. No satisface aceptación visual.
- `analyze_native_frame_cadence.mjs`: cruza recibo y traza mediante su marca de reloj, calcula cadencia RAF independientemente del release, separa CPU de dibujo, muestra guards, capturas solapadas y tareas GPU/compositor. Rechaza relojes incompatibles y múltiples Hosts. Emite SHA-256 de ambos inputs. Los eventos correlacionados no se convierten automáticamente en causalidad. El anillo puede no cubrir el inicio de la traza; el informe publica su cobertura.
- `QA_NATIVE_TRACE_CATEGORIES` permite ampliar la traza sin modificar el escenario. Las categorías detalladas añaden sobrecoste; no comparar sus máximos como si fueran idénticos a los del perfil básico.

## Ejecución

Usar el servidor Vite existente (`QA_BASE_URL`, por defecto `http://127.0.0.1:5181`), Node 20 y Playwright ya disponibles. Coordinar la ventana con Sol: no compilar ni ejecutar otras pruebas GPU a la vez. Conservar binarios y hashes de cada ensayo; no atribuir los resultados a un WASM recompilado después.

```powershell
$env:PLAYWRIGHT_MODULE='C:/Users/Gabriel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:QA_NATIVE_FARM_ARRIVAL_STOP_HOME='true'
$env:QA_NATIVE_MUTATION_RELEASE_DELAY_MS='0' # También 30, 50, 100 para comprobar holds reales.
$env:QA_NATIVE_TRACE='true'
$env:QA_NATIVE_CAPTURE_MODE='visual' # Repetir con timing y otro OUTPUT.
$env:OUTPUT='.cache/cadence-visual.json'
& .cache/tooling/node20.exe tools/guardian/audit_native_first_task_world_owner.mjs
node tools/guardian/analyze_native_frame_cadence.mjs .cache/cadence-visual.json .cache/cadence-visual.trace.json .cache/cadence-visual-analysis.json
```

En una sesión limpia, sin otras opciones `QA_NATIVE_*` activas. Para localizar esperas del compositor, antes del ensayo:

```powershell
$env:QA_NATIVE_TRACE_CATEGORIES='toplevel,blink.user_timing,devtools.timeline,v8.execute,gpu,viz,cc,disabled-by-default-gpu.dawn,disabled-by-default-gpu.service,disabled-by-default-gpu.device,disabled-by-default-gpu.debug'
```

Interpretar primero el intervalo nominal, después callbacks presentes/ausentes y guards, finalmente eventos del hilo correcto. Un intervalo largo sin callback no demuestra un bloqueo JavaScript del Host. `drawMs` y `threadCpuMs` tampoco son timestamps GPU. Para confirmar una espera concreta del driver hacen falta trazas de plataforma adicionales; la API WebGPU de la página no permite cambiar el acceso compartido interno de Chromium.

## Validación y límites

Build Vite pasa en 1m8s (aviso existente de chunks mayores de 500 kB). Pasan **334/334 pruebas dirigidas**, sin omisiones: scheduling de release, visibilidad, aborto, commit sin candidato, mundo obsoleto, causalidad, admisión y retención de recursos; también captura, analizador y límite/orden del anillo. Las pruebas de release comprueban ahora dos `mutation-hold` reales de la fixture y que el release no fabrica otra oportunidad RAF. No se repite ni se atribuye a este incremento la selección amplia de Sol; sus resultados y fallos históricos siguen en su evidencia.

```powershell
$env:WILD_ENGINE_NATIVE_ROUTE_WASM=(Resolve-Path src/world/wild-engine/spatial-savanna.wasm).Path
$cases=(Get-Content docs/guardian/performance/native-frame-cadence-validation-20261118.json -Raw | ConvertFrom-Json).focused.files
& .cache/tooling/node20.exe --test $cases
& .cache/tooling/node20.exe node_modules/vite/bin/vite.js build
```

Cuatro recorridos con Workers, WASM, Surface, actores originales y hardware NVIDIA; todos completan drain, preparan 70 recursos, crean cero tras READY y no producen errores:

| Ensayo | Frames Home durante bloqueo de 1,8 s | Máximo intervalo Home | Máximo completo, incluido arranque | IDs inmutables retenidos |
|---|---:|---:|---:|---:|
| Visual, normal | 54 | 33,570 ms | 112,915 ms | 642 |
| Temporal, normal | 54 | 33,510 ms | 202,505 ms | 640 |
| Temporal, traza ampliada | 54 | 33,555 ms | 145,025 ms | 640 |
| Visual, hold solicitado 50 ms | 53 | 93,185 ms | 119,670 ms | 642 |

El último hold duró realmente 62,700 ms tras ACK. Registró dos oportunidades `mutation-hold`, ningún submit dentro de la espera y un dibujo `mutation-release` con el nuevo mundo. El intervalo largo incluye esa espera y no se oculta. Los ensayos normales verifican progreso durante el bloqueo del preparador; no equivalen a un soak test de toda la partida, productor/cohort ni recuperación completa. La aceptación visual conserva imágenes en los dos ensayos visuales; los dos temporales no aportan esa evidencia.

## Referencias y traspaso

Código consultado: [CanvasResourceDispatcher](https://chromium.googlesource.com/chromium/src/+/refs/tags/140.0.7339.207/third_party/blink/renderer/platform/graphics/canvas_resource_dispatcher.cc) limita frames pendientes y puede descartar BeginFrames; [ImageContextImpl](https://chromium.googlesource.com/chromium/src/+/refs/tags/140.0.7339.207/components/viz/service/display_embedder/image_context_impl.cc) termina accesos de lectura según las capacidades de la representación. Son patrones de implementación consultados, no una afirmación de que el binario Edge **157.0.4341.60** corresponda a ese tag. [SkiaOutputSurfaceImplOnGpu](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/viz/service/display_embedder/skia_output_surface_impl_on_gpu.cc) sitúa `EndAccessImages` en ese camino; el snapshot consultado queda identificado por hash. [WebGPU queue](https://gpuweb.github.io/gpuweb/#dom-gpuqueue-onsubmittedworkdone) mantiene la semántica del drenaje del prefijo enviado. No se añaden dependencias.

Sol puede continuar Farm/Task sin tocar este incremento: consultar primero `presentationOpportunities`, reutilizar el runner y analizar cada recibo con su propia traza. No volver a interpretar un máximo completo como coste de dibujo o como fallo del hold. Se coordinó la cesión de Host/runner tras `7ea08d55b`, se congelaron los 64 inputs/artefactos nativos y se liberó la ventana de compilación tras terminar GPU y regresión. La evidencia corresponde a esos binarios, no a los siguientes cambios de Sol. El commit de este documento y las herramientas se comunica directamente por el hilo del implementador; no se altera `main`.
