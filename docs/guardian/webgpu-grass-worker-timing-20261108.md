# Latencia de ida y vuelta del Worker de hierba

Fecha: 2026-11-08. Para descomponer la [medición anterior](webgpu-grass-worker-transfer-20261108.md), el Worker auxiliar acepta una marca optativa de diagnóstico. Solo cuando la solicitud la pide devuelve los instantes de inicio y fin de generación; el protocolo ordinario conserva la misma respuesta y buffers. La instrumentación de QA de la cola calcula los intervalos con `performance.timeOrigin + performance.now()` de ambos Workers y rechaza cronologías inválidas. Pasaron 11 pruebas dirigidas, incluida la comparación del resultado real con y sin marcas.

Dos incursiones instrumentadas de sabana usaron WebGPU y el Worker optativo del juego, sin interceptar el script del Worker anidado. Cada una observó 35 respuestas cronometradas y ninguna marca inválida; la hierba permaneció visible. Los contadores incluyen arranque y preparación, además de la ventana de prueba. La instrumentación añade trabajo de contabilidad y no permite comparar FPS.

| Intervalo, 35 respuestas | A: media / p95 / máximo, ms | B: media / p95 / máximo, ms |
| --- | --- | --- |
| Desde la solicitud hasta iniciar el Worker auxiliar | 1,33 / 2,30 / 3,46 | 1,47 / 3,22 / 8,26 |
| Generación en el Worker auxiliar | 41,9 / 70,8 / 87,3 | 43,1 / 71,9 / 103,7 |
| Desde fin de generación hasta procesar la respuesta | 121,8 / 290,1 / 1.654,4 | 114,6 / 270,8 / 1.669,3 |
| Ida y vuelta completa | 165,0 / 328,8 / 1.728,7 | 159,2 / 307,7 / 1.738,3 |

Los dos máximos superiores a 1,6 s ocurrieron en la segunda respuesta, antes de la primera inspección de la ventana, durante preparación o arranque. Después de la primera inspección se observaron 20 respuestas por ejecución: el intervalo entre fin de generación y recepción tuvo media/p95/máximo de 105,8/290,1/311,2 ms en A y 96,2/270,8/295,4 ms en B. La generación correspondiente tuvo media de 36,0 y 34,6 ms. El p95 es un rango inferior sobre muestras escasas y se incluye solo como descripción de esta captura.

El intervalo posterior al cálculo incluye la llamada de transferencia, la planificación del navegador y el tiempo hasta que el Worker gráfico puede atender su evento. No mide cada componente por separado y no demuestra por sí mismo que todo el tiempo sea dibujo o compilación. Junto a la [traza del Worker gráfico](webgpu-worker-task-classification-20261108.md), sí orienta la siguiente investigación hacia las tareas largas que impiden procesar respuestas, en lugar de atribuir el máximo al generador de hierba. No se ha demostrado una mejora de rendimiento ni resuelto el retraso de presentación.

Datos: [A](webgpu-grass-worker-timing-a-20261108.jsonl) y [B](webgpu-grass-worker-timing-b-20261108.jsonl). Las lecturas de estado y el tiempo de simulación son asíncronos. La captura usa una copia de QA del guardado con versión espacial y pausa añadidas, y había cambios locales ajenos; la memoria real total y el tiempo GPU no se midieron.

Para reproducir usar las variables del [informe de transferencias](webgpu-grass-worker-transfer-20261108.md), incluida `QA_GRASS_TRANSFER=1`; la herramienta exige marcas válidas y al menos una respuesta. Ejecutar `node --test tests/grass-transfer-instrumentation.test.js tests/grass-generation-queue.test.js tests/grass-chunk-data.test.js` para las pruebas de protocolo y contabilidad.
