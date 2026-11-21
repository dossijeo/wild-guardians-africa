# Prioridad del terreno que necesita Idle20

La autoridad envía la solicitud Idle20 junto con una publicación visual mínima. Surface debe confirmar el terreno de esa publicación antes de preparar el cuerpo. En el control NVIDIA, la vista llegó a la publicación 9 a los 9,06 s y la preparación agotó su plazo de 10 s. La traza anterior del chunk `2,0` midió 3.510,4 ms en cola de un ticket de 3.512,5 ms. [Espera en la admisión](performance/native-task-stop-home-graphics-20261120/idle20-startup-publication-wait.json) · [Plan integrado](integrated-gpu-migration-plan-20261104.md).

Los tickets de `prepareBatch` usan la prioridad `visible` del planificador de admisión. Conservan la compilación que ya tiene el turno, el orden de cada clase y el máximo de dos solicitudes visibles antes de dar paso al trabajo ordinario. Los lotes contienen los participantes y dependientes que requiere la publicación de terreno, recuperación o parada nativa. `offer` conserva el recorrido ordinario de los pares individuales.

Godot 4.4 limita la capacidad que pueden ocupar las tareas de menor prioridad en `WorkerThreadPool` y recupera su cola por orden. Wild Guardians aplica la precedencia en el planificador serial que ya controla las preparaciones gráficas. [Código de WorkerThreadPool](https://github.com/godotengine/godot/blob/4.4-stable/core/object/worker_thread_pool.cpp#L192-L227).

## Contraste en frío

Con la prioridad aplicada de forma aislada, los cuatro perfiles llegaron a la publicación visual 9 entre 2,52 y 5,40 s. La espera de terrenos del caso comparable `youngMale` pasó de 9,06 a 4,66 s. Al continuar, el roster detectó que Walk todavía carecía de una instalación. En la captura dirigida, el recurso ya descargado seguía a la espera del instalador mientras el Idle ordinario conservaba el turno. Ambos cambios se integran juntos para validar el arranque hasta su primer dibujo. [Mediciones de prioridad y dependencia Walk](performance/native-task-stop-home-graphics-20261120/idle20-terrain-priority.json).

Con la cola real y un compilador controlado, los controles prueban la precedencia respecto a once solicitudes normales, la ráfaga máxima de dos, la publicación única una vez preparado el lote y la cancelación antes de tocar los siguientes participantes. Pasaron las 214 pruebas relacionadas con la prioridad aislada. [Pruebas del lote](../../tests/webgpu-chunk-batch.test.js).
