# Caché de obstrucciones de props

Cambio `b04af38`, prioridad 6 de [rendimiento](performance-priorities.md).

La visibilidad deseada de cada prop se calcula cuando cambian la posición de la cámara, el objetivo, FOV, aspect, distancia de ocultación, activación o población. No se redondean las coordenadas: un movimiento de 1e-8 invalida la consulta. Las poblaciones de props son inmutables; suprimir/restaurar un slot crea otra cobertura. Las cachés usan claves débiles para no retener poblaciones retiradas.

Mientras hay un fade pendiente se sigue interpolando con los mismos tiempos, tolerancias y umbrales del lab. Cuando se estabiliza se reutilizan también los contadores, sin recorrer todos sus registros. Solo se reempaqueta cobertura de LOD cuando cambian sus valores; los cambios de bin siguen empaquetándose en `updateAssetLods`. Una marca `fresh`, registros sustituidos o una subida externa del atributo invalidan la caché.

Las [17 pruebas dirigidas](qa/obstruction-cache/targeted.txt) pasan. La nueva comparación contra el bucle anterior verifica cada frame y array Float32 en 1.650 frames: fades, cámara, objetivo, FOV, aspect, distancia, activación, snap y tiempos 0/0,016/0,05/0,12/10 segundos. Una población de 2.048 props conserva los resultados durante 210 frames quietos sin nuevas consultas por prop, empaquetados ni versiones de atributo; desplazamiento mínimo, sustitución y retirada invalidan correctamente. Se mantienen las pruebas de cambios de LOD, liberación de geometrías y supresiones selectivas.

Esto reduce trabajo CPU; no demuestra una mejora porcentual de FPS ni reduce el coste por fragmento del shader. No modifica materiales, descarte, sombras, navegación, guardado ni reglas del juego. La pasada específica de profundidad VFX y la comparación GPU por categoría de caras siguen pendientes.

Comprobación de navegador en Sabana/Mapungubwe/712, media, 1600×900 internos y viewport 1280×720. Cámara situada dentro de un obstáculo: ocultación activa conserva una instancia oculta y dos con cobertura parcial; desactivarla restaura cero ocultos/parciales; activarla de nuevo recupera los contadores. Hay 25 chunks y cero errores de consola en las tres condiciones. [Activa](qa/obstruction-cache/enabled.png), [desactivada](qa/obstruction-cache/disabled.png), [restaurada](qa/obstruction-cache/restored.png).

La comparación RGB entre capturas activa/restaurada registra 153.456 píxeles distintos de 921.600 y máximo 85 por canal. No se atribuyen esas diferencias a una causa ni se afirma identidad binaria o equivalencia visual con un navegador ejecutando la versión anterior. La equivalencia numérica de cobertura está probada contra el bucle anterior; esta sesión comprueba funcionamiento visual y ausencia de errores, sin benchmark de CPU/GPU.

Validación final: [707/707 pruebas locales](qa/obstruction-cache/tests.txt), cero fallos/omisiones; [CI 37095217806](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37095217806) aprobada para `b04af38`. Build y paquete web aprobados: 554 archivos, 379.675.784 bytes, 794 enlaces relativos, 20 GLB runtime sin duplicados originales. El build conserva el aviso de bundle JS mayor de 500 kB. El servidor y las pestañas propias de QA se cierran; se conserva la sesión del usuario en 5173.
