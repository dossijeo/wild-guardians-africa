# Rayo oblicuo con iluminación del jardín

Petición: más presencia e inclinación, y corregir que el haz parecía estar detrás del maíz sin alumbrarlo.

La primera variante solo cambiaba el triángulo de bruma: dorado diurno y azul nocturno con núcleo y halo, eje aproximadamente 32° respecto a la vertical (compensado por aspecto). El usuario identificó correctamente que no aportaba luz a las plantas.

La variante final añade una contribución en los materiales existentes del suelo y del maíz. Comparte la huella proyectada del haz, usa color del material y normal de cada fragmento para modular la luz: las hojas orientadas hacia arriba/derecha reciben más. El suelo también se ilumina; la oclusión de contacto se aplica después. Se conserva la iluminación base y las sombras existentes.

## Comparación y opción integrada

`*-base.png`: rayo oblicuo solo en bruma. `*-beam.png`: mismo rayo más iluminación de materiales. Misma semilla 712, cámara, progreso 75 %, cuatro plantas y tiempo 150/350; horizontal 1280×720 y vertical 390×844. Sin errores JS, consola o GL. Seis draws y 16002 triángulos por captura en ambos. Ninguna textura, geometría o pasada añadida; se añade aritmética de fragmento, cuyo coste GPU/CPU no se ha medido.

El renderer de carga admite **`?loadingBeam=oblique`** para activar conjuntamente bruma e iluminación. Por defecto mantiene la apariencia anterior. Solo afecta al LoadingDiorama, no al mundo. Las cuatro capturas de esta opción integrada coinciden píxel a píxel con QA tras alinear el orden de oclusión: ../loading-beam-native-20261022/equivalence.json. Guards de URL y anclas, syntax checks y render real verificados.

Las comparaciones usan el resto del jardín experimental mediante rutas QA (atmósfera, fondo y sombras de los pases anteriores). El parámetro por sí solo activa el rayo y su luz, no promueve automáticamente esos otros cambios.

## Alcance honesto

Es iluminación artística de presentación con huella proyectada coherente con el haz y respuesta de normales; no un volumen físico 3D con ray marching. No calcula oclusión volumétrica entre hojas ni genera sombras adicionales del propio rayo. Las sombras existentes siguen respondiendo a su luz original. La dirección del haz sigue la composición de cámara. Falta medir coste, probar el conjunto durante carga real y revisar crecimiento completo/giro con este nuevo efecto.

Recomendación: conservar como candidata experimental y ajustar desde esta versión que sí modifica la luz de las superficies. No dar por resuelta toda la pantalla ni el experimento global.

## Reproducción

Vite 5190. `node tools/experiments/capture-loading-beam-light-20261022.mjs` compara aporte material off/on; `node tools/experiments/capture-loading-beam-20261022.mjs` compara bruma original/oblicua. Con WG_LOADING_BEAM_NATIVE=1, este último verifica la opción nativa completa. Los scripts reemplazan salidas; las imágenes nativas duplicadas pueden recrearse. No miden arranque real.
