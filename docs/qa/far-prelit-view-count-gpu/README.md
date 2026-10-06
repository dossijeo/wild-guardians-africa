# GPU: ocho frente a dieciséis vistas precocinadas

Prueba aislada nativa, fuera del gameplay. Variante compareViews=1 sobre lighting=real&prelit=rotations&haze=1&resolution=128; benchmarkPhase=dawn activa amanecer. Botón Medir ocho/dieciséis vistas.

Se precargan ambos pares de atlas en GPU antes de medir. Un único shader cambia uPrelitViews y samplers: no recompilación entre brazos. Día/noche de ambos pares permanecen residentes en ambos brazos; NO compara RAM ni presupuesto final. Uniforme de columnas no cambia distribución, orientación, resolución ni cantidad de lecturas. Migración de región conserva samplers y número de vistas seleccionado; texturas adicionales se liberan al cerrar.

Dos ejecuciones, mediodía y amanecer(uNight=0.5). Cada una ocho lotes [8,16,16,8,8,16,16,8],1008 árboles, cámara[0,25,100],1280×720,DPR1,45 frames warmup+180 muestras por lote. No edits/builds/tests durante lotes. Misma geometría,2 draw calls,3 programas,9 texturas. Todas1440 queries por ejecución resueltas, cero disjoint/GL0, consolas vacías. Datos brutos y resumen adjuntos.

Mediana de medianas: mediodía8=1.4434ms,16=1.4902ms (+3.24%,+0.047ms); amanecer8=2.0664ms,16=2.0861ms (+0.96%,+0.020ms). Los p95 fluctúan mucho, aproximadamente5.6–7.6ms; no se acredita equivalencia de colas ni coste nulo. Tampoco son FPS de partida ni rendimiento móvil. Variar contenido texel y tamaño/caché de textura puede modificar coste aunque se mantengan lecturas.

Decisión: conservar ocho vistas como defecto. Dieciséis continúa como candidato visual opcional; no adoptarlo globalmente alegando ausencia de penalización. Falta rotación continua, percepción de ghosting, GPU móvil y presupuesto de memoria integrado antes de elegir por calidad.

20 pruebas de matemáticas, normales, regiones y cancelación pasan(532.48ms); validación de sintaxis y diff sin errores.
