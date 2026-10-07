# Checkpoints de colas bloqueadas en nuevas campañas intensivas

Las campañas vivas de Gran Cañón y Sabana muestran muchas tareas bloqueadas,
pero sus resúmenes no contienen las posiciones/tareas necesarias para reproducir
el atasco. Este cambio de herramientas QA guarda el contexto cuando se observa
una cola representativa. No cambia el juego, estrategia, reloj ni navegación.
Las campañas anteriores mantienen sus fuentes congeladas, sin reiniciarlas.

`tools/check_intensive_case.mjs` invoca el capturador únicamente al emitir un
heartbeat. Por defecto necesita al menos 128 tareas bloqueadas y un empleado
idle sin tarea, incapacitación ni contrato vencido, dentro de su jornada.
No captura durante incursión, pausa o partida terminada. Conserva el primer
caso y el mayor backlog **capturado**, con cinco minutos de separación mínima.
No supone que una tarea marcada como bloqueada sea imposible de ejecutar.

Solo quedan dos pares de archivos por caso: `*-blocked-first-state.json.gz`
y `*-blocked-first.json`, y sus equivalentes `latest`. El primer caso se
conserva; latest se sustituye al observar una cola mayor. La partida usa el
serializador validado y mantiene toda la historia. El recibo incluye política
de captura, empleados disponibles, seed/receta/profile del terreno, bounds,
vista de incursión, hashes de los bytes y estado, y procedencia de la campaña.
La procedencia también incorpora el hash de la herramienta nueva.

Se escribe primero el snapshot y después el recibo mediante archivos staging.
Un lector comprueba ambos hashes: un reemplazo interrumpido puede dejar un par
temporalmente inválido, pero no se acepta como evidencia coherente. Los nombres
de archivo se validan y no permiten salir de su directorio.

Para investigar un recibo:

```powershell
node tools/check_watering_route_diagnostics.mjs RUTA/gran-canon-mapungubwe-blocked-latest.json .cache/backlog-replay/report.json 100
```

El diagnóstico verifica el snapshot y restaura bounds/vista para los dos
brazos. Rechaza una receta/profile distintos del constructor actual en vez de
simular otro terreno silenciosamente. Compara el estado completo por tick con
y sin contadores. **No restaura cachés de navegación ni el cursor de la
estrategia del jugador**; es una reproducción de tareas con navegación fría,
no una medición idéntica del proceso vivo ni una continuación de su estrategia.

## Validación

- 16 pruebas dirigidas aprobadas: selección y frecuencia de capturas,
  disponibilidad/jornada, ausencia de referencias vivas y mutaciones, disco
  fallido, dos slots, snapshot truncado/nombre inseguro, CLI nativa con contexto
  y rechazo de profile distinto; heartbeat y observador de riego.
- Dos campañas ordinarias de un día, Sabana y Gran Cañón / Mapungubwe: estado
  completo idéntico en cada uno de 380 y 379 ticks con/sin capturador; 38 y 23
  entregas físicas. Se bajó solo el umbral QA a una tarea para buscar cobertura.
  **No dispararon capturas**: la persistencia positiva se verifica con fixtures
  controladas y un roundtrip manual de snapshot histórico, no con un atasco
  nativo reproducido. Ambas campañas pasan la auditoría intensiva.
- CLI normal `check_intensive_case` para Sabana / Mapungubwe, un día, terminó
  `passed` con la procedencia nueva; ningún checkpoint fue necesario.

Los logs, hashes y resultados están en esta carpeta. No son aceptación de cien
noches, benchmark CPU/GPU, ni solución del atasco de día 76. Las campañas CPU
previas y la validación visual de modelos fueron concurrentes; no se publican
tiempos de rendimiento. La integración de impostores tiene su propia suite.
