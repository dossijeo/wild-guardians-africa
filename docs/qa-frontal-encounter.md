# Paso frontal sin colisión y continuidad de navegación

Base final publicada: `043abdb`.

## QA-105

Diez escenarios (cinco culturas, semillas 21 y 152) alcanzan un encuentro
frontal sin barrido de colisión mediante contratación, siembra y desplazamientos
de Game. No se asignan posiciones, headings, rutas ni resultados de ataque.
La composición de un facóquero, crédito de 10.000 monedas, trabajadora mayor,
terreno plano sin props y bounds de 48 m son condiciones explícitas de QA.

La semilla 21 produce un golpe frontal sin empuje y la 152 rechaza la tirada.
Ambos pasos ocurren después de un contacto físico anterior: la nueva entrada
al encuentro permite una tirada nueva. Se comprueban frontalidad, distancia,
ausencia de colisión barrida y ausencia de contacto activo antes de la tirada.
El próximo valor del RNG predice exactamente el resultado comparado con 0,6;
la ejecución real avanza ese RNG una sola vez y consume un cupo únicamente si
acepta el golpe. El contacto rechazado permanece activo; el golpe aceptado es
el segundo y deja a la trabajadora incapacitada, excluida de nuevas agresiones.

Se guarda y carga justo antes y después de la tirada con SaveRepository y
Navigation nuevas. Los estados completos, incluidas rutas y épocas de caché,
son iguales, sin campos excluidos. Una pausa de 30 s conserva el estado cargado.
Durante varios pasos reales de 10 ms dentro del radio, sin colisión, no se
repite la tirada ni cambia el número de golpes. Después, ambos estados completos
coinciden en cada paso de 50 ms hasta salir la incursión y emitir un RaidEnded.
La suite complementaria de
encounters comprueba 5.000 muestras del 60 %, pasos traseros sin tirada y la
colisión obligada posterior a un rechazo; la matriz integrada no es una nueva
estimación de frecuencia ni una inspección WebGL.

## Corrección encontrada

Antes del cambio, reconstruir Navigation reiniciaba su versión, por lo que una
ruta persistida de retirada ralentizada se calculaba otra vez. Al rodear el
animal, el nuevo desvío podía cambiar ligeramente un waypoint aunque lesión,
posición inicial y RNG coincidieran. La igualdad completa de continuación falló.

Navigation conserva ahora su versión en `state.navigationVersion`. Un navegador
nuevo restaura esa época sin mutar la instantánea ni descartar rutas válidas.
Cambios posteriores de estado siguen incrementándola y vaciando las cachés.
También se invalida al sustituir el estado en un navegador ya existente. Los
guardados antiguos o épocas inválidas conservan la invalidación prudente;
no se confía en sus versiones de rutas como si incluyeran la época nueva.

[Pruebas de épocas](../tests/navigation-epoch.test.js) y
[aceptación frontal](../tests/acceptance-frontal-encounter.test.js).
[Salida dirigida](qa/frontal-encounter/directed.txt): **23/23**, cero fallos,
cancelaciones u omisiones, 741,7784 ms, incluyendo encounters. La comprobación
final usa igualdad completa y no las exclusiones de caché de auditorías previas.
La build pasa (9,03 s), con el aviso habitual del bundle mayor de 500 kB.
[Build](qa/frontal-encounter/build.txt), [paquete](qa/frontal-encounter/web-package.txt):
554 archivos, 379.690.596 bytes, 794 enlaces relativos y 20 GLB de runtime.

[Suite completa](qa/frontal-encounter/full-suite.txt): **967/967**, cero fallos,
cancelaciones u omisiones, 469.666,2915 ms. Se inició con el código runtime final,
antes de reforzar la comparación frontal para incluir todas las rutas y toda
la retirada; esa versión final de las pruebas pasa en la selección de 23 casos
citada arriba. No se suman ambos resultados como casos independientes.
También pasan [plan](qa/frontal-encounter/plan.txt) y
[conformidad de assets web](qa/frontal-encounter/web-assets.txt).
