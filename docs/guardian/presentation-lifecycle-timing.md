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

Si una publicación incluye `elapsed`, el receptor exige que coincida con el
snapshot antes de aplicar el estado o sus eventos. Esto no proporciona un
buffer histórico ni separa todavía los ACK de recepción y aplicación visual.

El diario v2 incluye una referencia temporal para cada evento confirmado,
además de las retiradas de animales. El receptor comprueba la cobertura completa
y acepta también diarios antiguos que solo incluían determinados eventos. Los
tiempos permanecen en el diario de presentación: no cambian los eventos de juego
ni los guardados. Todavía no temporizan las poses o las revisiones de terreno,
y no autorizan reproducir trayectorias ni adelantar la presentación.
Falta una línea temporal global y un horizonte seguro que coordinen todas esas
dependencias. Las pruebas son de contrato y de autoridad local, no demuestran
una mejora de rendimiento ni equivalencia visual en WebGPU.

Una prueba con la autoridad Wild Engine real verifica la cobertura y el orden
de eventos de una incursión durante 30 lotes; no constituye una prueba de
partida completa ni de temporización visual en navegador. El volumen de datos
añadido al diario no se ha medido.

El guardián WebGPU utiliza el tiempo confirmado del diario para iniciar sus
gestos `SpellActivated`; en publicaciones antiguas sin dicho tiempo conserva
el del evento. Un hecho futuro no inicia una animación. La animación continúa
limitada por el reloj confirmado, sin adelantar la simulación. La prueba cubre
la selección del reloj y compatibilidad, no una partida visual integrada.

La ventana WebGPU de efectos confirmados conserva también los hechos de reparación mientras su polvo sigue visible, incluso si el evento sale del historial corto del estado. Las pruebas usan el tiempo de simulación y el renderer simulado; falta comprobarlo en partida real y no se ha medido su coste.
