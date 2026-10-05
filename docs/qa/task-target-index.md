# Búsqueda compartida de objetivos de tareas

`reserveTasks` concatenaba cultivos, cajas y estructuras para buscar el objetivo de cada tarea sin trabajador. Los cultivos recogidos y las cajas entregadas siguen formando parte del estado guardado: ese historial se copiaba repetidamente aunque solo hubiera unas pocas tareas activas.

La reserva ahora reúne los identificadores pendientes y los resuelve en un recorrido compartido de las tres colecciones. Conserva la primera coincidencia y el orden de prioridad cultivos/cajas/estructuras. El índice es local a la llamada, no se guarda ni persiste entre frames. Las altas posteriores, recargas y cambios de estado se vuelven a leer en la siguiente reserva. No cambia salarios, tiempos, alcance, rutas, daño ni orden FIFO.

`node --test tests/task-reservations.test.js tests/worker-first-task.test.js tests/intensive-farm-policy.test.js` pasa ocho pruebas. La comparación con el algoritmo previo incluye 500 escenarios de FIFO, empates, accesibilidad y contratos, y una finca con 14.558 cultivos históricos y 14.095 cajas, tareas de cultivo, cajas sueltas y reparación. También comprueba nuevas entidades en una segunda reserva, apertura física del primer contrato, regreso tras incursión, cultivo responsable y derrota por mala gestión.

Esta evidencia acredita equivalencia de reservas y elimina las copias por tarea en el código. No mide FPS, frametime de GPU ni rendimiento de un teléfono. Las campañas ya activas conservan el módulo que cargaron al comenzar y no prueban esta revisión posterior.

## Medición aislada de CPU

`node tools/benchmark_task_reservations.mjs` compara la implementación anterior con la actual usando 14.558 cultivos históricos, 14.095 cajas, cien tareas pendientes y cuarenta trabajadores. Alterna el orden de ejecución, descarta cinco ensayos de calentamiento y registra veinte muestras. La preparación y clonación quedan fuera del intervalo; después de cada par compara el estado completo. La accesibilidad devuelve true, por lo que no incluye A*.

El resultado archivado en `task-target-index-benchmark.json`, obtenido con Node v20.11.0 en este equipo mientras otras verificaciones estaban activas, registra medianas de 40,6118 ms antes y 1,61995 ms después. Los percentiles 90 son 47,8028 y 2,4247 ms. Es una medición sintética de reserva, no del frame completo, de una finca renderizada ni de un dispositivo móvil. No se convierte en una promesa de FPS ni en un umbral de tests.
