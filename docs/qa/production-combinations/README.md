# QA-001: entradas reales por bioma y cultura

El selector original ya tenía comprobados sus seis biomas y cinco culturas. Esta serie amplía la evidencia a la carga efectiva de `src/app/main.js`, WorldScene, HUD y tutorial, sin cambiar reglas ni assets.

## Manglares: cinco culturas

Desde `tests/browser/world-lifecycle.html` se pulsó Juego nuevo en el menú original y se eligió Manglares en el primer paso, seguido de cada cultura en el segundo: Mapungubwe, Saheliana, Suajili, Musgum y Etíope. Se comprobó el nombre completo del botón Comenzar antes de activarlo. Cada partida cargó y renderizó, mostró los dos primeros mensajes del tutorial y el HUD, arrancó con 1.000 monedas y se guardó/salió por el menú de pausa original.

`manglares-five-cultures.json` conserva las cinco cargas y salidas en un único documento, con 1235/366/422/504/530 renders respectivamente. Todos los contextos antiguos quedan perdidos y sus canvas desconectados, con listeners cero, worker terminado, stream muerto, timer nulo y cola vacía. El informe termina sin errores, sin mundo activo y con un único iframe de menú. `manglares-etiope.png` acredita el HUD y poblado de la quinta combinación.

El almacenamiento del padre de la fixture está aislado en memoria. Se usa calidad muy baja y audio nativo silenciado: este ensayo acredita entrada real y conservación de la selección, no rendimiento en otros perfiles ni calidad perceptual del audio. El inspector tiene pointer-events desactivados salvo su botón para no interceptar los controles del HUD. Se comprobó también el botón nativo de pausa, sin recurrir a Escape.

Estado de QA-001: parcial. Se suman estas cinco entradas a Sabana/Mapungubwe y Desierto/Etíope documentadas anteriormente: 7/30 entradas reales. Faltan las otras 23. No se equipara la matriz visual de WorldScene aislado con esta prueba del flujo real de producción.
