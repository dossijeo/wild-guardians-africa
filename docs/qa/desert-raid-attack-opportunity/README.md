# Desierto/123: posiciones de ataque en las noches 1 y 29

Este ensayo amplía la [captura tardía de `main`](../desert-late-raid-main-replay/README.md) sin modificar la simulación. La búsqueda anterior consultó posiciones simples alrededor de los cultivos. Esta usa `reachableApproach()` del juego: para cada cultivo vivo comprueba hasta seis puntos, transitabilidad, oclusión estática del ataque y ruta nativa. Conserva `unknown` separado de `blocked`.

Base: `origin/main` `0dfd99ac8531a4b783c6e461920ba9eb404aebee`; binario `spatial-savanna.wasm` SHA-256 `6feeea330cf5c8d0e338503e85abbb007d6803cd1727c0b425623956234ec551`. El instrumento tiene SHA-256 `8f0fc3978e05067a9effafedd5e5b0cfa9396bb8089006d153dcdc128a7f2d89`.

```powershell
$env:WILD_PROBE_ALT_EXTERIOR='1'
node tools/experiments/probe-native-raid-attack-opportunity.mjs docs/qa/desert-raid-attack-opportunity/desierto-123-day1-main-pre-entry.json.gz test-results/day1-attack-opportunity.json
node tools/experiments/probe-native-raid-attack-opportunity.mjs docs/qa/desert-late-raid-main-replay/desierto-123-day29-main-pre-entry.json.gz test-results/day29-attack-opportunity.json
```

| Estado congelado | Cultivos vivos | Especies probadas | Posiciones exteriores válidas entre 12 | Cultivos examinados | Aproximaciones con ruta encontrada |
| --- | ---: | ---: | ---: | ---: | ---: |
| Día 1, antes de incursión | 15 | 1 | 0 | 15 desde la entrada elegida | 13 |
| Día 29, antes de incursión | 73 | 5 | 19 pares posición/especie | 1.752 entre entrada y posiciones alternativas | 0 |

El control del día 1 demuestra que el mismo instrumento detecta aproximaciones reales cuando existen. En el día 29, ninguno de los 73 cultivos tiene una aproximación encontrada desde la entrada seleccionada para facóquero, hiena, león, rinoceronte o búfalo. Tampoco la tiene desde las doce posiciones muestreadas alrededor de la envolvente de murallas. Diecinueve pares posición/especie cumplen transitabilidad y testigo exterior; los demás no se consultan. No hubo `unknown` en las aproximaciones realizadas ni mutación del estado serializado. Las salidas íntegras están en [día 1](day1-positive-control.json) y [día 29](day29-attack-opportunity.json).

Esto **no certifica** que el recinto completo sea impenetrable: `reachableApproach()` prueba seis puntos por cultivo, las doce entradas exteriores no abarcan toda la frontera, y la prueba no reconstruye las reservas ni la selección táctica de una incursión real. Sí descarta una oportunidad obvia en estas posiciones con las reglas actuales, para las cinco especies. No se debe fusionar la PR experimental #143 ni aumentar la presión militar basándose solamente en estas noches sin contacto. Una corrección de entrada necesita un testigo positivo: un punto exterior legal desde el que una unidad pueda alcanzar una aproximación de ataque válida que la selección actual omita.
