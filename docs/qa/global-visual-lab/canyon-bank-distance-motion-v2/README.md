# Alejamiento de cámara: ribera y horizonte

48 posiciones por variante y fase, control/candidata, día/noche: 192 capturas de renderer, 96 parejas auditadas con idénticas cámaras, hora, draws y triángulos. Sin errores registrados. Vídeos side-by-side de 4 segundos a12fps, control izquierda; son capturas offline con chunks asentados, no reproducción de rendimiento real ni prueba de tirones.

El recorrido v2 mantiene X y se aleja en Z/elevación para conservar el río en imagen. La primera trayectoria diagonal atravesaba las paredes y activaba ocultación por dithering: no se usa para validar la ribera. Se conserva localmente como diagnóstico de encuadre.

Inspección de vistas intermedias y lejanas: en el fotograma36 diurno hay un corte transversal de tono entre suelo cercano oscuro y suelo lejano claro junto al río. Existe tanto en control como candidata. El sedimento añade su banda local pero no explica esa discontinuidad principal. No se da por validada la transición al horizonte. La causa concreta (material, iluminación/sombras o combinación) necesita aislamiento; no atribuirla automáticamente a la máscara nueva.

Recomendación: conservar candidata local y vídeos, sin integración por defecto. Siguiente trabajo: aislar material e iluminación del terreno lejano frente al cercano antes de elegir un fade; atenuar solo sedimento no resuelve el defecto ya presente en control. No cambiar siluetas ni geometría autoritativa.

Archivos: day-pair.mp4, night-pair.mp4, láminas0/12/24/36/47, captures.json y summary.json. Los PNG individuales permanecen como salida local reproducible. Reproducir con Vite5190, `node tools/experiments/capture-canyon-bank-distance-motion.mjs`, `python tools/experiments/package-canyon-bank-distance-motion.py`. No nuevo benchmark; costes en canyon-bank-proximity-v3.
