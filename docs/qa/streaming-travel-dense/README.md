# Traveling sobre finca densa: primera medición

Restauración del archivo histórico Gran Río/Suajili de cien noches con código
actual `8dcd77a0`, calidad media, Intel UHD, viewport1280×720 y buffer1600×900.
1257 plantas vivas (23700 registros), 34 trabajadores y un centro; simulación
pausada, cámara desplazada180m durante15s. Es una prueba de render/streaming,
no una nueva campaña de cien noches ni una medición de trabajadores en movimiento.

153 intervalos: p50 83,1ms, p95 216,2ms, p99 432,1ms, máximo648,6ms;
46 superan100ms. CPU render: p95 41ms, máximo646,1ms. Cinco renders exceden100ms
con incrementos de programas; esta correlación requiere instrumentación para
atribuir la causa. Quince chunks nuevos instalados en3–5,1ms; cero fallos,
fallbacks, errores o frames ocultos. Estado lógico serializado idéntico.

Timer queries asíncronas disponibles, sin disjoint ni pendientes: incluyen
world.render, no preparaciones asíncronas externas ni compositor. No comparación
A/B, mejora demostrada ni aceptación de estabilidad. Cuatro campañas CPU de
fondo permanecían activas; una sola escena gráfica QA estaba abierta.

El informe completo conserva frames, tareas largas, GPU y coordenadas. La captura
corresponde al final del recorrido, no demuestra ausencia de popping durante él.
Pendiente trazar compilación/primer dibujo y recursos nuevos, luego contrastar
candidatos con recorrido y estado iguales, sin reducir calidad para aprobar.
