# Deduplicación de tareas de cultivos por paso de crecimiento

Cambio respecto a main 9980b5e: la pasada síncrona de cultivos construye, solo si necesita solicitar alguna tarea, un índice local por tipo e ID de cultivo. Evita recorrer toda la cola por cada cultivo pendiente de riego. El índice incorpora también las solicitudes nuevas del mismo paso y desaparece antes del procesamiento de trabajadores e incursiones.

No cambia el orden FIFO, la deduplicación entre centros, las reservas, los IDs, los contadores ni la lógica de cosecha automática. Los caminos que pueden borrar o reconstruir tareas conservan la función original; no hay caché persistente que restaurar o invalidar.

## Verificación

- `node --test tests/crop-task-queue.test.js tests/task-reservations.test.js`: 8 pruebas aprobadas. Incluye 300 pasadas variadas comparadas contra cada resultado y estado completo de la función original; tareas reservadas, centros distintos y reconstrucción de colas.
- Suite ampliada de agricultura, cultivos, ciclo de vida y trabajadores: 102/102 aprobadas. Archivos y resultados constan en `expanded-tests.txt`.
- Build y paquete web aprobados: 586 archivos, 388055561 bytes, 859 enlaces relativos y 20 GLB de runtime.
- `node tools/benchmark_crop_queue.mjs`: diez muestras temporizadas por tamaño tras cuatro calentamientos, orden alternado y comparación completa del estado de ambas colas. Medianas de esta operación CPU: 32 cultivos 0.03985 → 0.03335 ms; 256, 0.68755 → 0.18845 ms; 1024, 8.78345 → 0.50665 ms; 4096, 156.8389 → 1.8577 ms. Es una carga sintética de deduplicación, no una medida del fotograma ni una promesa de FPS.
- `node tools/check_integrated_load.mjs --warm-navigation --trace`: terreno y navegación reales de Sabana/Mapungubwe, seed 712, 32 plantas y ocho trabajadores pagados, cinco animales, crédito QA explícito y daño preparado del centro. Referencia congelada en 9980b5e y candidato: 1630 pasos, 161 búsquedas de ruta y hash de toda la trayectoria serializada idéntico `9ea59d5816db79085aafff2ec796d4322ab680afde6209555befa8d0baf0fd54`. Los eventos y el estado final coinciden. La muestra termina tras la incursión; no representa una campaña de 100 noches ni prueba renderizado o audio.

## Límites y siguiente trabajo

Persisten picos de rutas completas: máximo tick de 573.8 ms en referencia y 504.5 ms en candidato. Estas dos ejecuciones no aíslan una mejora de frametime y no se atribuye su diferencia al índice. La optimización elimina un recorrido repetido al escalar las plantaciones; los picos de pathfinding requieren trabajo adicional. La verificación de móvil físico y las campañas extensas siguen pendientes.

`source-hashes.json` identifica los archivos del candidato; `reference.json` identifica la referencia. CI debe evaluarse en el commit publicado, independientemente de estas pruebas locales.
