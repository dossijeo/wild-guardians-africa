# Medición de presentación en escritorio

El visor `tests/browser/african-toon.html` incluye «Medir 180 fotogramas». Calienta 30 frames y recoge 180 muestras con la simulación detenida. Usa WorldScene y todos sus pases reales: sincronización, LOD, efectos, sombras, profundidad, cielo y color. `renderer.info.autoReset` se desactiva únicamente dentro de cada render observado y se restaura incluso si falla; los controles y el método original también se restauran al finalizar.

Se registran percentiles 50/95, media y máximo del tiempo CPU de envío y de los intervalos requestAnimationFrame, draw calls y triángulos, identificación del renderer GL, dimensiones reales, escenario, recursos registrados por Three.js y comparación del estado antes/después. Los intervalos incluyen planificación del navegador; el tiempo CPU no incluye esperar a que la GPU termine. Los conteos de geometrías/texturas/programas no son bytes residentes de GPU. No se presenta esta fixture estática como una campaña, una medición de navegación/audio o una prueba de hardware móvil.

Repetir con la misma revisión, caso, cámara, viewport y calidad, sin cambiar el código durante la medición. Una pestaña oculta se identifica en el informe para no confundir throttling con rendimiento del juego. Los informes JSON conservan sus metadatos y límites junto a los resultados.
