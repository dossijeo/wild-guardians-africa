# Invocación visible junto a vegetación

La última aparición de `docs/guardian/wind-wide/world-day.mp4` quedaba parcialmente detrás de un arbusto. La colocación sólo incluía árboles y rocas de navegación y comprobaba un punto a la altura central del Guardián. La vegetación transitable podía ocultar el manto sin invalidar la posición.

## Corrección

- Se derivan volúmenes conservadores de los límites reales del asset y su transformación de instancia: posición, escala en tres ejes y giro. Se incluye vegetación transitable de más de 0,6 m de altura; la cubierta baja se omite.
- Se comprueba el volumen del cuerpo también en las posiciones normales, no sólo al buscar una alternativa elevada.
- Se evalúa la línea de visión a tres alturas: bajo, centro y cabeza. La puntuación prefiere candidatos con menos partes tapadas.
- Se mantienen las dieciséis posiciones candidatas, la selección del objetivo, la cámara y la lógica de magia. No se modifica navegación ni se lanzan rayos contra triángulos skinned. Sólo se calcula al recibir una orden.

## Validación

Catorce pruebas de colocación, límites de vegetación y unicidad del Guardián pasan. Incluyen una planta transitable que ocupa el cuerpo, un obstáculo que sólo oculta el bajo y la correspondencia de los límites con la transformación real de Three.js.

Se repitió la misma secuencia diurna de seis órdenes Grow/Multiply, giro y zoom. `day.json` registra cero errores y un máximo de un Guardián; guarda cada destino y el origen elegido. El vídeo `day.mp4` y su hoja de contacto muestran la aparición final en el hueco despejado junto al arbusto. La muestra registra 1,42–3,94 ms de planificación por orden. No es una medición de FPS ni demuestra rendimiento en una granja máxima.

Los límites siguen siendo aproximaciones conservadoras: una copa dispersa puede excluir una posición que visualmente sería utilizable. El índice de vegetación es local al objetivo. No se certifican aquí todos los biomas, oclusores lejanos, ángulos o situaciones completamente cerradas; el fallback existente sigue siendo necesario cuando no hay una posición libre perfecta. La fase 2 continúa abierta.

También se ejecutó la secuencia nocturna Attack/Shield con cambios de cámara, dos especies e impactos repetidos. `night.json` acumula los seis comandos diurnos y seis nocturnos: cero errores, máximo de un Guardián y cero cuerpos físicos al finalizar; no queda ningún estado de derribo activo. `night.mp4` y su hoja de contacto conservan los encuadres probados. No se declara cobertura exhaustiva de obstáculos.

Compilación y paquete web aprobados: 993 archivos / 495.011.767 bytes.
