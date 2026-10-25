# Movimiento controlado del fundido de superficie aislada

Sabana baja, semilla 712, 1280x720, día 150/noche 350. Se capturaron 36 posiciones consecutivas por variante y fase: 72 parejas, 144 renders. Control izquierda, superficie aislada derecha. Vídeos a 30 fps reconstruidos de capturas; duración 1.2 s. No son grabaciones de rendimiento en tiempo real.

El bucle normal se suspende mediante una ruta QA después de cargar la partida; cada paso avanza el renderer exactamente 1/30 s. La simulación permanece pausada. Cámara, objetivo, hora, viento, número de parciales y todos sus valores de opacidad son exactamente iguales entre variantes. Hay 62 parejas con parciales, hasta tres a la vez. Cero errores registrados. El primer intento sin suspender el bucle normal queda excluido: diferencias pequeñas de opacidad invalidaban su comparación exacta.

Inspección de láminas de día 17/26 y noche 9: no se ven nuevos agujeros grandes ni tramado en estas muestras; la reducción de capas es más discreta que en el primer plano estático, pues cambia rápidamente la contribución de cada árbol. Esto no certifica ausencia de parpadeo temporal: hace falta una ruta más lenta y revisión de bordes durante entrada/salida. Diferencia media máxima entre variantes 1.089/255, una descripción de la diferencia, no una puntuación de calidad.

El prototipo retiene cuatro targets al recorrer la cámara (hasta ~28.125 MiB nominales RGBA8+uint32, sin overhead). La prueba estática solo retenía uno. Prioridad siguiente: limitar esa retención y validar que reutilizar targets no mezcle las profundidades de árboles distintos. Mantener la candidata; no integrar todavía globalmente. Humo real, clipping, otras geometrías y rendimiento de cámara móvil siguen pendientes.

Reproducir con Vite 5190, `node tools/experiments/capture-obstruction-isolated-motion.mjs` y `python tools/experiments/package-obstruction-isolated-motion.py`. PNG fuente locales regenerables; se publican metadata, resumen, diez láminas comparativas y dos vídeos.
