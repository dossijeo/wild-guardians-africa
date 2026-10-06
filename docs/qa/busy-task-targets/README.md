# Mantenimiento de tareas bloqueadas con plantilla ocupada

Referencia congelada 41a1d94. `reserveTasks` limpiaba cada flag bloqueado buscando su objetivo separadamente en todos los cultivos, cajas y estructuras, aunque no quedaba ningún trabajador disponible. En una partida con mucho historial, esa rama tenía coste proporcional a objetivos por historial.

Ahora reúne los objetivos bloqueados sin reserva y consulta las colecciones una sola vez por llamada. Los objetivos ausentes siguen bloqueados; las tareas reservadas mantienen su flag; los existentes se desbloquean como antes. No se conserva una caché entre llamadas, ataques o cargas. Sin tareas bloqueadas, no se consultan las colecciones históricas. No cambia FIFO, selección de trabajador, navegación ni ritmo económico.

## Evidencia

- 65 pruebas dirigidas correctas: reservas/FIFO, objetivos históricos, mutaciones entre llamadas, evitar consultar historial innecesario, cosecha automática y cadenas físicas de trabajadores, recuperación y reparaciones.
- Doce comparaciones del dominio con terreno nativo: seis incursiones pobladas × 600 pasos y seis primeras jornadas pagadas × 2000 pasos. Estado serializado completo idéntico en los 15.600 pasos y mismo número de búsquedas de ruta. Riego inicial realizado físicamente: ocho cultivos en cinco biomas y dos durante esos cien segundos de Gran Cañón, igual que la referencia. No acredita que los seis restantes estén bien ubicados ni toda la campaña.
- Benchmark aislado sintético con 14.558 cultivos, 14.095 cajas, 1.200 tareas y 114 trabajadores ocupados. Diez pares de calentamiento y diez pares medidos en orden alternado; preparación, serialización y hash fuera del tiempo. Estado completo idéntico por hash en todos los casos.

Mediana de esa operación: **130,88 → 2,59 ms**, mejora en diez de diez pares. Lecturas de IDs: **20.664.410 → 28.654**. El primer ensayo de dos calentamientos mostró cambio de régimen JIT; se descartó su informe y se repitió con diez calentamientos antes de conservar estos resultados.

Los procesos de campañas 20608/36076 seguían activos; no había otras suites, builds ni perfiladores propios durante el benchmark. Las suites y build se ejecutaron después. Esto elimina trabajo innecesario en esa rama, pero no mide frametime del juego, GPU, móvil, RAM ni acredita que esta fuese la causa dominante de la ralentización de la campaña. No modifica los dos procesos ya iniciados ni reinicia sus estrategias.

## Reproducción

Extraer `git archive 41a1d94 src content package.json` en una carpeta de referencia y ejecutar:

`node tools/benchmark_busy_task_targets.mjs <referencia> <salida.json>`

`node tools/check_navigation_query_reuse.mjs <referencia>`

El primer comando mide solo el mantenimiento de reservas ocupadas; el segundo compara trabajo real e incursiones en seis biomas sin render. `benchmark.json`, `native-differential.json`, logs comprimidos y `provenance.json` conservan muestras, hashes y alcance. La build se registra en `build-result.json`/`build.log.gz`.
