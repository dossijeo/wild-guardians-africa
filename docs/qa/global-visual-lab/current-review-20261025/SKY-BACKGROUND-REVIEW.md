# Cielo y fondo: revisión de evidencia visible

Se inspeccionó sky-background-current-sheet.jpg, compuesto sin retoques de color a partir de doce capturas del punto medio de los recorridos. Su JSON registra fuentes y hashes. Cada panel recorta la mitad superior de la captura y la reduce a 640x180; no es una captura nueva ni una comparación A/B de rendimiento. Los perfiles y fechas de los recorridos difieren.

Sabana y Gran Río: azul diurno limpio, nubes identificables y transición nocturna oscura; los árboles dominan la composición. No se aprecia una discordancia que justifique otro cambio de saturación global. Manglares: horizonte más abierto, nubes pequeñas y bruma diurna; cielo oscuro con estrellas de noche, vegetación distante todavía legible. Desierto: montaña clara y atmosférica, arena cálida y lectura de dunas conservada. Volcanes: montaña grande de menor contraste que los árboles, enfriamiento nocturno coherente. La uniformidad relativa del cielo es una limitación estética, no una regresión demostrada.

Gran Cañón: este punto de cámara mira hacia el valle y no muestra cielo. No usar ese panel como validación del skybox. El relieve y la ribera sí son visibles. Revisar una vista orientada al horizonte para cerrar específicamente su cielo.

La referencia original de Sabana 1-13511.jpg se abrió directamente y no incluye cielo. No atribuirle una composición de nubes inexistente. La comparación artística global usa el mockup como dirección del terreno/vegetación, mientras la evaluación del cielo se apoya en escenas con horizonte y en coherencia con el mundo.

Los informes sky-atmosphere-native-20261022 y sky-reflection-endpoints-20261022 documentan integración nativa y coherencia de coordenadas con reflejos. La antigua advertencia de global-sky-remaining sobre un ajuste solo de color precede al remapeo de latitud; no tratarla como descripción completa del estado actual.

Pruebas ejecutadas sobre el código actual: 18/18 aprobadas en sky-atmosphere, sky, sky-lifecycle, sky-worker-lifecycle, environment-endpoints y loading-sky. Requieren el loader local file:///C:/Users/PC/source/repos/wild-guardians-wild-three/tools/wild-three/node-loader.mjs en este checkout. La invocación inicial sin loader falla por falta de node_modules/three/build/three.module.js; no se ha reinstalado ni cambiado Three.js. Estas pruebas no sustituyen una comprobación visual de cámara mirando al cénit o de toda la transición horaria.

Recomendación: conservar el cielo atmosférico seleccionado. No intensificarlo a ciegas ni reabrir la iluminación aprobada del terreno. Queda una vista de cielo verificable del Cañón; el presente pase no declara completado el objetivo global.
