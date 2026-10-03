# Resolución del mundo configurable

El selector está disponible en las opciones del menú nativo y en los ajustes de
la partida, con traducciones inglés/español y persistencia en los ajustes del
usuario. El valor inicial sigue la calidad original; los niveles de ahorro
limitan el DPR del mundo a 1, .75 y .5, respectivamente. El límite nunca aumenta
el DPR del dispositivo ni supera el límite del perfil o los 2.6 millones de
píxeles de la receta original.

Cambiar solo resolución redimensiona el canvas 3D, sin sincronizar chunks ni
cambiar calidad, LOD, materiales, sombras o el DPR global. Los ajustes antiguos
sin este campo y los valores desconocidos conservan el perfil original.

## Comprobación en navegador

Servidor QA separado en 5176, pestaña propia cerrada al terminar; el servidor
del usuario en 5173 no se ha manipulado. La elección «Ahorro alto» se recuperó
tras recargar y abrir Opciones. El menú y los ajustes de la finca se comprobaron
en ambos idiomas. Se restauró «Según calidad» al terminar.

Finca guardada de QA en Sabana/Mapungubwe, calidad media, viewport 1280×720:

| Ajuste | Canvas del mundo | Canvas del avatar / magia |
| --- | --- | --- |
| Ahorro | 1280×720 | 404×404 / 404×404 |
| Ahorro máximo | 640×360 | 404×404 / 404×404 |
| Según calidad, restaurado | 1600×900 | 404×404 / 404×404 |

El tamaño CSS del mundo permanece en 1280×720. El reloj sigue en 07:36 y el
saldo en 95 durante la pausa. [Lecturas DOM](qa/resolution-settings/canvas-comparison.json),
[ajustes en español](qa/resolution-settings/game-es.png) y
[ajustes en inglés](qa/resolution-settings/game-profile.png).
La [consola](qa/resolution-settings/console.json) no contiene errores ni warnings.

Las 19 pruebas dirigidas de resolución, renderizado e idiomas pasan. Build y
verificación web pasan: 554 archivos, 379,678,054 bytes, 794 enlaces relativos,
20 GLB runtime sin duplicados originales. [Suite completa local](qa/resolution-settings/tests.txt)
del cambio 300ddb0: 720/720, sin fallos ni casos omitidos.
[Build y verificación web](qa/resolution-settings/build.txt).

Esto ofrece un intercambio explícito de nitidez por rendimiento; no acredita
FPS nuevos. Los ensayos GPU anteriores y sus límites siguen documentados en
[el diagnóstico DPR 1](qa-resolution.md). La pasada de profundidad específica,
la sustitución del ruido y los cambios de caras por categoría siguen pendientes.
