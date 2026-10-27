# Gran Río: ambiente nocturno a tres distancias

Seis parejas reales, semilla 712, calidad media, 1280×720, día/noche. Control: LOD coherente; candidata: ambiente nocturno fuerte del pase anterior. Desplazamientos respecto al objetivo: (22,16,18), (40,27,36), (65,42,58). No se cambia la densidad ni el alcance de la cubierta.

[Comparativa nocturna](comparison-night.jpg): mejora visible cerca, sin anillo luminoso evidente en estas poses. A distancia domina de nuevo el material plano; la prueba no resuelve esa limitación artística. Conservar candidata sin integrarla aún.

Cámaras, objetivos, horas, triángulos e instancias iguales en cada pareja; sin errores. Las tres parejas diurnas son exactamente idénticas. audit.json registra contadores y diferencias de píxeles como diagnóstico, no como criterio artístico. Sin benchmark CPU/GPU ni medición de memoria física. Poses asentadas: no verifican continuidad temporal.

Pendientes crepúsculo, movimiento y perfil bajo. No declarar objetivo global alcanzado. Reproducir con capture-river-night-distance-20261021.mjs y package-river-night-distance-20261021.py, Vite en 5190. PNG regenerables; láminas y metadatos publicados.
