# Tiempos del diario de presentación

El diario de ciclo de vida que publica la autoridad incluye `at`, el valor de
`state.elapsed` cuando se registra cada hecho. Este reloj es de simulación:
queda inmóvil durante las pausas y no depende del reloj del navegador. Los
hechos conservan su orden, incluso cuando varios ocurren en el mismo instante.
La precisión es la del paso de simulación, no la de cada operación interna.

El receptor comprueba antes de reconciliar que los diarios temporizados sean
completos y no decrecientes, y que todos sus tiempos estén entre el estado
anterior y el estado confirmado. Para compatibilidad sigue aceptando diarios
antiguos sin ningún `at`; una mezcla incompleta se rechaza. El agrupador y el
diario de recuperación conservan los hechos con sus tiempos.

El campo se añade únicamente a los hechos que ya contiene el diario: referencias
a ciertos eventos y retiradas de animales. No cambia los eventos de juego ni
los guardados, no temporiza todos los eventos, las poses o las revisiones de
terreno y no autoriza reproducir trayectorias ni adelantar la presentación.
Falta una línea temporal global y un horizonte seguro que coordinen todas esas
dependencias. Las pruebas son de contrato y de autoridad local, no demuestran
una mejora de rendimiento ni equivalencia visual en WebGPU.
