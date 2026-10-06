# Guías 3D actuales del primer día

Prueba nativa en el navegador de Codex, 6 de octubre de 2026, Vite local puerto 5191. Fixture: `tests/browser/hands.html`; WorldScene, terreno procedural, originales de manos y comandos pagados del juego. Seed 712, calidad media, cultura Mapungubwe, seis biomas. No se modifica el reloj ni se acredita una jornada completa: la fixture no ejecuta Game.tick, audio ni HUD 2D.

## Hallazgo y corrección

En Sabana la posición legal del primer brote sugerido estaba demasiado cerca del centro. El billboard colisionaba con la edificación y su protección elevaba el contacto aproximadamente 1,90 m: visualmente apuntaba sobre el tejado. `savanna-seed-closeup.jpg` conserva ese fallo previo.

La búsqueda de la guía ahora exige 1,6 m libres alrededor del punto sugerido, conservando el grid y la comprobación de camino para el trabajador. Esto afecta únicamente a la sugerencia del tutorial: la colocación normal de brotes conserva sus restricciones y dimensiones. No se altera la geometría ni la animación original de las manos. En la comparación de Sabana el objetivo pasa de Z=3 a Z=4,5; el desplazamiento de protección vuelve aproximadamente a 0,035 m. Ver `savanna-seed-closeup-adjusted.jpg`.

## Evidencia y alcance

`native.json` contiene estados visibles del visor; los nombres terminados en `adjusted` corresponden al cambio de clearance. Los casos anteriores se conservan como diagnóstico, no como aceptación de la corrección. Las muestras de animación y capturas se toman en instantes distintos: no son una comparación de fase exacta.

- Punto y toque originales visibles; seis texturas cargadas, cuatro vértices/dos triángulos, profundidad activada y escritura de profundidad desactivada.
- Construcción real y siembra real aceptadas en Sabana, Gran Cañón, Manglares, Volcanes, Desierto y Gran Río: saldo final 695 (1500 menos 800 del centro y 5 de mijo), paso `hire`, guía retirada y cero errores registrados.
- Giros de 90/180/270 grados alrededor de las dos guías en Gran Cañón antes del ajuste y alrededor de la guía de siembra corregida en Sabana: sin intersecciones ni elevación pendiente del terreno en las muestras.
- Las imágenes `gameplay` usan la cámara del juego enfocada por su propio helper. Las imágenes `closeup` usan una cámara diagnóstica para examinar el contacto; no representan el tamaño habitual en pantalla.

El visor anterior preconstruía centro y brote y empleaba pasos antiguos; se sustituye por controles de la secuencia actual. Durante esta revisión también se detectó que su botón de selección reactivaba la guía después de cerrarla: se ajustó la fixture para usar la misma condición de mensaje activo/guía tras timeout que la aplicación. Este defecto del visor no acredita un fallo de cierre en el juego real.

## Validación

22 pruebas dirigidas correctas: `hands-native`, `tutorial-hand-sequence`, `tutorial-placement-focus`. Compilación correcta. Paquete web correcto: 587 archivos, 382099511 bytes, 859 enlaces relativos y 20 GLB de runtime. Logs comprimidos y hashes de sus bytes originales en `logs.json`.

No acredita todas las culturas, todas las semillas, animación completa por vídeo, móvil físico, sombreado nocturno ni aceptación general del juego. La prueba de 100 noches es independiente y sigue en ejecución.
