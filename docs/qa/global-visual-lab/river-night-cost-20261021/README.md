# Gran Río: coste del ambiente nocturno

Intel UHD ANGLE D3D11,1280×720,media,semilla712. ABBA en páginas independientes; cámara fija, cubierta C idéntica, reloj pausado. 60 fotogramas de calentamiento y90 muestras por bloque, GPU y cadencia separados. Total720 consultas GPU válidas y720 muestras de cadencia. Sin errores, cambios de simulación ni diferencias de cámaras/llamadas/triángulos entre variantes.

Medias GPU por bloque (ms): día A16.147,B15.037,B15.376,A14.643; noche A16.579,B16.763,B16.615,A16.699. La deriva diurna del control supera la diferencia entre variantes. De noche medias agrupadas A16.639/B16.689; CPU render A3.429/B3.412; intervalo callbacks A18.206/B18.194. No mejora FPS ni penalización relevante demostrada en esta ronda. Solo dos bloques por variante y fase, sin intervalo de confianza estadístico.

summary.json incluye p95 por bloque; benchmarks.json conserva muestras, memoria por contadores Three y dispositivo. CPU corresponde a world.render, no simulación completa. Cadencia de callbacks no equivale a presentación efectiva. No sumar tiempos CPU/GPU. Sin medida de VRAM física. Cámara fija y cachés calientes: no prueba streaming ni movimiento.

Recomendación: conservar la mejora artística; este cambio de constantes no muestra sobrecoste claro. Las capturas anteriores verifican día/noche, baja, distancia y crepúsculo. Falta movimiento antes de integrar en la combinación global. No declarar alcanzado el objetivo de seis biomas.

Reproducir measure-river-night-cost-20261021.mjs y audit-river-night-cost-20261021.py con Vite5190. Observaciones GPU externas pre/post guardadas junto a esta carpeta; no monitorización continua.
