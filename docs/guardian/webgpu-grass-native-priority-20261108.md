# Admisión gráfica con prioridad acotada

Fecha: 2026-11-08. La admisión WebGPU permite indicar `priority: 'visible'` al preparar objetos; el valor predeterminado es `normal`, por lo que los consumidores actuales conservan FIFO. Se atienden como máximo dos solicitudes visibles antes de una normal pendiente, con FIFO dentro de cada clase. Si una normal llega después de una racha de visibles, se atiende en el siguiente turno disponible. Una compilación iniciada no se interrumpe; cancelaciones, validaciones y reintentos siguen las reglas existentes. El límite es de **turnos**, no de tiempo: una compilación o un flujo continuo de solicitudes anteriores pueden tardar sin una cota temporal demostrada.

La infraestructura no activa ni da prioridad automáticamente a la hierba. Las pruebas dirigidas cubren orden, cancelación, prioridad, llegada durante una racha y garantías anteriores. Pasaron 99 pruebas de admisión y de hierba con la implementación normal restaurada; también se compiló el producto. No se ha demostrado que esta política resuelva los tirones globales.

## Prueba con el Worker de hierba experimental

Se aplicó temporalmente [el prototipo de generación auxiliar](webgpu-grass-worker-reuse-20261108.md). En A se utilizó FIFO; en B, QA asignó `priority: 'visible'` a las solicitudes de hierba y verificó la intercepción. Todas las ejecuciones usaron la misma captura de sabana, WebGPU temporal y 10 s nominales, con tres inspecciones asíncronas. Después se retiró el parche experimental.

| Ejecución | Hierba visible inicio → final | Preparaciones completadas inicio → final | Retraso visual intermedio / final, s | Publicaciones temporales pendientes al final |
| --- | --- | --- | --- | --- |
| A1 | 0 → 0 | 217 → 275 | 2,00 / 4,75 | 21 |
| B1 | 12 → 13 | 252 → 352 | 2,10 / 5,15 | 30 |
| B2 | 12 → 13 | 247 → 347 | 2,20 / 5,30 | 32 |
| A2 | 0 → 0 | 219 → 304 | 1,95 / 4,85 | 19 |

La prioridad permitió mostrar cobertura durante la ventana y la cola continuó completando preparaciones. Los contadores incluyen todas las clases y no miden por separado la espera de cada recurso. La diferencia de cobertura invalida esta serie como comparación de FPS o equivalencia visual; las secuencias también difieren. El retraso continuó siendo de varios segundos. No se midió GPU ni memoria y no hay garantía de ausencia de inanición temporal ante una compilación bloqueada. El escenario no valida todos los biomas, cambios de cámara o recuperación del Worker. No se activa el Worker auxiliar hasta cubrir esos límites y comparar con la presentación de producción en condiciones equivalentes.

Datos: [A1](webgpu-grass-native-priority-a1-20261108.jsonl), [B1](webgpu-grass-native-priority-b1-20261108.jsonl), [B2](webgpu-grass-native-priority-b2-20261108.jsonl), [A2](webgpu-grass-native-priority-a2-20261108.jsonl). El guardado de QA recibe versión espacial y pausa en una copia; existían cambios locales ajenos, por lo que el commit no reconstruye exactamente ese entorno.

## Reproducción

Aplicar el parche de hierba con `git apply --unidiff-zero tools/experiments/grass-worker-reuse-experiment.patch`. Iniciar Vite con `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true` y `VITE_WEBGPU_TEMPORAL_GRASS=true`; ejecutar `tools/experiments/measure_webgpu_native_horde.mjs` con `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_GRASS_WORKER=1` y `QA_OUT_FILE`. Añadir `QA_GRASS_NATIVE_PRIORITY=1` solo en B. No usar `QA_REQUIRE_VISIBLE_GRASS=1` si se quiere conservar la observación de ausencia de cobertura en A. Retirar el parche al terminar.
