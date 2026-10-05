# Trabajo de simulación sobre historial inactivo

La actualización de cada trabajador concatenaba todas las plantas, cajas y estructuras al buscar el objetivo de su tarea. Ahora busca sucesivamente en las tres colecciones, conservando la misma prioridad y primera coincidencia, sin crear esa copia conjunta. No persiste un índice entre actualizaciones y sigue viendo las entidades nuevas.

El bucle de crecimiento omite inmediatamente las plantas que ya no están vivas. Antes estas entradas no podían crecer, madurar ni generar tareas, pero todavía se evaluaba si había magia de crecimiento sobre ellas. Los cultivos recogidos o destruidos, sus riegos, las cajas, el libro monetario y los identificadores siguen presentes en el estado. No se reduce el historial para facilitar el guardado.

Se ejecutó una campaña nativa intensiva de tres noches de sabana / Mapungubwe, semilla 712, antes del cambio sobre `3851658` y después con la modificación de `game.js`. Se compararon las filas diarias, todos los contadores de eventos y el SHA-256 de la serialización completa, tras la auditoría ordinaria de semillas, riegos, cajas y dinero. El resultado coincide exactamente: 151.796 caracteres de estado, hash `2e3a31cb41bb301079b641a135810973ea9715ca05ec0dd3c7272ee66716358d`. El informe se conserva en `inactive-history-equivalence.json`.

Pasan 42 pruebas dirigidas de juego, cosecha automática, reservas FIFO, primer destino del trabajador y persistencia de multiplicación. La suite de 1.748 pruebas anterior corresponde a la optimización precedente de reservas: no se atribuye retrospectivamente a estas dos modificaciones posteriores.

La equivalencia es de simulación; no mide FPS, GPU, teléfono ni almacenamiento nativo del navegador. Las campañas largas ya activas siguen utilizando los módulos que cargaron al empezar y tampoco se consideran prueba de esta revisión posterior.
