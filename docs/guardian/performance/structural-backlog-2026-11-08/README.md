# Retraso de presentación: diagnóstico y correcciones

Fecha: 8 de noviembre de 2026. Rama: `codex/guardian-3d-animation`.

El retraso creciente de varios segundos tenía una causa de transporte reproducible: la presentación esperaba fronteras de terreno que se enviaban mensaje a mensaje, con una confirmación entre cada envío. Incluso una frontera vacía necesitaba dos viajes de ida y vuelta. Tener los estados disponibles no bastaba para presentarlos. Se ha sustituido este protocolo por fronteras completas con una ventana acotada por cantidad y bytes, sin saltarse eventos ni estados históricos.

Esto corrige la acumulación observada; **no convierte todavía el Worker gráfico en un consumidor ligero ni demuestra una mejora de FPS**. La traza final sigue mostrando trabajo considerable de reproducción histórica y preparación de Three.js en el mismo Worker que dibuja.

## Evidencia reproducible

Edge visible, `headless:false`, backend WebGPU comprobado en el juego y adaptador del dispositivo NVIDIA/Turing, GTX 1660, controlador 32.0.15.8129. Sin SwiftShader. Fixture real: `tests/fixtures/sabana712-d6-native-multi-reservation.json.gz`; hash, muestras y estadísticas en [results.json](results.json).

La comparación final cambia únicamente el transporte de terreno. Ambos lados incluyen la corrección del buffer de VFX y los grafos compartidos. No utiliza la versión anterior que producía fotogramas inválidos. Dos contextos nuevos por variante; orden serial, serial, ventana, ventana. Es una muestra pequeña, no un intervalo de confianza ni una prueba universal.

| Transporte | Ejecución | Desfase a 10 s | Desfase a 20 s | Intervalo gráfico medio | p95 | p99 | Máximo |
|---|---:|---:|---:|---:|---:|---:|---:|
| Serial anterior | 1 | 1,15 s | 1,05 s | 102,9 ms | 269,8 ms | 399,5 ms | 468,9 ms |
| Serial anterior | 2 | 0,75 s | 3,85 s | 94,6 ms | 198,7 ms | 326,1 ms | 452,9 ms |
| Ventana de fronteras | 1 | 0,15 s | 0,35 s | 115,8 ms | 237,7 ms | 405,7 ms | 473,1 ms |
| Ventana de fronteras | 2 | 0,40 s | 0,35 s | 108,5 ms | 210,9 ms | 365,8 ms | 460,6 ms |

Todas estas ejecuciones terminaron sin errores WebGPU. Los intervalos corresponden a entradas consecutivas al bucle del Worker gráfico durante la ventana activa, excluyendo el calentamiento. No son el `requestAnimationFrame` de la interfaz, que ronda 33,3 ms y no describe la fluidez del mundo. Los tiempos de JavaScript son CPU; no se recogieron timestamps GPU ni memoria GPU en esta comparación.

El desfase se muestrea tres veces, mediante inspección asíncrona: incluye la incertidumbre de esa inspección, registrada en el JSON. No debe interpretarse como latencia de entrada ni como p95/p99 de latencia. La diferencia de varios segundos sí se corresponde con secuencias retenidas identificables.

En la ejecución serial que llega a 3,85 s:

- Autoridad: secuencia 388.
- Estados recibidos: hasta 355; 31 pendientes.
- Terreno completo: solamente hasta 324.
- Sin revisiones de terreno pendientes de preparación, sin compilaciones activas y sin elementos en la cola de admisión.

El consumidor no podía aplicar el estado siguiente porque aún no había llegado su frontera vacía de terreno. El cuello de botella estaba en la dependencia del protocolo, no en calcular una ruta ni en preparar terreno nuevo.

La comprobación adicional de 60 segundos terminó con 0,50 s de desfase; a los 30 segundos era 0,10 s. Cero errores WebGPU. Intervalo gráfico medio 112,0 ms, p95 209,8 ms, p99 351,1 ms y máximo 648,6 ms: la fluidez sigue siendo insuficiente. Al entregar más historia a tiempo se ejecuta más trabajo de presentación; no se ha ocultado ese coste descartando historia.

## Causas y cambios integrados

