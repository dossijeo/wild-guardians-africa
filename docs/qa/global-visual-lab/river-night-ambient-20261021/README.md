# Gran Río: ambiente nocturno de la cubierta

Seis parejas reales, semilla 712, media, 1280×720, cámaras normal/elevada/inversa y día/noche. Control: LOD coherente de V9. La candidata modifica únicamente nightShade del shader de cubierta, interpolado con uNight. Conserva color diurno, luz direccional, sombras, geometría y distribución; no modifica iluminación de edificios, árboles ni terreno base.

Primer incremento RGB a (0.15,0.24,0.36), multiplicado por uNightLight. La diferencia visual es demasiado pequeña para resolver la legibilidad global. No promover esta intensidad; mantener como control de la siguiente prueba más fuerte.

Tres capturas diurnas exactamente idénticas. Cámaras, hora, instancias, triángulos y bytes verificados iguales en todas las parejas, sin errores. No nuevos pases, texturas ni muestras: solo constantes de iluminación. No se midieron tiempos GPU/CPU, por lo que no se afirma igualdad exacta de rendimiento ni mejora FPS. Diferencia de píxeles no se usa como puntuación de calidad.

Pendientes coherencia al desvanecer hacia el terreno lejano, crepúsculo, baja y movimiento. No aumentar iluminación global para justificar esta prueba localizada. No integrada en producción, no objetivo global alcanzado.

Reproducir script capture y package del mismo nombre en tools/experiments, Vite5190; audit-river-night-ambient-20261021.py comprueba igualdad diurna de ambas intensidades. PNG locales regenerables, láminas y metadata publicadas.
