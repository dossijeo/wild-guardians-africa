# Parámetros de fluido y transición de iluminación

La revisión frente a Bioma Lab V4 detectó valores provisionales en el agua:
velocidad 1 en lugar de 0,65; escala 1 en lugar de 0,55; amplitud 1 en lugar
de 0,72; ancho 1 en lugar de 1,08; dibujo 0,5 en lugar de 0,52; tintas y
semilla distintas. Se recuperan los valores originales y las cuatro tintas
calculadas por el lab para cada bioma. La semilla es la del TerrainField,
derivada del texto introducido, como en el lab; no el número visible sin hash.
Cada chunk evalúa coordenadas mundiales y comparte fase y semilla. Las tintas
son componentes RGB originales y se convierten a lineal antes de la iluminación.
La animación deriva de elapsed×0,65, una sola vez; pausa y recarga no alteran
su fase ni se consume azar de la simulación.

La iluminación antes cambiaba de golpe al segundo 300. El cielo, African Toon
y los centros DEST ahora reciben la misma fase exponencial. Sol y ambiente
interpolan sus intensidades existentes; se recupera claridad nocturna 1,12
del lab. Los centros no deducen la fase de un umbral de intensidad del sol.

Las 23 pruebas dirigidas de edificios, toon, cielo y atmósfera pasan. Los
parámetros y paletas se comparan contra el código original, no solo contra
copias de las constantes. CUA real de WorldScene en Manglar/Mapungubwe registra
fase 0,5000 en toon y centro durante el atardecer; las ramas de agua y lava
compilan sin errores ni avisos. Lava de Volcanes/Mapungubwe se comprueba de día
y noche. Capturas native-atmosphere-dusk, native-water-manglar-dusk y
native-water-lava-day/night en test-results.

Este cambio recupera parámetros y sincronización. El fluido conserva por
ahora la iluminación de Three: faltan el reflejo HDR y Fresnel completos del
shader original, además de las mallas nativas de ríos, humedales y charcas.
Las capturas muestran escalones en la orilla de lava de la malla provisional
de celdas de 1,5 unidades; queda registrada su sustitución por la geometría
original. También quedan iluminación ambiental, cámara, niebla/streaming,
oclusión y rendimiento móvil. No se acredita toda la fidelidad del mundo.