1. **Reloj y transporte de estados.** `1af9c7112` conserva el origen temporal al atravesar publicaciones confirmadas de duración cero y fallbacks con segmentos de reloj válidos. Las fronteras vacías no esperan otra vuelta del dibujo. El canal de estados utiliza créditos de aplicación separados de los recibos de transporte, con límites de publicaciones y bytes.
2. **Transporte de terreno.** `82723e68a` negocia `batchWindow:1`, envía Begin/revisiones/End en un único mensaje transferible y permite varias fronteras pendientes. Un recibo acredita entrega; solo la confirmación lógica devuelve capacidad. Orden, sesiones, tamaños, secuencias y créditos se validan. El protocolo antiguo sigue disponible para consumidores que no negocien la capacidad. No se omiten revisiones, impactos ni eventos.
3. **Relectura de materiales y terreno.** `3bf697438` reutiliza las entradas estructurales de admisión mediante el propietario de claves estables y sus notificaciones. Las mutaciones de bindings y estado fijo invalidan el resultado; los casos sin contrato observable conservan la ruta de referencia. El apoyo visual utiliza directamente la superficie autoritativa cuando se certifica que malla, topología y buffer son exactamente los mismos. Esto elimina raycasts redundantes contra 4.608 triángulos por consulta. Geometrías transformadas, deformadas o desconocidas conservan el raycast. No cambia la física autoritativa.
4. **Programas duplicados por objeto.** `88df26739` expresa los fragmentos rígidos mediante atributos instanciados con nombres estables. `InstancedMesh` incorporaba la identidad de cada objeto a la clave de Three.js: compartir material no bastaba. La instrumentación observó 45 construcciones del programa de fragmentos de suelo; después observa una. La vegetación distante comparte grafos y recibe atlas, dimensiones, distancias y fase nocturna por parámetros. Se mantienen las ocho muestras del atlas y las fórmulas de cobertura. Los contadores `compilesStarted` de admisión cuentan solicitudes, no programas nuevos: el diagnóstico envuelve los fallos reales de la caché de NodeBuilder.
5. **Generaciones de recursos VFX.** Se identificó un dibujo de 432 vértices enlazado a un buffer de 102 vértices (4.488 bytes, stride 44). Crecer los atributos conservando la geometría dejaba bindings antiguos. Cambiar únicamente la geometría tampoco bastaba: el destructor de geometría de Three r180 captura un RenderObject mutable y podía destruir los bindings de la generación nueva. Ahora cada ampliación crea geometría y objeto de dibujo nuevos, conserva el material, crece por capacidad y retira la generación anterior después de admisión/subidas pendientes. Los fotogramas finales se verifican también frente a errores GPU y buffers enlazados, no solamente frente a excepciones JavaScript.

Las corridas `terrain-window`, `window-verified`, `invalid-draw` y `generation-fixed` anteriores a la corrección completa de recursos **no son evidencia válida de rendimiento global**, aunque sus contadores y errores sirvieron para localizar el fallo. Una pantalla vacía por un CommandBuffer rechazado no es una mejora.

## Alternativas arquitectónicas consideradas

| Problema | Alternativas | Decisión |
|---|---|---|
| Retraso del transporte | Ampliar colas; saltar/coalescer historia; enviar fronteras completas con créditos | Créditos: elimina viajes seriales sin perder hechos ni permitir memoria ilimitada. Una cola mayor no elimina la dependencia. |
| Acumulación del reloj | Reiniciar en cada confirmación; acelerar/saltar reproducción; conservar origen y segmentos confirmados | Continuidad temporal: no modifica velocidades ni omite resultados. |
| Programas repetidos | Precalentar todas las instancias; ampliar un pool por objeto; compartir grafo y parametrizar bindings | Grafos estables y atributos por instancia. Pool pequeño de recursos inactivos para pasos, sin simulaciones ni dibujos fantasma. |
| Apoyo visual redundante | Más cachés de raycasts; apoyos aproximados; reutilizar la misma superficie certificada | Certificación por revisión: evita repetir un cálculo equivalente y mantiene fallback para geometría desconocida. |
| Crecimiento de VFX | Reservar siempre el máximo; parche genérico de internals de Three; generaciones inmutables por objeto de dibujo | Generaciones: memoria proporcional a la demanda y retiro explícito, sin depender de invalidaciones privadas incompletas. |

