# Gran Río: mezcla de iluminación durante el crepúsculo

Quince parejas reales, semilla712, media,1280×720, tres cámaras y cinco niveles de uNight (0,.25,.5,.75,1). Se utiliza el reloj real pausado de la escena; el auditor comprueba los uniforms resultantes, no solo la hora solicitada. Control LOD coherente frente ambiente nocturno fuerte.

[Mezcla intermedia](comparison-half.jpg): el incremento de luz es discreto y conserva color y sombras. Conservar candidata. Esta prueba muestrea niveles estáticos; no demuestra ausencia de saltos temporales durante una secuencia continua. El suelo lejano sigue dependiendo de su textura.

Quince parejas con cámara, hora, uniform nocturno, geometría, buffers y llamadas iguales. Tres diurnas exactamente idénticas; sin errores de página ni WebGL. Contadores de pasada final en audit.json, sin tiempos CPU/GPU ni estimaciones de FPS. No confundir diferencias de píxeles con calidad.

Reproducir capture-river-night-twilight-20261021.mjs, package-river-night-twilight-20261021.py y audit-river-night-twilight-20261021.py con Vite5190. Pendientes movimiento y benchmark antes de integración. No objetivo global alcanzado.
