# Diagnóstico de oportunidades de dibujo durante altas Farm

Continúa la [cancelación de altas](native-farm-birth-cancellation-20261120.md) y el hueco histórico de168,275ms. Se amplía únicamente la auditoría existente con trazado CDP opcional y un analizador de los cuatro propietarios reales. No cambia producto, reloj, RAF, ABI, arquitectura o dependencias. A6/A/B/C siguen abiertos; D no iniciado y f-R3 conserva seguridad.

## Fuente contrastada y decisión

Se leyó código real de Chromium: [WorkerAnimationFrameProvider](https://github.com/chromium/chromium/blob/6937cb76b634b8f44877a3e9443b30baddf28c5f/third_party/blink/renderer/core/animation_frame/worker_animation_frame_provider.cc), [BeginFrameProvider](https://github.com/chromium/chromium/blob/239146a5270f1f7d59859a1042868fc09aa34903/third_party/blink/renderer/platform/graphics/begin_frame_provider.cc) y [TracingHandler](https://github.com/chromium/chromium/blob/a2255167f5eb7c5789a74919e5a627ba741e8288/content/browser/devtools/protocol/tracing_handler.cc). El primero despacha RAF mediante una microtarea y comprueba presión de los canvas; el segundo descarta plazos vencidos y aplica su política de frecuencia; el tercero devuelve el stream y el indicador real de pérdida. Son referencias de diseño fijadas por revisión/hash, no una afirmación de que coincidan con el binario de Edge utilizado; cada análisis conserva user-agent y revisión del navegador real.

Se adapta el trazado CDP ya usado en audit_native_first_task_world_owner, con ReturnAsStream, IO.read/close y un performance.mark para correlacionar relojes. QA_NATIVE_TRACE=true lo activa; QA_NATIVE_CAPTURE_MODE=timing evita PNG/readback. El analizador identifica draw, prepare, authority y observer por sus FunctionCall reales, verifica historia completa, separa ventanas e informa márgenes de los extremos. Cuenta solo fases X: los eventos de flujo s/f con el mismo nombre no son otras llamadas. Distingue RunTask y microtareas, conserva duraciones de hilo disponibles y no suma ámbitos anidados. No se propone otro scheduler basándose en coincidencias.

## Evidencia y límites

Tres capturas secuenciales NVIDIA/Turing pasan funcionalidad, picking, drenaje real y autoridad viva. En todas se conservan575 IDs invariantes;546 fábricas durante la preparación y6 posteriores corresponden a los contadores del harness, no a una cuota mínima ni exclusivamente a recursos Farm. Cada bloqueo de preparación/commit de1,8s mantiene54 dibujos y54 RAF reales. No hay errores de fuente, navegador, red o GPU. No se ejecutan suites/build concurrentes con las mediciones.

| Captura | Dibujos desde nacimiento hasta comenzar bloqueo de commit | Mayor intervalo de ese tramo | Mayor RunTask de draw en bloqueo inicial |
| --- | ---: | ---: | ---: |
| traced | 506 | 46.035ms | 0.896ms |
| traced-b | 509 | 50.710ms | 1.084ms |
| traced-final | 506 | 49.035ms | 1.217ms |

La segunda ejecución registra50,710ms fuera de los bloqueos. En ese hueco hay una microtarea de draw de19,328ms que incluye WebGPUMailboxTexture::FromStaticBitmapImage de17,067ms y RasterImplementation::WritePixels de17,050ms. No se suman: son ámbitos anidados. El preparador también registra serialización. La coincidencia identifica trabajo de esta ejecución; no acredita la causa única del intervalo ni explica los168ms históricos. El mayor RunTask por sí solo habría omitido esa microtarea.

Las dos capturas iniciales no persistían dataLossOccurred; se conservan como diagnósticos con ese dato desconocido. Al leer TracingHandler se completa el auditor para guardar el recibo real y rechazar pérdida o estado desconocido. La tercera ejecución verifica esa versión final con dataLossOccurred=false. No se borran ni sustituyen las anteriores. La traza añade coste; estos números no aceptan cadencia, ausencia de tirones, rendimiento final ni paridad visual. El control previo de168ms continúa preservado y sin atribución concluyente. No se modifica RAF/prioridades por una hipótesis.

## Estado contrastado y siguiente punto

La referencia de recuperación no termina en el diagnóstico de1893 recursos. Después se implementó y validó [recuperación retenida nativa](native-retained-resource-owners-20261119.md): fixture WALK pausado/en movimiento conserva1355 datos y259 bindings con propietarios reales; sus versiones y demanda nueva están atribuidas. También está comprobada la [reutilización pausada de main](main-retained-resource-reuse-20261119.md), una vez satisfecha la demanda. Repetir esos recorridos como si siguieran sin implementar sería trabajo ya terminado. Esto no cierra el caso global3.123, el coste de preparación/publicación, cohortes pendientes, consumidor fallido, pérdida de dispositivo, VFX autónomos, cadencia o plataformas.

Las altas Farm individuales, dos simultáneas y READY cancelado ya tienen los recibos enlazados desde el plan; no se consideran cobertura de todas las cohortes. Siguiente trabajo: completar la integración y los casos de ciclo de vida restantes sobre esos mecanismos existentes, con investigación de fuente antes de cada cambio arquitectónico. La atribución del control de168ms queda abierta; la instrumentación ahora permite capturar una nueva reproducción con historial y pérdida de datos comprobados, sin realizar una batería de C4 antes de cerrar A/B.

Dos sintaxis pasan; los análisis verifican ancla, hashes, identidad de cuatro hilos, ventanas y conteo de fases. Los689 inputs incluyen una herramienta modificada y otra nueva;687 previos,64 nativos,16 ajenos y38 de A5 permanecen exactos. La regresión/build se heredan explícitamente de c01e659f8, a través del recibo de cancelación, porque no cambió producción. No se presentan como ejecuciones nuevas. [Recibo y archivos reproducibles](performance/native-frame-gap-diagnostics-20261120-validation.json).

Para repetir el análisis, descomprimir el recibo y su trace.json.gz en un mismo directorio, conservar el nombre base y colocar a su lado el trace-complete.json si existe. Ejecutar node tools/guardian/analyze_native_farm_birth_trace.mjs recibo.json salida.json. Las trazas y recibos se archivan con SHA-256 tanto del original como del gzip y se verifica su roundtrip.
