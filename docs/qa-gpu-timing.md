# Temporizador GPU del visor de rendimiento

Instrumentación exclusiva de QA en `tests/browser/gpu-timer.js`, controlada por «Medir GPU (QA)». La clase usa [EXT_disjoint_timer_query_webgl2 de Khronos](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/): consulta elapsed, resultados disponibles tras devolver control al navegador y descarte ante disjoint. No usa finish, fence ni espera bloqueante del resultado. El tiempo en nanosegundos se convierte sin operaciones de 32 bits.

Cada consulta envuelve WorldScene completo, con todos sus pases de render. Se limita a 16 pendientes, se omiten nuevas mediciones ante saturación y se respeta una consulta ajena ya activa. El drenaje final espera como máximo 60 RAF; lo pendiente se libera y declara como unresolvedAtDispose. Contexto perdido invalida las muestras. Ausencia de extensión/contador se declara; una media GPU sin muestras válidas es null. Desactivar la casilla no consulta extensión ni crea queries y se informa como disabled, no como falta de soporte. El render y los controles se restauran al terminar o fallar.

Nueve pruebas significativas con un contexto controlado verifican disponibilidad tardía, precisión superior a 32 bits, disjoint, capacidad, consultas ajenas, asignación fallida, pérdida de contexto, limpieza idempotente, números inválidos y desactivación completa. Estas pruebas no sustituyen el contexto real, que también se verifica.

## Referencia real

Intel UHD / ANGLE D3D11, Sabana/Mapungubwe, media, semilla 712, viewport 1280×720, canvas 1600×900, tiempo simulado cero. Treinta frames de calentamiento y 180 medidos por caso; metadata y muestras GPU individuales en cada informe.

| Ensayo instrumentado | GPU media / p95 (ms) | CPU media / p95 (ms) | Cadencia (FPS) |
| --- | --- | --- | --- |
| Sombras activas | 63,41 / 70,28 | 10,62 / 13,00 | 13,81 |
| Sin sombras, solo diagnóstico | 53,05 / 57,25 | 8,81 / 11,00 | 17,02 |

En ambos: 180 consultas válidas, cero disjoint, descartes, saturación, fallos de asignación o queries sin resolver; estado lógico idéntico. La comparación sin sombras elimina pase y muestreo, por lo que no equivale a una caché de sombra que conserva su muestreo. Son ejecuciones secuenciales con condiciones de carga/potencia no controladas, no una garantía de FPS ni una estimación de bytes residentes de GPU. El intervalo elapsed puede incluir huecos entre comandos; no mide utilización ni separa todavía tiempo de cada pase. La instrumentación también puede influir en la cadencia, por eso se puede desactivar y no se comparan estas cifras como mejora/regresión frente a los antiguos ensayos sin timer. Los resultados señalan trabajo gráfico importante aún pendiente, no prueban el coste de una campaña activa, navegación, audio o hardware móvil.

Evidencia: `docs/qa/gpu-timing/`. Código de producción probado antes de añadir la instrumentación: 596/596 local, build y paquete aprobados. Las pruebas nuevas del profiler se ejecutan aparte; el CI combinado se verificará tras publicar.

El control desactivado se verifica también en navegador: 180 frames CPU, cero muestras/queries GPU, GPU null con reason disabled, estado conservado y controles reactivados. Cadencia observada 14,02 FPS y CPU media 8,99 ms. Esta repetición no acredita ni descarta por sí sola overhead del profiler.

Reactivar la casilla en la versión final produce 180 consultas válidas, sin incidencias ni pendientes: GPU media 46,07 / p95 47,58 ms, CPU 12,53 / p95 14,80 ms y 19,30 FPS observados. Consola sin errores/avisos. La variación respecto al primer caso con sombras (63,41 ms) impide atribuir con precisión a las sombras el delta entre ensayos secuenciales. Se conserva la variación completa; no se reemplaza el primer resultado por el mejor. Hacen falta mediciones por pase y repeticiones con condiciones controladas.
