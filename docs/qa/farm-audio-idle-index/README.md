# Índices de audio agrícola diferidos

`WorkAudio` y `FarmContactAudio` construían una copia indexada de toda la FIFO en cada actualización, incluso sin ningún trabajador realizando una acción. Ahora la construyen una vez cuando encuentran el primer trabajador `acting`. Caminata, transporte, reposo y huida conservan la limpieza de voces y las colas naturales del sonido de cajas sin recorrer las tareas. Las acciones activas siguen consultando la cola vigente: no se conserva un índice de tareas entre fotogramas.

Validación: 423 pruebas de audio correctas, incluidas 14 nuevas para poblaciones inactivas, transición real desde riego a huida, liberación de voces y reemplazo de tareas. Las pruebas existentes recorren siembra/riego/cosecha de las cuatro clases de trabajadores con simulación real, guardado/carga, contacto físico, interrupciones y descargas tardías. Compilación correcta (10,75 s), con la advertencia habitual de bundle grande. No se modifica el estado lógico, los audios, sus marcadores ni las ganancias.

Diagnóstico reproducible: `node tools/bench_farm_audio_idle.mjs`. Referencia exacta de ambos módulos en `834a07567b972ce4c67ed20afe7c1069de77fe16`, enlazada a dependencias que este cambio no modifica. Cada caso usa 100 trabajadores y 1.000 tareas, cuatro lotes ABBA, 100 calentamientos y 500 muestras por lote. Se comprueba ausencia de cambios de dominio y sonidos espurios; los casos inactivos pasan de 500 lecturas de tareas por lote a cero. Se conservan muestras comprimidas y hashes de código.

| Sistema | Mediana anterior, estados inactivos | Mediana nueva, estados inactivos | Mediana anterior/nueva, acción activa |
| --- | --- | --- | --- |
| Regadera | 0,0872–0,0878 ms | 0,0006–0,0008 ms | 0,0981 / 0,1053 ms |
| Contactos agrícolas | 0,0854–0,0898 ms | 0,0014–0,0020 ms | 0,1345 / 0,1391 ms |

La medición es CPU aislada en Node, con estados sintéticos y sin descodificación ni render. Las campañas largas se ejecutaban simultáneamente. Durante actividad las medianas y p95 son algo mayores en este ensayo; no se acredita mejora allí. El beneficio consiste en eliminar trabajo innecesario cuando no existe contacto agrícola, especialmente con FIFO grandes. No demuestra ganancia de frametime integrado, FPS, RAM, GPU, móvil físico ni escucha. CI de esta revisión pendiente.
