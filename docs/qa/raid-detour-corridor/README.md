# Búsquedas incrementales sin invalidación por cuerpos externos

El checkpoint natural de noche 39 que seguía bloqueado tras la corrección de maniobras remotas ahora **termina**. Ambos animales llegan a sus propias salidas; se cierra la noche y se abre contratación del día 40. El informe completo conserva entrada, SHA, procedencia y rutas. Son 171 segundos simulados y 4,96 segundos reales en esta ejecución; no es una medición de FPS/GPU.

## Causa y solución

La búsqueda nativa encontraba un rodeo válido para evitar el trabajador caído, pero necesitaba 174 slices. El movimiento de otro animal, cientos de metros más lejos, modificaba la clave global y reiniciaba esa búsqueda cada paso.

Las claves y snapshots de los rodeos ahora incluyen los cuerpos cuyo disco de separación toca el rectángulo de búsqueda nativo: extremos redondeados y margen de 32 celdas. Un cuerpo externo no puede afectar sus nodos ni conectores. Si entra en el área, cambia la clave y se vuelve a buscar; la validación final sigue comprobando todos los cuerpos actuales. No cambian radios, velocidades, terreno, destino, salidas ni reglas de daño.

## Validación

- Regresión aislada: diez movimientos fuera del área causaban diez búsquedas; ahora se completa y conserva una. Un disco que alcanza el límite desde fuera y un cuerpo que se mueve dentro invalidan la búsqueda cuando corresponde.
- Incursión completa con `Game.tick(.1)`, recargando a los 51 pasos: termina con noche 39 completada y día 40/contratación. Cada segmento respeta velocidad máxima, navegación nativa y trabajadores incapacitados; ambos animales mantienen separación y alcanzan sus salidas exactas.
- 201 pruebas de navegación, movimiento, incursiones, encuentros, puertas, recarga y shields correctas; build de 207 módulos, 10,86 s. Permanece el aviso de bundle superior a 500 kB.

Pendientes: una campaña nueva de 100 noches con la estrategia responsable intensiva y defensas pagadas, las demás combinaciones de bioma/cultura y la validación visual/móvil de estos encuentros. El checkpoint resuelto no sustituye esas comprobaciones.

## Reproducción en navegador nativo

[Fixture de guardado real](../../../tests/browser/paid-defense-night39.html), probada en el navegador integrado sobre `a28c843` con `WorldScene`, modelos originales y calidad media. El SHA del checkpoint coincide con el de la reproducción CPU.

- [Inicio](native/start.png): ambos facóqueros vivos tienen modelo y rig cargados; el búfalo ya salido no tiene mesh residente.
- [Rodeo a los 25 segundos simulados](native/moving.png): el facóquero 95772 se ve en el mundo siguiendo el rodeo; ambos vivos conservan mesh y rig, sin errores.
- [Final](native/completed.png): 171 segundos simulados, día 40 y pausa de contratación; ambos llegan a sus salidas originales y sus meshes se retiran. Consola sin errores ni warnings.

Se utilizó el botón de avance de cinco segundos (50 ticks de 0,1 s), con render entre bloques. La fixture conserva también reproducción en tiempo real. Esta comprobación acredita carga/presencia del rig, representación de muestras del recorrido y resolución real en navegador; **no** acredita todas las animaciones/VFX intermedias, audio, HUD, FPS ni móvil físico.
