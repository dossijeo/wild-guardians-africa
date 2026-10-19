# Wild Engine: coste del acortamiento de rutas

## Causa medida

En la incursión de Manglares/712 de la jornada 48, `Game.tick` tardó unos
7,5 s durante la entrada de 16 animales. Un perfil de CPU de esa llamada
atribuyó aproximadamente 7,0 s a `nav_intent_plan_attack_wall`, de los cuales
6,9 s fueron `spatial_world_route_cached` y solo 44 ms la consulta del
perímetro. La reconstrucción del grafo de recintos **no** era el cuello de
botella. Dentro de las consultas de rutas, 6,1 s correspondieron a
`terrainValid`, principalmente a relieve, agua y humedales evaluados durante
las comprobaciones físicas continuas.

El planificador encontraba rutas en el grafo, pero `shortenOneCorner()`
intentaba acortarlas probando físicamente los dos segmentos de cada posible
esquina. Una ruta de 274 puntos podía desencadenar cientos de barridos largos,
aunque ninguno produjera un atajo. La complejidad física crecía con el número
de puntos y con la longitud de los segmentos probados.

## Cambio

Wild Engine sigue construyendo la misma ruta válida mediante sectores y
portales. Para el acortamiento opcional, ordena implícitamente los puntos por
la longitud geométrica que tendrían los dos tramos y valida físicamente como
máximo las dieciséis mejores propuestas. Solo sustituye la ruta cuando ambos
tramos pasan las colisiones nativas y son más cortos. Si ninguno pasa, conserva
la ruta del grafo. No cambia velocidades, colisiones, prioridades, daños ni
economía.

La cota limita una mejora opcional del recorrido, no la búsqueda de una ruta
ni la validación de su movimiento. Puede elegir una ruta diferente del
algoritmo previo si este encontraba un atajo en una esquina posterior. En tal
caso debe evaluarse la validez física y el resultado de juego; no se promete
equivalencia universal de trayectorias.

## Reproducción

La partida congelada está en
`tests/fixtures/manglares712-d48-wall-planner.json.gz` (SHA-256
`5721eeeb162fbca9ccd38dc99026a325ac3ebd764ea1e9ad4a08984dac2adfcf`).
El benchmark aísla una sesión WASM descartable, cancela las antiguas reservas
del guardado y replantea las primeras cuatro intenciones de ataque. Es una
**microprueba de navegación**, no una campaña de balance. Para ejecutarla:

```sh
node tools/experiments/benchmark-native-wall-shortening.mjs
```

Para comparar binarios sin cambiar el código de juego, establece
`WILD_ENGINE_SPATIAL_SERVICES_WASM` antes de ejecutar el benchmark. La línea
base fue el WASM de `main` en `f2808e46`, SHA-256
`674bdf018817e1fa75e5181525faa3f516b90b9072af844fdc08e64fdcbf6b9c`.
La variante experimental dio SHA-256
`09616da85bf59c50c0cde7b743a4bdccb2eac06ec4eb0b79f79c44ef71d9caa9`.
Ambas se compilaron con `tools/build-spatial-savanna-wasm.sh` y el mismo
Emscripten 3.1.5. El guardado y los cuatro orígenes fueron idénticos.

| Orden ABBA | Base A (ms) | Acotada B (ms) |
| --- | ---: | ---: |
| B/A/A/B, suma de cuatro actores | 5.406 / 5.575 | 308 / 302 |

Los cuatro actores eligieron las mismas murallas y los hashes de sus cuatro
rutas completas coincidieron entre A y B. Las consultas de caché acertadas y
fallidas también fueron iguales. Este caso mide una reducción de trabajo
físico inútil, no un cambio de objetivo ni una mejora de la tabla de caché.
Ambos binarios comprometieron 16 MiB de memoria lineal; el WASM nuevo ocupa
270 bytes más en disco.

Una primera variante con solo cuatro pruebas de atajo hizo este caso aún más
rápido, pero alargó indebidamente una ruta real de riego en Desierto. Ocho
pruebas también fallaron esa regresión. Dieciséis recuperaron el acceso de
riego y conservaron una mejora de aproximadamente 18 veces en la consulta
congelada. Las variantes descartadas no son los resultados B de la tabla.

En la reproducción restaurada de los cinco segundos de entrada, el hash de
estado activo fue idéntico (`ba512e3607c76a58ca51d015279647f533e1f9a5d5d5a8a6799c4b9b0be5e93d`),
pero `Game.tick` mejoró solo de 2.241 a 2.114 s. Esa restauración reconstruye
otra residencia de sectores, por lo que no sustituye a la campaña continua.

En una campaña continua de 14 noches, Manglares/712, estrategia `good`,
defensa topológica y balance sin cambios:

| Versión | `Game.tick` acumulado | Cultivos al final | Monedas al final | Noches verificadas |
| --- | ---: | ---: | ---: | ---: |
| A, acortamiento exhaustivo | 101,60 s | 133 | 827 | 14 |
| B, acortamiento acotado | 52,96 s | 142 | 981 | 14 |

La reducción observada de `Game.tick` es del 47,9 %. Las trayectorias de la
campaña divergen desde la primera jornada; sus cargas posteriores no son
idénticas. Por ello, esta cifra es una comparación integral del sistema, no
una estimación aislada del algoritmo. El benchmark ABBA anterior sí compara
las mismas cuatro consultas y rutas. Ambas campañas continúan sin derrota en
la noche 14; no se extrapola una victoria a 100 noches.
El hash serializado de B fue
`47a4f8cb2899055671079d72fbdb0f469c304b17909a46e06e6a62de4df85e70`.

## Verificación y límites

- Las 87 pruebas del workflow nativo de rutas, incursiones, intenciones,
  trabajadores y reparaciones pasaron con el WASM final. Incluyen el caso de
  riego del Desierto que rechazó las variantes de cuatro y ocho propuestas.
- La regresión `spatial-native-wall-shortening.test.js` replantea cuatro
  ataques desde Manglares/712 y comprueba que la reserva nativa solo acepta
  rutas físicamente validadas hacia murallas activas.
- El planificador nativo valida cada tramo continuo antes de confirmar una
  intención. El acortamiento también utiliza los mismos barridos físicos.
- Queda por medir campañas más largas y otros biomas con el binario integrado.
  Las diferencias económicas de una campaña con rutas distintas deben
  revisarse por separado del ahorro de CPU a entrada idéntica.

Los overlays y VFX no participan en este benchmark nativo sin renderizador.
