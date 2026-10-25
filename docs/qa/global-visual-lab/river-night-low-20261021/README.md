# Gran Río: ambiente nocturno en calidad baja

Seis parejas reales, semilla 712, 1280×720, cámaras normal/elevada/inversa, día y noche. Control: LOD coherente existente. Candidata: ambiente nocturno fuerte. [Comparativa nocturna](comparison-night.jpg).

La lectura de fibras mejora también con la geometría simplificada; conservar candidata. No corrige la uniformidad general del terreno lejano. Tres parejas diurnas exactamente idénticas, sin errores de página ni WebGL.

Todas las instancias usan el módulo lejano de ocho triángulos: 5793/8489/5255 instancias y 46344/67912/42040 triángulos de cubierta. Los valores son iguales antes/después, como cámaras, horas, buffers y llamadas totales de la pasada final (62/32/56). Estos contadores no equivalen a tiempos GPU ni incluyen necesariamente todas las pasadas auxiliares. No se ha medido rendimiento en esta prueba.

Reproducir capture-river-night-low-20261021.mjs, package-river-night-low-20261021.py y audit-river-night-low-20261021.py con Vite5190. PNG regenerables, láminas y metadatos publicados. Pendientes crepúsculo, movimiento y benchmark; no integrada por defecto ni objetivo global alcanzado.
