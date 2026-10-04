# QA-001: entradas reales por bioma y cultura

El selector original ya tenía comprobados sus seis biomas y cinco culturas. Esta serie amplía la evidencia a la carga efectiva de `src/app/main.js`, WorldScene, HUD y tutorial, sin cambiar reglas ni assets.

## Manglares: cinco culturas

Desde `tests/browser/world-lifecycle.html` se pulsó Juego nuevo en el menú original y se eligió Manglares en el primer paso, seguido de cada cultura en el segundo: Mapungubwe, Saheliana, Suajili, Musgum y Etíope. Se comprobó el nombre completo del botón Comenzar antes de activarlo. Cada partida cargó y renderizó, mostró los dos primeros mensajes del tutorial y el HUD, arrancó con 1.000 monedas y se guardó/salió por el menú de pausa original.

`manglares-five-cultures.json` conserva las cinco cargas y salidas en un único documento, con 1235/366/422/504/530 renders respectivamente. Todos los contextos antiguos quedan perdidos y sus canvas desconectados, con listeners cero, worker terminado, stream muerto, timer nulo y cola vacía. El informe termina sin errores, sin mundo activo y con un único iframe de menú. `manglares-etiope.png` acredita el HUD y poblado de la quinta combinación.

El almacenamiento del padre de la fixture está aislado en memoria. Se usa calidad muy baja y audio nativo silenciado: este ensayo acredita entrada real y conservación de la selección, no rendimiento en otros perfiles ni calidad perceptual del audio. El inspector tiene pointer-events desactivados salvo su botón para no interceptar los controles del HUD. Se comprobó también el botón nativo de pausa, sin recurrir a Escape.

Estado de QA-001: parcial. Se suman estas cinco entradas a Sabana/Mapungubwe y Desierto/Etíope documentadas anteriormente: 7/30 entradas reales. Faltan las otras 23. No se equipara la matriz visual de WorldScene aislado con esta prueba del flujo real de producción.

## Gran río: cinco culturas

Se repitió el flujo nativo completo para Mapungubwe, Saheliana, Suajili, Musgum y Etíope. `gran-rio-five-cultures.json` registra cinco partidas, cada una con una carga completa, 1.000 monedas y renders reales antes de guardar/salir. Los contadores fueron 538/454/412/571/980. Todas dejan sus contextos perdidos, canvas desconectados, listeners cero, worker terminado, timer nulo y cola vacía; cero errores globales. `gran-rio-etiope.png` muestra el mundo y HUD de la quinta combinación.

Antes de iniciar se comprobó el aria-label original Comenzar con el bioma/cultura elegidos. Se espera a que termine la animación del menú para actuar sobre el selector. Calidad muy baja y almacenamiento aislado en memoria, con los límites del bloque anterior.

Estado actualizado: 12/30 entradas reales acreditadas; quedan 18 (Sabana4, Desierto4, Volcanes5 y Gran cañón5). QA-001 sigue parcial.

## Volcanes: cinco culturas

Se completó Juego nuevo, selección de Volcanes, elección de cada cultura y Comenzar en el menú/selector originales. `volcanes-five-cultures.json` registra Mapungubwe, Saheliana, Suajili, Musgum y Etíope: una carga completa por partida, 1.000 monedas iniciales y 382/468/410/444/611 renders antes de guardar y salir por el botón nativo de pausa. Se avanzaron los dos primeros mensajes del tutorial y se comprobó el HUD. `volcanes-etiope.png` conserva la quinta combinación.

Todas las escenas terminan con contexto perdido, canvas desconectado, cero listeners activos, worker terminado, timer nulo y cola vacía. Cero errores globales. Se comprobó el aria-label del botón Comenzar antes de cada arranque y se esperó el final del recorrido del menú. Calidad muy baja, almacenamiento aislado y audio silenciado, con los mismos límites descritos anteriormente.

Estado actualizado: 17/30 entradas reales acreditadas; faltan Gran cañón5, Sabana4 y Desierto4. QA-001 sigue parcial.

## Gran cañón: cinco culturas

Se completaron cinco nuevas partidas desde el menú y selector originales: Mapungubwe, Saheliana, Suajili, Musgum y Etíope. `gran-canon-five-cultures.json` registra una carga completa por combinación, 1.000 monedas iniciales y 514/562/587/572/859 renders antes de guardar y salir por el menú nativo de pausa. Se avanzaron los dos primeros mensajes del tutorial y se comprobó el HUD. `gran-canon-etiope.png` conserva la quinta combinación.

Todas terminan con contexto perdido, canvas desconectado, cero listeners activos, worker terminado, timer nulo y cola vacía. No se registran errores globales. Antes de iniciar se comprobó el aria-label del botón Comenzar y se esperó a que terminase el recorrido del menú. Calidad muy baja, almacenamiento aislado y audio silenciado; se conservan los límites del ensayo descritos anteriormente.

Estado actualizado: 22/30 entradas reales acreditadas; faltan cuatro culturas de Sabana y cuatro de Desierto. QA-001 sigue parcial.

## Sabana: cuatro culturas pendientes

Se añadieron nuevas partidas reales para Saheliana, Suajili, Musgum y Etíope, mediante Juego nuevo y los dos pasos del selector original. Mapungubwe ya está acreditada en `docs/qa-acceptance-start.md` y en los tres ciclos de `docs/qa/world-lifecycle/README.md`.

`sabana-four-cultures.json` conserva cuatro cargas completas con 1.000 monedas y 500/401/486/646 renders antes de guardar/salir por el menú de pausa. Se avanzaron los dos primeros mensajes del tutorial y se comprobó el HUD. `sabana-etiope.png` registra la cuarta combinación. Todas dejan el contexto perdido, canvas desconectado, listeners cero, worker terminado, timer nulo y cola vacía, sin errores globales. Calidad muy baja y almacenamiento en memoria, con los límites del ensayo descritos arriba.

Estado actualizado: 26/30 entradas reales acreditadas; faltan las cuatro culturas de Desierto distintas de Etíope. QA-001 sigue parcial.
