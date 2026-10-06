# Worker reutilizable para preparar texturas

`TextureBitmapWorkerPool` mantiene un único worker de módulo y procesa peticiones en serie. No conserva una caché adicional de Blob ni decodifica varias imágenes simultáneamente. Los bitmaps completados pertenecen al llamador. La cancelación de una petición en cola no afecta a la activa; cancelar la activa termina su worker y permite continuar con uno nuevo. Una transferencia tardía de un worker retirado se libera. Dispose termina el worker y rechaza las peticiones pendientes.

## Comparación aislada

Ocho lotes ABBAABBA: Single crea un worker por textura; Shared reutiliza uno para todas las texturas y lotes Shared. Ambos obtienen el archivo mediante fetch y convierten Blob a ImageBitmap. Se liberan texturas GPU y bitmaps nativos entre lotes; se reutilizan imágenes HTML, shaders y caché HTTP del navegador. El primer lote Shared también incluye el primer arranque de su worker.

| Medida | Single | Shared |
| --- | ---: | ---: |
| Mediana total por lote | 739,25 ms | 655,75 ms |
| Mediana de arranque y despacho por textura | 24,85 ms | 0,30 ms |
| Mediana de conversión por textura | 101,05 ms | 97,85 ms |
| Máximo intervalo de frame por lote | 33,3–49,9 ms | 33,4–33,6 ms |

La mediana total mejora aproximadamente un 11,3 % en esta ejecución. Los ocho lotes terminan con tres programas y cero errores WebGL. `console.json` está vacío. La cadencia es una medida de intervalos del navegador, no GPU elapsed. No se mide memoria ni se acredita rendimiento del juego o de móvil.

La opción sigue desactivada por defecto. La comparación anterior HTML/worker mostró mayor espera total con bitmap, aunque mejor cadencia. Este ensayo compara únicamente dos estrategias de worker y no acredita que Shared supere HTML en tiempo total. Las pausas grandes de ejecuciones anteriores siguen sin causa verificada.

`abba-report.json` conserva la evidencia cruda. Su campo inicial `bitmapWorker` quedó en false porque se tomó antes de activar los controles de la comparación; `workerOnly: true`, los modos Single/Shared y los doce registros de fases de cada estrategia acreditan la ruta ejecutada. La captura `ready.png` corresponde al último lote Single. El código ya corrige ese campo para futuras ejecuciones.

Las colas también están incluidas en el intervalo denominado `startupAndDispatchMs` si un cliente solicita varias texturas a la vez. La prueba del navegador solicita cada textura después de recibir la anterior. La suite verifica reutilización, serialización, cancelación activa/en cola/preexistente, transferencias tardías, errores, fallos del observador y liberación.
