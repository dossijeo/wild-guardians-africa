# Comparación repetida HTMLImageElement / ImageBitmap

2026-10-06. Fixture aislada 5191, 1280 × 720, DPR 1, cámara fija (0,10,25), acacia diurna. Nuevo botón Comparar HTML / Bitmap ABBA: ocho lotes ABBAABBA, cuatro por ruta. Antes de cada lote se libera la conversión anterior y se hace dispose de las tres texturas nativas para recrear sus recursos GPU. Se reutilizan imágenes originales, programas y atlas; no se vacían cachés del navegador/driver. Bitmap incluye crear de nuevo sus tres bitmaps. Decode explícito apagado; una textura por tanda en ambas rutas.

## Primer ensayo: conversiones consecutivas

report.json contiene los ocho lotes originales. Medianas de tiempo total: HTML 571,15 ms, Bitmap 559,95 ms. Mediana del máximo tiempo de initTexture/tanda: HTML 259,80 ms, Bitmap 29,10 ms. Pero el máximo intervalo de frame de cada lote es **266–283 ms en HTML y 399–449 ms en Bitmap**. La reducción de la llamada de subida no demuestra mejor respuesta de la interfaz: las conversiones se acumularon antes de devolver el control al render.

## Segundo ensayo: ceder un frame entre conversiones

Se añadió requestAnimationFrame después de cada conversión; esta es la implementación actual de la fixture. yield-report.json registra ocho lotes adicionales y bitmapYieldBetweenConversions=true. Medianas totales: HTML 543,00 ms, Bitmap 566,55 ms. Mediana del máximo de subida: HTML 249,25 ms, Bitmap 25,70 ms. Máximos intervalos por lote: **249–266 ms en HTML y 233–249 ms en Bitmap**.

Los intervalos incluyen ejecución CPU y scheduling del navegador, no tiempo GPU aislado. Solo hay cuatro lotes por ruta/ensayo, con cachés y procesos externos. No atribuir diferencias pequeñas de tiempo total a la ruta ni extrapolar FPS a gameplay. La limitación de esta fixture sigue siendo clara: ninguna de las dos rutas cumple un presupuesto fluido de frame durante la preparación.

## Resultado y evidencia

Los 16 lotes terminaron sin errores, con tres programas y webglError=0. Ambas consolas están vacías. summary.json conserva las medianas y máximos por lote, y los informes completos incluyen todos los intervalos y tiempos de cada textura. Las capturas muestran el retorno al renderizado final. No hubo cambios de código, builds ni tests durante los lotes activos.

ImageBitmap queda experimental y apagado por defecto. No se adopta su conversión durante gameplay. El trabajo caro debe prepararse en una fase de carga o investigarse con otra ruta de decodificación/transferencia/formato GPU; ceder frames mejora la acumulación, pero no divide el coste de una sola conversión o subida. Falta medir memoria, restauración del contexto, más materiales/plataformas y carga integrada. WorldScene y Assets.texture del juego no se han modificado.
