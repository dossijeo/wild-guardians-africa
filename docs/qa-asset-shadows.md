# Sombras de props con el último LOD original

El Bioma Lab V4.0 llama `drawBatch(b,true)` con una única selección del último
LOD, todas las instancias activas y un shader DVS/DFS que proyecta geometría
sólida. No aplica el atlas alfa ni el fundido de ocultación a esa pasada; los
props importados del grupo 2 no proyectan sombra. La adaptación anterior
proyectaba cada LOD de color y también la hierba.

`asset-shadows.js` conserva un InstancedMesh separado por lote. Sus vértices e
índices son la malla final original, compartida; sus matrices concatenan los
bins activos y solo se suben cuando cambian. Los meshes de color reciben
sombras pero no las proyectan directamente. Los proxies usan durante la pasada
un material fuente sólido común y propio del adaptador, sin alterar el material
ni las texturas visibles del asset. No entran en la lista de color ni en la
captura de profundidad de humo/VFX.

La integración intercepta `renderer.shadowMap.render` de Three 0.180.0 (versión
fijada): el renderer ya ha construido su lista de color antes de esa llamada.
Los proxies se añaden temporalmente, conservando la matriz mundial del chunk;
`finally` restaura sus materiales y los retira incluso ante fallo. El cierre
restaura la función original y libera el material propio una sola vez. Streaming
y cierre liberan las matrices de los proxies sin destruir mallas ni materiales
prestados. Cambiar esta dependencia exige volver a verificar ese orden.

## Evidencia

Pruebas de selección y matrices, caché estática, hierba, visibilidad, pasos sin
sombras, estado tras una excepción, contadores de callbacks y propiedad de
recursos. Regresión integrada: 556/556, sin omisiones, en 262,586 s. Las pruebas
dirigidas finales de sombras/LOD/ocultación/horizonte/contactos/DEST pasan 34/34
en 4,676 s; incluyen los contadores de callbacks añadidos después de iniciar
la regresión. El contador conserva la última pasada real y no la borra cuando
DEST, humo o VFX desactivan temporalmente el mapa de sombras. Build 4,47 s y paquete web aprobados: 547 archivos, 379374400
bytes, 791 enlaces relativos y 20 GLB de runtime, sin duplicados originales.

Sabana/Mapungubwe/712 alta, cámara fija: color conserva 3388526 triángulos
seleccionados y los mismos 29/360/1987 objetos. La pasada real de sombras,
contada en `onBeforeShadow` tras el frustum de la luz, envía 698109 triángulos
de props en 149 lotes. Control QA con la malla plena de sombra: 3231453 en 150
lotes. Los límites del frustum también dependen de la geometría usada. Ambos
estados tienen cero errores WebGL; volver al último LOD conserva la cámara y
el tiempo simulado. En la región de escena de 1280×485 cambian 55877 píxeles
(delta máximo 66). Eso prueba que el cambio participa en la imagen; no acredita
identidad píxel a píxel con el renderer WebGL del lab ni FPS de un dispositivo.
Se comprueban los seis biomas con Mapungubwe, calidad alta en Sabana y media
en los otros cinco, incluyendo noche de Volcanes y daño 0,417 con cinco
escombros en Gran Río. No aparecen avisos de consola ni errores WebGL. La
vista QA de actores ahora oculta también los chunks que se cargan al cambiar
la cámara: Desierto muestra cuatro trabajadores y cinco bestias con cero
lotes de sombra de props. Desierto nocturno en muy baja conserva cero
sombras de props y no registra error WebGL. Se guardan doce estados de
navegador. Este ajuste afecta solo al diagnóstico. Las imágenes
de comparación de Sabana preceden al ajuste del contador para conservar la
última pasada real; ese ajuste no modifica la geometría ni la imagen.
Artefactos: `test-results/asset-shadow-*`.

## Trabajo restante

La agrupación global entre chunks se completa posteriormente en
[QA de agrupación](qa-asset-groups.md). Origen flotante y gestión/caché completa
de recursos siguen pendientes. Esta revisión no reemplaza la cámara, foco/resolución de luz,
filtrado o política completa de actualización de sombras de Three por los del
lab. Tampoco acredita la matriz visual de todas las culturas/calidades ni
rendimiento móvil, y no da por completado el Plan Maestro.
