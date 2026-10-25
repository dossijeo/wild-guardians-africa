# Ribera de Gran Cañón durante streaming

Recorrido instrumentado origen → Z+96 → Z+192 → origen, repetido día/noche para control y candidata. Semilla 712, media 1280×720; 16 capturas reales. No es animación continua ni benchmark FPS. Capturas tras esperar chunks/horizonte y renderizar.

Auditoría: ocho parejas coinciden en cámara, objetivo, hora, claves de chunks, draw calls y triángulos; sin errores registrados. En todas las paradas hay 25 chunks y 25 máscaras poseídas. Al regresar coinciden las claves originales; no crece el inventario de máscaras en estos dos recorridos. No demuestra ausencia de fugas prolongadas. Las capturas desplazadas conservan la banda de sedimento y el terreno seco; el borde geométrico del agua permanece duro. No se certifica todavía transición visual al horizonte a todas las distancias.

La candidata construye 25 máscaras iniciales y 40 por recorrido adicional: total105, 28.40ms acumulados. Primeras25:8.20ms; streaming diurno40:9.30ms; nocturno40:10.90ms. Son tiempos instrumentados de la función de máscara, no latencia completa ni trabajo por frame.

Tiempo de espera de chunks/horizonte + render + inventario para las tres paradas desplazadas: control día512.9/502.5/897.0ms, candidata527.1/428.1/798.2ms; control noche445.6/502.8/882.4ms, candidata477.1/429.7/896.6ms. Una ejecución por variante y fase, con grandes saltos de cámara: no atribuir diferencias a optimización ni convertirlos en FPS. Incluye preparación ajena al material.

La diferencia inicial de texturas68/59 converge a57/56 al regreso, y esos valores se repiten al finalizar noche. Geometrías156 inicialmente y88 al retorno en ambas variantes. El historial de carga/descarga influye en los contadores; no se afirma ahorro VRAM. Pendiente aislar historial de subidas para una atribución causal del benchmark estacionario.

Corrección del arnés: la primera ejecución canyon-bank-streaming importaba el inspector después de renderizar y antes de leer el canvas; sus capturas salieron negras. Se excluye de validación visual. V2 importa antes de renderizar y no espera entre render y lectura. El auditor ahora rechaza capturas uniformes. Se corrige también trace-canyon-bank-resources para futuras ejecuciones; sus datos de recursos previos siguen siendo diagnósticos, no pruebas visuales.

Reproducción: `node tools/experiments/trace-canyon-bank-streaming.mjs`; `python tools/experiments/audit-canyon-bank-streaming.py`. Datos en captures.json y summary.json, ocho láminas day/night-N-pair.webp. Control izquierda, candidata derecha. Conservar candidata QA, no habilitar por defecto: sobrecoste estacionario ya documentado y movimiento continuo/horizonte pendientes.
