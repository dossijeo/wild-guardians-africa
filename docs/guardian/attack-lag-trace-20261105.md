# Traza de los bloqueos de la incursión y primer Attack — 2026-11-05

Las capturas identifican dos mecanismos diferentes: una espera síncrona del dibujo WebGL antiguo y compilaciones de pipelines WebGPU durante la aparición del guardián. Desactivar el dibujo antiguo no elimina el segundo mecanismo. No se ha aplicado ninguna optimización ni cambiado las reglas del juego para este diagnóstico.

## Capturas y alcance

Se reutilizó la partida real de sabana del día 31 del harness `audit_worker_ui_causal_attack.mjs`: 13 animales, 32 trabajadores iniciales, 144 cultivos y un centro. Simulación autoritativa en Worker, publicación por lotes de 16, WebGPU del mundo en Worker, admisión GLB compartida desactivada. Attack pasa por el manejador real de entrada, invocado directamente sobre `animal-368`; no mide el picking con ratón. Se abren los menús reales de magia antes de solicitarlo.

| Captura | Configuración | Ventana íntegra | Pérdida de eventos |
| --- | --- | ---: | --- |
| `bounded` | Presentación WebGPU y dibujo WebGL antiguo activo | 10.016 s | No |
| `no-legacy` | Opción existente `qa-webgpu-skip-legacy-draw` | 6.405 s | No |

Edge 156.0.4314.58, headless, viewport 1280×720, sin SwiftShader forzado. Inventario del navegador y sonda WebGL: NVIDIA GeForce GTX 1660, controlador 32.0.15.8129. La traza muestra Dawn/D3D12 y compilación DXC en la ruta WebGPU. La sonda de adaptador WebGL se ejecuta antes de iniciar la traza; no explica las llamadas WebGL registradas durante la primera captura. No hay consultas hardware de tiempo GPU en esta prueba, ni un identificador PCI obtenido directamente del dispositivo WebGPU del Worker.

Se registraron tareas de todos los procesos, compilador/controlador gráfico, carga de recursos, perfiles V8 de los Workers y del hilo principal, long tasks, intervalos rAF y solicitudes reales a `GPUDevice`. El inventario posterior relaciona los identificadores de material con las mallas. Las pilas por intervalo y los eventos originales quedan conservados.

Las dos ejecuciones tienen historias de caché y estados temporales diferentes. **No constituyen un A/B de rendimiento ni una medida de FPS normales.** La instrumentación detallada añade coste. El objetivo es localizar operaciones, no calcular una mejora porcentual. El checkout incluía cambios de integración previos sin commit; el manifiesto conserva el commit base y hashes de los archivos relevantes.

## 1. Espera WebGL demostrada por la pila completa

En `bounded`, entre +816.280 y +2182.970 ms hay un intervalo rAF de **1366.690 ms**. Dentro de él:

| Operación | Inicio relativo | Duración de pared |
| --- | ---: | ---: |
| Tarea principal `RunTask` | +852.572 ms | 1349.010 ms |
| `FireAnimationFrame` | dentro de esa tarea | 1346.510 ms |
| `frame()` de la aplicación | dentro de ese callback | 1334.527 ms |
| `GLES2Implementation::GetProgramiv` | +910.284 ms | **1243.645 ms** |
| `WaitForCmd` → `Finish` → `WaitForGetOffset` | anidado en la consulta | ~1243.6 ms |

Estas duraciones están anidadas: no deben sumarse. Es principalmente una espera del hilo principal, no 1.24 segundos de cálculo JavaScript.

Pila V8 observada, de llamador a operación nativa:

```text
main.js: frame
  webgpu-legacy-draw.js: renderWithOptionalWebGpuPresentation
    scene.js: render → drawRenderFrame
      game-juice.js: presentationDraw → draw
        scene.js: draw → drawWorldFrame → withRenderOrigin
          WebGLRenderer.render → renderScene → renderObjects
            renderObject → renderBufferDirect → setProgram
              onFirstUse → getProgramInfoLog
```

El código Three.js servido confirma que `onFirstUse` consulta el log del programa y su estado de enlace. La consulta nativa `GetProgramiv` y su espera aparecen en ese intervalo. La ruta de compatibilidad todavía dibuja el mundo con WebGL si no se activa la opción de omisión. **No es una llamada WebGL dentro de WebGPU ni un fallback silencioso de WebGPURenderer: son dos rutas de dibujo coexistentes.**

Simultáneamente se crea `renderPipeline_Material_0_1352` (294.459 ms; DXC anidado 269.274 ms). El inventario lo identifica como `MeshPhysicalNodeMaterial`, compartido por diez mallas esqueléticas de 16 800 vértices. La traza no permite atribuir toda la espera WebGL a ese único pipeline concurrente.

Este bloqueo empieza antes de solicitar Attack (+3210.801 ms). No puede atribuirse a la resolución autoritativa de ese ataque. El Worker de simulación aparece principalmente inactivo en ese intervalo. El Worker gráfico también acusa una separación entre llamadas a `draw()` de **1245.908 ms**.

