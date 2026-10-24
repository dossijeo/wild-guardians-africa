# Cielo: revisión de seis biomas

72 capturas reales, 36 parejas: semilla 712, calidad media, 1280×720, tres cámaras bajas, día 150 y noche 350. Izquierda: cielo original. Derecha: candidato de qa-sky-horizon-cloud-mask-20261021.mjs. Los materiales del escenario son V10 en ambos lados; Manglares usa leaf-stream, no la candidata posterior de cobertura del patio.

La revisión visual de las hojas comparison-day-1 y comparison-night-1 muestra menos velo gris diurno, azul más limpio y mayor separación de nubes, conservando la calidez del escenario. La noche pierde el tinte marrón y adopta un azul oscuro más coherente. La mejora diurna es moderada; sigue siendo el mismo HDR y sus mismas formas de nubes. No equivale a un rediseño artístico completo ni introduce identidad celeste por bioma. Conservar como candidata.

Cámara, objetivo, hora y triángulos coinciden en las 36 parejas. Sin errores de consola/WebGL capturados. Los draw calls coinciden en 35 parejas; Sabana nocturna, pose 2, registra 69 frente a 68 con iguales triángulos. Esa pareja requiere repetición y no se certifica equivalente. audit.json conserva la discrepancia, sin ocultarla.

La modificación está aislada en el shader de fondo mediante ruta QA. No cambia las texturas de entorno para reflejos, iluminación del mundo, geometría ni simulación. No añade muestras de textura; añade aritmética. No se ha medido su coste GPU aquí, ni se atribuye una mejora de rendimiento. Quedan pendientes crepúsculo, otras orientaciones, validación de reflejos y benchmark sin contención. La máscara cromática de nubes es aproximada.

Reproducir con Vite en 5190: node tools/experiments/capture-sky-six-biomes-20261021.mjs; después python tools/experiments/package-sky-six-biomes-20261021.py. Los PNG se regeneran; se publican metadatos y seis hojas WebP. Main y los valores predeterminados permanecen intactos.
