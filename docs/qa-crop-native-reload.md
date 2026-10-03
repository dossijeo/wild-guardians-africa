# Cultivos nativos: originales, puentes y reconstrucción

Implementación de pruebas `99cee68`, 3 de octubre de 2026. Casos originales
QA-035 y QA-036 del Plan Maestro. No se cambia el renderer de producción.

[Pruebas Node](../tests/crop-native-reload.test.js): cargan el GLB real declarado
en models.json, sus cuarenta geometrías y los treinta y dos puentes del juego.
Se omiten únicamente las referencias a imágenes porque Node no las decodifica.
Cada posición, normal y UV de cada esquina de ambos lados del puente coincide
exactamente con el índice del original. Los cuarenta originales también conservan
sus índices y atributos. Los drivers regionales son finitos; los puentes son
opacos, escriben profundidad y no usan alpha test/hash ni alteran el fragment
shader para intercambiar coberturas. Conservan su profundidad de crecimiento.

Las ocho especies atraviesan sus cuatro morphs al 20/50/80 %: **96 guardados**
mediante SaveRepository, sin pérdida de estado ni fase. Dos batches independientes
reconstruyen matrices y atributos idénticos, con origen (192,48) y una función
de altura explícita. Una pausa congela progreso; cincuenta ticks reales de Game
de 0,05 s continúan ambos estados idénticamente, saliendo del morph hacia el
original siguiente. La preparación usa semillas pagadas, crédito de QA y cuidado
manual mediante el algoritmo real de checkpoints; no acredita la economía natural
de campaña, animación de trabajadores ni colocación en terreno procedural.

La [suite dirigida](qa/crop-native-reload/directed.txt) pasa **40/40**, cero fallos,
cancelaciones u omisiones, 6.384,7621 ms. Incluye buffers, origen, agricultura,
tolerancia y validación de identidad de ranura.

## WebGL con las texturas reales

[Fixture reproducible](../tests/browser/crop-native-reload.html), origen de QA
127.0.0.1:5179, ranura propia qa-native-crop-reload. Carga mediante Assets el GLB
completo, color y normales, y aplica AfricanToon y createCropBatch de producción.
Cada reconstrucción guarda/carga mediante SaveRepository/localStorage, dispone
el batch y renderer y crea otros nuevos sobre el mismo canvas/contexto del navegador.
El reloj permanece fijo en 12 s. Se comparan los **1.024.000 píxeles RGBA** de
1280×800, sin leer el texto ni la UI. No se compara una textura uniforme: el
rango RGB de los ocho ensayos finales es 1–234 o 1–241.

| Estado final | Píxeles distintos | Máxima diferencia por canal |
| --- | ---: | ---: |
| Morph 20/50/80 %, las 32 transiciones | 0 en cada ensayo | 0 |
| Originales 1/2/3, las ocho especies | 0 en cada ensayo | 0 |
| Original 4 | 3 | 7 |
| Original 5 | 3 | 8 |
| Morph 50 %, cámara girada 90° | 0 | 0 |

El dominio es idéntico en todos los ensayos. Los informes *-final.json y
morph-50-rotated.json registran los resultados, cada sample, material y mapa.
La primera secuencia produjo dos píxeles distintos en Original 3; se conserva
en original-3-initial.json/png. La repetición final dio cero allí, pero diferencias
en Originales 4/5. No se afirma identidad binaria de los originales ni se atribuye
la causa a un componente concreto. No se cambiaron shaders para ocultarla.

Se inspeccionaron las dieciséis vistas próximas de morph/madurez, dos por especie,
y las vistas de conjunto de cinco etapas y tres fases. Las texturas, hojas y
frutos permanecen reconocibles, sin parpadeo de cobertura en estos estados fijos.
El ensayo conserva geometría y UV originales, sin elegir otro asset ni sustituir
la transición por una interpolación de vértices sin correspondencia regional.

[Consola](qa/crop-native-reload/browser-log.json): cero errores y un aviso del
compilador sobre una variable potencialmente no inicializada en environment4.
Se conserva el aviso; no se presenta la consola como libre de warnings.

Esto verifica reconstrucción del morph y la receta visual de cultivos de los
casos QA-035/036. La escena es aislada, con suelo plano y luz de ensayo, sin
sombras ni paisaje. No acredita todos los biomas/culturas, rendimiento móvil,
restauración de contexto perdido ni el flujo completo del menú de ranuras.
El resto de los 159 casos conserva su alcance independiente.

La [CI del commit de pruebas](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37115114052)
estaba en curso al registrar esta evidencia. No se repite build para cambios
exclusivos de pruebas y documentación.