## 2. Compilación WebGPU durante la aparición del guardián

En la misma captura, el intervalo +5016.315 a +6116.375 ms dura **1100.060 ms**. Las creaciones de pipelines ocupan 1035.035 ms dentro de esa ventana; la compilación DXC anidada ocupa 976.284 ms. La tarea individual más larga del hilo principal es de 43.650 ms. El intervalo entre llamadas al `draw()` del Worker gráfico alcanza **1127.060 ms**.

| Pipeline | Malla identificada por inventario | Duración completa del scope |
| --- | --- | ---: |
| `Material_0_1462` | Cuerpo `Guardian`, 11 963 vértices, skinned | 361.031 ms |
| `Batched painted facial details_1465` | Detalles faciales, 134 vértices, skinned | 281.665 ms |
| `Original wood facial atlas_1464` | Rostro con atlas, 576 vértices, skinned | 262.655 ms |
| `Carved painted Guardian lids_1463` | Párpados, 5060 vértices, skinned | 108.628 ms |
| `MeshBasicNodeMaterial_1466` | Malla auxiliar sin nombre, 864 vértices | 47.376 ms |

Los scopes completos pueden empezar fuera de la ventana; por eso su suma difiere de la ocupación recortada de 1035.035 ms. El material auxiliar no debe identificarse más precisamente sin evidencia adicional.

El Worker solicita estos cinco pipelines entre +4880.706 y +4997.860 ms, antes del intervalo largo. El proceso gráfico ejecuta después la traducción y compilación. **La duración de la llamada JavaScript a WebGPU no representa el coste completo posterior.**

Las solicitudes interceptadas del Worker del mundo son:

| Captura | `createShaderModule` | `createRenderPipeline` | `createRenderPipelineAsync` |
| --- | ---: | ---: | ---: |
| `bounded` | 17 | 11 | 0 |
| `no-legacy` | 18 | 12 | 0 |

Son llamadas, no una cuenta de programas únicos: algunos labels se repiten. La instrumentación no intercepta otros Workers; el registro Dawn sí abarca todo el navegador. El camino observado de primera utilización sigue solicitando creación síncrona de pipelines. No está aplicando a estos materiales el contrato deseado de preparar asíncronamente y sustituir únicamente cuando estén listos.

## 3. Control con el dibujo antiguo desactivado

La segunda ejecución usa exclusivamente la opción existente de diagnóstico para omitir el dibujo antiguo del mundo cuando WebGPU está activo. No se cambia código de producción ni se elimina todo contexto WebGL de la aplicación.

**No hay eventos `GLES2Implementation::GetProgramiv` dentro de la segunda ventana.** Sin embargo, persisten los siguientes intervalos:

| Intervalo relativo | rAF principal | Pipelines dentro de la ventana | DXC anidado | Mayor tarea principal |
| --- | ---: | ---: | ---: | ---: |
| +773.450 a +1006.785 ms | 233.335 ms | 200.757 ms | 181.985 ms | 8.508 ms |
| +1506.765 a +1806.770 ms | **300.005 ms** | 297.898 ms | 281.341 ms | 5.659 ms |
| +1806.770 a +2340.130 ms | **533.360 ms** | 509.910 ms | 476.427 ms | 18.136 ms |

En las dos últimas ventanas se crean el cuerpo del guardián (262.845 ms), el atlas facial (184.665 ms), los párpados (155.403 ms), los detalles faciales (109.742 ms) y dos materiales auxiliares (~48–49 ms cada uno). Un scope atraviesa el límite entre ventanas: no se debe contabilizar dos veces.

El `draw()` del Worker gráfico presenta intervalos de **272.005 y 533.293 ms** en esa misma zona. No es solo un retraso del observador rAF de la página. Sigue siendo una medida de callbacks, no una medición de imágenes físicamente presentadas en pantalla.

Esto demuestra que el coste de compilación persiste con el dibujo antiguo omitido y coincide estrechamente con interrupciones de presentación, mientras el hilo principal no ejecuta una tarea de duración equivalente. No demuestra que mover una llamada a una promesa vaya a resolver por sí solo la contención del proceso gráfico.

## 4. Latencia de Attack y otras operaciones concurrentes

| Medida | `bounded` | `no-legacy` |
| --- | ---: | ---: |
| Marca de solicitud → observación de confirmación | 3055.905 ms | 843.761 ms |
| Preparación autoritativa de Attack | 1887.190 ms | 759.015 ms |
| Ejecución del comando autoritativo | 5.455 ms | 6.070 ms |

La preparación mide el `await prepareBeastAttack()` del Worker, que admite el animal en la física si aún no está disponible. Abarca cargas y preparación de recursos, no exclusivamente CPU. El coste concreto de cada carga no está separado por esos dos contadores. La confirmación se observa mediante polling del harness: tampoco es el instante exacto del impacto lógico.