## Qué permanece en el Worker gráfico

Traza final válida: `.cache/structural-backlog-final-trace.json.gz`, 11,108 s, sin pérdida de eventos del trazador. La clasificación incluye solo tareas completas de al menos 50 ms; las categorías son excluyentes por pila, no tiempos GPU ni el coste total de todas las tareas:

| Trabajo en tareas largas | CPU muestreada |
|---|---:|
| Reproducción histórica / timeline | 3.975,5 ms |
| Dibujo y preparación que cuelga del render | 3.754,1 ms |
| Admisión / generación de shaders | 1.150,2 ms |
| Hierba | 59,2 ms |
| Otros | 359,8 ms |

Entre las hojas más frecuentes: `mergeTracked`, `exportWorkCheckpoint`, `previewNextMotionBoundary`, `decodeHistoricalEventBoundaries`, `getNodeType` y `build`. La tarea más larga dura 294,1 ms; 278,4 ms muestreados corresponden a admisión/NodeBuilder. `compileAsync()` sigue realizando generación TSL/WGSL síncrona en el Worker que posee el renderer antes de esperar el pipeline del dispositivo.

Por tanto, **la arquitectura todavía no cumple que todo el trabajo pesado de preparación esté fuera del hilo de dibujo**. Wild Engine no explica esas pilas: el mismo Worker gráfico reconstruye estados de presentación, conserva checkpoints de efectos y genera algunos programas excepcionales. Los grafos compartidos eliminan repetición, pero no trasladan automáticamente estos propietarios a otro Worker. No se declara cerrada la separación total ni se promete que nunca pueda aparecer otro tirón.

No se ha añadido una nueva precarga, reducido calidad, desactivado colisiones ni cambiado reglas para obtener cifras. Tampoco se ha ejecutado aquí una campaña de 100 noches o una auditoría visual completa de todos los biomas.

## Indicador de despertares

`fde8186f3`: el HUD se medía mientras estaba oculto durante carga. Los offsets eran cero y se elegía una fila de emergencia que no se recalculaba en la ruta Worker. Ahora consume los límites ya calculados por el layout, sin medir elementos ocultos. Se eliminan las asignaciones explícitas de `frame_tl`/`frame_tr` y sus pseudo-elementos. No era un cruce de texturas WebGPU.

Captura final de partida real: [game-and-hud.png](game-and-hud.png). A 1280×720: indicador en (584, 8), tamaño 520×92, después del contador de días y antes del menú; pseudo-elemento de esquina `none`.

## Verificación y reproducción

403 pruebas pasadas: créditos, límites por bytes/cantidad, transferencia real de buffers, bootstrap, replay, presión, cancelación, reloj histórico, entradas estructurales, terreno en seis biomas, cobertura de impostores, VFX y HUD oculto. La prueba de crecimiento conserva la identidad de la generación anterior hasta su liberación y comprueba la independencia del nuevo objeto de dibujo.

Con Vite en 5175 y las mismas opciones de producción WebGPU/grass/shared pools, ejecutar en PowerShell:

```powershell
$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:QA_ONLY_SKIP_LEGACY='1'
$env:QA_REPEATS='2'
$env:QA_WINDOW_MS='20000'
$env:QA_QUEUE_DIAGNOSTICS='1'
$env:QA_REQUIRE_GPU='GTX 1660'
$env:QA_OUT_FILE='.cache/reproduce-window.jsonl'
.cache/tooling/node20.exe tools/experiments/measure_webgpu_native_horde.mjs
```

Para el control: `QA_TERRAIN_SERIAL_BASELINE=1`; retirarlo para la ventana. `QA_NODE_BUILD_DIAGNOSTICS=1` registra fallos reales de caché y rangos de vértices. `QA_TRACE_PATH` captura la traza; usar una repetición. Estas dos instrumentaciones añaden coste y no sustituyen las corridas de frametime sin perfilador. El harness invalida cualquier resultado con errores WebGPU, conserva el adaptador real del dispositivo y registra cámara, terreno y colas.
