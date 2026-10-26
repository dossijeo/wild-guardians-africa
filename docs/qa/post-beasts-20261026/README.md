# Cierre posterior a las bestias

Rama `codex/global-visual-lab`, PR #215. El usuario autoriza fusionar a main
cuando estén corregidos los pendientes y validado el conjunto.

## Manglares: causa y corrección

La inundación no era una ilusión del shader ni un estado transitorio. En la
semilla 37, el ruido de cuencas de baja frecuencia inundaba el 61,8 % de 3.721
puntos alrededor del poblado (cuadrado de 120 unidades, paso 2). La reserva
seca del poblado lo convertía visualmente en una isla. La semilla 712 habitual
no reproducía esa inundación. No se conoce la semilla exacta del vídeo original.

La variante nueva conserva los canales sinuosos y utiliza el ruido de cuenca
solo para ensancharlos hasta un 18 % en valor de máscara. No puede crear una
masa de agua independiente fuera de la red. En la misma semilla 37 y región,
la cobertura baja a 148/3721 puntos (4,0 %). Altura, material, iluminación,
helechos y LOD no se modifican.

La opción `mangroveChannels` queda almacenada en partidas nuevas. Las partidas
anteriores conservan su generador: no se cambian rutas, obstáculos o props bajo
una simulación guardada. Por tanto, un lago de una partida antigua no desaparece
al cargarla. La corrección se aplica al crear un mundo nuevo.

La variante se transmite a generación síncrona, pthread, snapshots espaciales
y réplica visual lejana. Se recompilan los dos WASM con Emscripten; no se
modifica la memoria autoritativa desde un trabajador de gráficos.

Pruebas: `tests/mangrove-channels.test.js` revisa 100 semillas, conserva la
altura, prueba snapshots/regeneración y compara agua/terreno entre pthread y
generación síncrona. La batería nativa conjunta pasa 62 tests.

Capturas: `water-seed37-before/world.png`, `water-seed37-after/world.png`.
La primera captura posterior precede a la propagación de la variante al fondo
lejano; la validación final debe utilizar `water-final/` y el paquete actualizado.
Las imágenes son del renderer real con HUD, misma semilla y cámara. No son
benchmarks ni comparaciones de píxeles con todos los efectos temporales congelados.

## Tutorial vertical

El guardián está encima del globo, mediante composición flex con altura de texto
intrínseca. Se reserva el desbordamiento del canvas y el lateral de acciones.
No hay mediciones de layout por frame añadidas. El globo conserva scroll cuando
el texto no cabe. Ocho verificaciones en español/inglés, 320×568, 390×844,
768×1024 y 1280×720; cierre accesible y controles laterales comprobados.
Capturas y rectángulos medidos en `tutorial/`.

## Regresión detectada antes de fusionar: radios de bestias

La recalibración de modelos había cambiado también los radios usados por la
simulación. La validación amplia encontró cuatro fallos, incluidos animales de
partidas anteriores y una incursión con escudo. Se conservan los radios publicados
de main: facóquero 1,1; hiena 0,9; búfalo 0,97; león 0,85; rinoceronte 1,55.
La envolvente medida del modelo queda separada como `visualRadius`, usada por
la cámara de grupo. No se escalan ni alteran los GLB para corregir la simulación.

`playable-tests.txt` conserva el resultado negativo. `playable-tests-fixed.txt`
pasa 216/216. `integration-tests.txt` pasa 147/147. El test geométrico sigue
comprobando la envolvente medida, ahora explícitamente visual. La silueta
artística puede sobresalir del cilindro lógico, como las extremidades decorativas;
no se afirma que ese cilindro encierre cada polígono de los modelos nuevos.

## Validación de cierre

Build web y auditoría de paquete: 973 archivos, 465.414.846 bytes, 840 enlaces
relativos, 17 GLB runtime. Verificación de assets, compresión y sintaxis pasa.

La suite completa ejecuta 4.939 pruebas: 4.937 pasan y dos detectan el inventario
SFX desactualizado tras cambios de líneas/hashes de main.js y scene.js. Se
regenera el inventario conservando 126 sonidos, 101 asignaciones y 25 reservas;
las tres pruebas del catálogo pasan después (`sfx-audit-fixed.txt`). No se
modifican audio ni asignaciones. El resultado negativo completo se conserva.

Los seis flujos del paquete final pasan: menú, nueva partida, carga interactiva,
transición, guardado, salida, continuar partida y movimiento de cámara. Manglares
incluye además los cuatro laboratorios de Biblioteca y un clic real para plantar
durante la carga. Cero errores de página/consola y cero recursos ausentes en cada
informe `package-<bioma>.json`. Son pruebas funcionales; no usar sus tiempos como
benchmark, pues parte de la suite de CPU se ejecutó concurrentemente.

- [Vídeo del flujo completo de Manglares](package-manglares.webm).
- [Secuencia de transición](package-manglares-transition.jpg).
- [Suelo final sin lago alrededor del poblado](water-final/world.png).
- [Tutorial vertical](tutorial/390-es.png).
- [Incursión final de diez animales](final-ten/raid-ui.webm).

Las incursiones finales de 4, 10 y 16 visitantes pasan con los radios de juego
restaurados. Todos los actores activos permanecen en frustum en ocho muestras;
en las dos últimas del grupo de 16 ya solo quedan 15 porque uno está `gone`.
Escudo real: un clic en los tres casos. El encuadre medido es de centros, no una
garantía de ausencia de oclusión por árboles o HUD. Los vídeos anteriores siguen
siendo evidencia de las animaciones; los de `final-*` validan la integración final.

CI y fusión se registrarán en la PR #215 después de los checks. No se declara
fusionado por el mero hecho de que estas pruebas locales pasen.
