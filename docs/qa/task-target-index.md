# Búsqueda compartida de objetivos de tareas

`reserveTasks` concatenaba cultivos, cajas y estructuras para buscar el objetivo de cada tarea sin trabajador. Los cultivos recogidos y las cajas entregadas siguen formando parte del estado guardado: ese historial se copiaba repetidamente aunque solo hubiera unas pocas tareas activas.

La reserva ahora reúne los identificadores pendientes y los resuelve en un recorrido compartido de las tres colecciones. Conserva la primera coincidencia y el orden de prioridad cultivos/cajas/estructuras. El índice es local a la llamada, no se guarda ni persiste entre frames. Las altas posteriores, recargas y cambios de estado se vuelven a leer en la siguiente reserva. No cambia salarios, tiempos, alcance, rutas, daño ni orden FIFO.

`node --test tests/task-reservations.test.js tests/worker-first-task.test.js tests/intensive-farm-policy.test.js` pasa ocho pruebas. La comparación con el algoritmo previo incluye 500 escenarios de FIFO, empates, accesibilidad y contratos, y una finca con 14.558 cultivos históricos y 14.095 cajas, tareas de cultivo, cajas sueltas y reparación. También comprueba nuevas entidades en una segunda reserva, apertura física del primer contrato, regreso tras incursión, cultivo responsable y derrota por mala gestión.

Esta evidencia acredita equivalencia de reservas y elimina las copias por tarea en el código. No mide FPS, frametime de GPU ni rendimiento de un teléfono. Las campañas ya activas conservan el módulo que cargaron al comenzar y no prueban esta revisión posterior.
