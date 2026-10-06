# Reservas a través de dos noches naturales

El fixture `animal-reserve-days.html` crea una partida desde newGame, paga un centro, un cultivo legal y un anciano cada día. Avanza mediante Game.tick y WorldScene.render; los planes, animales, combate, cierre de incursión y amanecer los genera la simulación. No se asigna ningún plan de incursión ni se cambia manualmente el contador de día.

Se acelera la observación con bloques de cinco segundos simulados fuera de incursiones y 0,25 durante ellas. Entre bloques se aplica actorsReady antes de avanzar. Esto no reproduce la cadencia exacta de advanceReal del gameplay, no mide frametime y no es un test de HUD/tutorial ni equilibrio de plantaciones grandes.

## Resultados

Sabana y Gran Cañón, seed 712, cultura Mapungubwe, calidad media, navegador de escritorio:

- Dos noches completadas y entrada natural en el día 3, sin derrota.
- Primera noche con facóquero, segunda con hiena. Ambos animales toman un rig de reserva.
- Dos RaidEnded y dos Dawn por recorrido; ambas especies realizan golpes lógicos.
- Las dos reposiciones de rigs ocurren fuera de incursiones. El pool final tiene cinco reservas, una por especie.
- Ocho cargas de modelo antes y después del recorrido; sin cargas adicionales ni avisos/errores de consola capturados.

`summary.json` verifica estos invariantes contra ambos informes crudos, incluidos los golpes de cada especie. Las primeras capturas de datos no incluían RaidSpawned por un nombre de evento incorrecto en el filtro QA; el filtro ya está corregido para futuras ejecuciones. Los eventos de final de incursión, golpes, planes y amanecer sí están conservados y acreditan las dos noches.

Los resultados cubren la renovación de reservas base durante las primeras noches. La preparación de veinte animales de una composición controlada está comprobada por separado en `../animal-planned-reserves/` y `../animal-reserve-scheduling/`. Pendiente: noches posteriores con composiciones naturales repetidas, recarga de guardados, memoria de campañas largas y móvil físico.