En `no-legacy`, la confirmación se observa a +1375.729 ms, **antes** de los dos mayores intervalos gráficos. Por tanto, preparación autoritativa y aparición gráfica son problemas temporales distintos. No deben sumarse como si estuvieran en serie ni interpretarse ambos como coste de navegación.

Otros costes registrados:

- En `bounded`, el intervalo de 366.670 ms (+3349.635 a +3716.305 ms) incluye un `MajorGC` del hilo principal de **55.517 ms** a +3531.956 ms. No contiene creación nativa de pipelines solapada, aunque el Worker ya solicita otro pipeline. Hay trabajo de preparación de materiales y actividad del Worker autoritativo. No hay evidencia para atribuir los 366.670 ms completos al GC ni a una sola operación.
- En toda la captura `bounded`, el muestreo atribuye ~2031 ms a `getMaterialCacheKey`, ~858 ms a `getNodeChildren` y ~254 ms a `getGeometryCacheKey` del Worker gráfico. En `no-legacy`: ~1417, ~608 y ~168 ms. Son estimaciones por muestreo, no temporizadores CPU exclusivos. Recorrer claves de caché no equivale a compilar un pipeline nuevo.
- Continúan serialización, deserialización y reconciliación de estados. En el perfil completo `no-legacy`, el hilo principal registra ~415 ms en `reconcile` y ~241 ms en `deserializeConfirmedState`; el Worker autoritativo ~255 ms en `serializeConfirmedState`. No explican por sí solos el intervalo de 533 ms.
- Los contadores del harness muestran cola visual y comandos pendientes. En `no-legacy` el máximo histórico de publicaciones visuales es 104 y después de confirmar Attack la cola visual medida está vacía, mientras hay 21 comandos pendientes en la autoridad. Esos máximos incluyen arranque y no deben atribuirse automáticamente al intervalo de compilación. Los logs conservan ambos estados y las fuentes de las colas.
- En el intervalo de 233 ms sin dibujo antiguo aparece también `RasterDecoderImpl::DoWritePixelsINTERNAL`: 13.590 ms dentro de la ventana, 36.296 ms de scope completo. La traza no identifica ese recurso como una textura concreta del juego. No es evidencia de que las subidas de texturas sean la causa dominante de los intervalos de 300/533 ms.

Los scopes Dawn, DXC y del servicio GPU son trabajo o espera del proceso host. **No son tiempos de ejecución de shaders sobre los núcleos de la GTX 1660.** No hay base para concluir que la tarjeta tarda medio segundo en dibujar el guardián, ni para atribuir los mayores bloqueos a consultas síncronas de Wild Engine.

## Evidencia y reproducción

En [attack-lag-traces-20261105](attack-lag-traces-20261105/) se conservan las dos trazas JSON comprimidas, metadatos, inventarios, resúmenes con pilas por intervalo, logs y manifiesto SHA-256. Los `.json.gz` pueden abrirse con Perfetto. Se verificó que descomprimir cada archivo reproduce el hash del original.

```powershell
# Terminal 1: servidor utilizado en la captura
.\.cache\tooling\node20.exe node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5194

# Terminal 2
$env:PLAYWRIGHT_MODULE='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:QA_BASE_URL='http://127.0.0.1:5194'
$env:QA_NATIVE_GPU='1'
$env:QA_EXPECT_GPU='GTX 1660'
$env:QA_BATCH='16'
$env:QA_SHARED_GLB='0'
$env:QA_SKIP_LEGACY_DRAW='0' # 1 para omitir el dibujo antiguo
$env:QA_TRACE_PATH='.cache/attack-lag-replay.json'
.\.cache\tooling\node20.exe tools/experiments/audit_worker_ui_causal_attack.mjs --direct
.\.cache\tooling\node20.exe --max-old-space-size=8192 tools/experiments/analyze-raid-stall-trace.mjs .cache/attack-lag-replay.json

# Reanalizar directamente una captura conservada
.\.cache\tooling\node20.exe --max-old-space-size=8192 tools/experiments/analyze-raid-stall-trace.mjs docs/guardian/attack-lag-traces-20261105/no-legacy.json.gz
```

La traza se detiene al terminar la observación o aproximadamente a los 10 segundos; detenerla es idempotente. El límite es diagnóstico y evita desbordar el buffer; no limita las tareas del juego. Un intento anterior sin ese límite produjo `dataLossOccurred:true` y queda excluido de las conclusiones. Sus archivos permanecen locales en `.cache/attack-lag-20261105.*`. Un intento de control se canceló antes de capturar por un fallo del comando de preparación; tampoco aporta medidas.

Los únicos cambios de esta tarea son instrumentación, análisis y documentación. No se ha desactivado la comprobación de errores de shaders, alterado los materiales, añadido precargas, cambiado las colas ni optimizado ningún subsistema. Queda identificado qué ruta bloquea, qué materiales se compilan y qué trabajo continúa alrededor; la corrección debe partir de esa evidencia.
