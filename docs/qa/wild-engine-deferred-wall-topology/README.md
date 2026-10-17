# Topología diferida de murallas: overlay local experimental

Rama: `codex/wild-engine-deferred-wall-topology`, creada desde `ca212cd964cef246bcd81f485c8a25a6a2e2a6e4`. No cambia economía, daño ni física. El binario WASM de referencia tiene SHA-256 `7817ebadc3dfa4c4d32f6197b5c4eb53468ad5f7f23293d72b902c23a7707095`; el candidato actual, `fd4aec8e44b9d0632d7192db71b2b1a799cc2ad3e2c69bea462311ee968c40f3`. El candidato de `batch-props-abba.json` tenía SHA-256 `ee33a5a56dcb57454e43c13c30f23b1d287f2c077c41a796a6e633d6f28857be`; el anterior, `6e8294da7a97673f7ec121536dfe533292e0bbe9150bc4f47c9b9ab3812d7c7a`. El primer candidato, archivado en `full-abba.json`, tenía SHA-256 `40651bd23c30879601c1f410159b3341d6937f701faf1c5e916414ae440616f6`.

## Auditoría del flujo efectivo

```text
Antes: quoteWallChain -> wallPlacement por módulo -> planNewWallGates
       -> rutas completas para ordenar puertas -> withWallPreview (barreras reales
       provisionales) -> prueba física de puerta -> rutas previas y posteriores
       de centros/trabajadores -> restauración de barreras y props
       -> plan preparado -> buildWallChain -> pago + mutación local + evento

Ahora: quoteWallChain -> wallPlacement por módulo -> planNewWallGates
       -> ordenar candidatos por distancia geométrica
       -> pruebas locales de habitación y puertas con overlay de solo lectura
       -> preview completa solo cuando falta información local o se certifican
          accesos existentes -> restauración local de props
       -> plan preparado -> buildWallChain -> pago + mutación local + evento

Después del pago: la mutación registra el área de los muros cambiados sin
       consultar rutas. Cuando cada actor vuelve a moverse, conserva su ruta
       si el cambio de murallas está separado de todo el recorrido restante;
       ante intersección, cambio de otra dependencia, sesión nueva o historial
       insuficiente, usa la planificación física normal antes de avanzar.
```

`buildWallChain` ya distingue la cotización preparada de la construcción y aplica las barreras en una transacción nativa. En el caso medido, la construcción de 15 módulos generó una llamada `applyBarrierChanges`, cuatro actualizaciones de sector y ninguna nueva consulta de ruta. El coste principal corresponde a la **propuesta**, no al pago. `spatial-crop-enclosure-plan.js` sigue certificando candidatos mediante `withWallPreview`; no existe todavía un overlay topológico de solo lectura.

La puntuación de puertas construía rutas del poblado a centros solo para ordenar candidatos. Ahora usa distancias geométricas para ese orden. `spatial_overlay_local_clear` evalúa hasta 128 barreras propuestas sobre la geometría nativa actual sin instalarlas en el grafo. Sirve tanto para las posiciones interiores que determinan si una habitación precisa puerta como para comprobar la puerta candidata. La operación no crea barreras, rutas ni sectores; 12 consultas locales en las cuatro cotizaciones de Desierto sumaron 0,23–0,31 ms. Si faltan sectores, se excede el lote, o hay props nuevos que suprimir, devuelve `unknown` y se rehace el borrador con la previsualización anterior. La validación posterior de accesos laborales sigue utilizando rutas físicas. La elección de puerta puede variar en otra geometría; por eso debe evaluarse su legalidad física, no exigir siempre la misma coordenada.

`spatial_restore_removed_props` reconstruía todos los chunks residentes y sus sectores para todos los perfiles. Ahora conserva la geometría de los props residentes suprimidos y restaura solo sus huellas locales. Si la geometría no está disponible o hay más de 64 cambios en un lote, mantiene la reconstrucción global segura. La geometría retenida se descarta al restaurar el prop y al regenerar terreno/asentamientos. La tabla se crea perezosamente porque el módulo standalone no ejecuta constructores globales C++.

Un lote de 2–64 props residentes ya no repuebla cada chunk ni reconstruye el mismo sector una vez por prop. Aplica todos los cambios confirmados, repuebla cada chunk afectado una vez por perfil, actualiza las huellas de los props y reconstruye la unión ordenada de los sectores afectados. El caso de un solo prop mantiene el recorrido anterior; los cambios sin geometría conocida y los lotes mayores conservan el fallback global. Esto agrupa trabajo topológico, sin cambiar las colisiones ni introducir un estado paralelo de navegación.

El `spatial-intent-state.cpp` de esta base contiene un planificador experimental de tareas por lotes y una revisión del grafo para rechazar propuestas obsoletas; **no contiene** un registro activo persistente con `nav_intent_reconcile_topology`. Por tanto, esta rama no puede afirmar que haya refactorizado una reconciliación que aún no está integrada en `main`. La certificación de acceso mediante ruta sigue siendo costosa y necesaria en los casos ambiguos: `lazy_connected` expresa conectividad lógica posible, no una prueba suficiente de ruta física continua. `unknown` conserva su significado.

El espejo de murallas registra las cajas físicas de los mismos obstáculos que envía al núcleo nativo durante un historial acotado de 64 revisiones; no reconstruye una segunda geometría de barreras. Una ruta activa conserva un sello efímero de la sesión, las revisiones no relacionadas con murallas y la residencia de chunks. Solo si esas dependencias siguen iguales y el recorrido restante está fuera de todas las cajas modificadas, `walkTo` actualiza su versión sin buscar una ruta nueva. El historial no responde consultas de transitabilidad ni sustituye a WASM: únicamente demuestra que esos muros no pueden haber tocado el trayecto. El navegador marca por identidad las rutas que creó en esta sesión; una ruta restaurada o ajena no recibe automáticamente ese certificado aunque coincida su número de revisión. Las rutas cercanas, cambios de props/centros/terreno, residencia alterada, cargas de partida y sellos ausentes mantienen el fallback nativo. La comprobación se hace al **siguiente movimiento** de ese actor, no al comprar la muralla. Las regresiones comprueban construcción, retirada, radios de trabajador y animal grande, descarga de sectores y una muralla nativa cruzando la ruta: el actor replantea antes del primer paso y no atraviesa la barrera.

## Reproducción y mediciones

Compilar el candidato con el Emscripten fijado para el proyecto:

```sh
source /opt/emsdk/emsdk_env.sh
bash tools/build-spatial-savanna-wasm.sh
```

Extraer el binario base de la revisión indicada como `baseline.wasm` y ejecutar:

```sh
node tools/experiments/benchmark-deferred-wall-topology.mjs baseline.wasm src/world/hierarchical-wasm/spatial-savanna.wasm report.json ca212cd964cef246bcd81f485c8a25a6a2e2a6e4
```

`full-abba.json` contiene cuatro rondas A/B/B/A, calentamiento de dos propuestas, ocho propuestas y ocho supresiones hipotéticas de un prop sólido residente por ronda, sobre Sabana/712 con nueve chunks residentes. Los valores siguientes son medianas por ronda; el p95 está en el JSON. El estado serializado tras la construcción y la posición de la puerta coincidieron en las cuatro rondas. Las seis clases de unidad dieron idénticos resultados físicos antes, durante y después de suprimir el prop: ninguna podía ocupar los cinco puntos muestreados antes; todas podían durante; el estado inicial volvió al restaurarlo.

| Variante | Propuesta, ms | Rutas / 8 | Previews / 8 | Sectores / 8 | Restaurar prop, ms | Sectores prop / 8 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Base A1 | 32,20 | 16 | 24 | 256 | 1790,64 | 3840 |
| Candidata B1 | 14,35 | 8 | 8 | 64 | 54,54 | 64 |
| Candidata B2 | 11,49 | 8 | 8 | 64 | 51,37 | 64 |
| Base A2 | 38,53 | 16 | 24 | 256 | 1850,27 | 3840 |

La restauración de props residentes mejora aproximadamente 32–35 veces en esta carga. La propuesta de anillo evita las rutas anticipadas de **ordenación** y las transacciones anidadas para probar puertas, pero conserva las rutas de garantía de acceso. No extrapolar esta prueba a campañas completas. Memoria lineal: 16 MiB en todas las rondas. La construcción pagada tomó 12–15 ms en estas rondas; no hay muestras suficientes para una comparación estadística de esa etapa.

`batch-props-abba.json` compara de forma aislada el mismo código JS con el binario anterior a la agrupación y el nuevo, ambos sobre ocho props sólidos cercanos en Sabana/712. Cada ronda contiene ocho previsualizaciones y sus restauraciones. El calentamiento, el estado inicial, las ocho supresiones, sus resultados de ocupación física para trabajadores y cinco especies, y el hash de la compra posterior coinciden. La mediana por previsualización A/B/B/A fue **652,07 / 576,08 / 555,93 / 666,81 ms**; el p95 fue **730,61 / 680,32 / 605,26 / 716,13 ms**. Las actualizaciones de sector por ronda bajaron de **544 a 288**; una supresión individual mantuvo **64** en ambas variantes. La reducción de tiempo mediana es aproximadamente 12–17 % para este lote, sin extrapolarla a todos los tamaños o biomas. El coste restante procede en gran parte de regenerar chunks para cada perfil y de las reconstrucciones de sector todavía necesarias. Reproducir con el mismo script anterior, usando como base el WASM de `29872dc1` y omitiendo el argumento opcional de fuente JS: ambas variantes ejecutan exactamente el JS actual.

`twenty-props-abba.json` usa el mismo estado, JS y metodología, con `PROP_CLUSTER_COUNT=20`. El binario base es el de `993a12b9`; el candidato solo eleva a 64 el límite de cambios locales agrupables. Medianas A/B/B/A por previsualización: **1904,33 / 1210,68 / 1249,70 / 1892,95 ms**; reconstrucciones de sector por ronda: **3840 / 560 / 560 / 3840**. Se conservaron la ocupación antes/durante/después de la hipótesis para trabajadores y cinco especies, la cotización y el hash tras la compra. Se trata de un escenario de muchos props afectados; no representa el coste ordinario de construir 20 murallas sin props. La prueba de regresión cubre ahora una supresión simultánea de 20 props.

Se probó también validar una ruta laboral afectada con consultas locales de solo lectura antes de usar `withWallPreview`. En Desierto/983 la variante añadió consultas pero mantuvo 16 previsualizaciones, 64 actualizaciones de sector y 172 rutas por cuatro cotizaciones. La diferencia temporal ABBA no fue atribuible al cambio, por lo que se descartó; una ruta realmente afectada sigue exigiendo la prueba física completa.

`active-routes-abba.json` aísla el coste posterior a una construcción legal de 20 murallas en Desierto/983. Genera 20 rutas físicas válidas hacia el poblado, registra las intenciones activas, compra el trazado remoto y mide la primera llamada de movimiento de cada trabajador. Las posiciones finales coinciden en A/B/B/A. La implementación anterior solicitó **20 rutas nuevas** por ronda; la candidata **cero**, sin ejecutar comprobaciones de segmento. Los tiempos observados fueron **1,56 / 1,49 / 0,45 / 1,47 ms**. `active-routes-tick-abba.json` ejecuta `Game.tick` durante 0,05 segundos simulados sobre el mismo estado: **4,63 / 3,56 / 0,77 / 2,41 ms**, igualmente con 20 frente a cero nuevas rutas y posiciones finales idénticas. Los 20 trabajadores se colocaron de forma sintética en posiciones transitables y recibieron rutas nativas válidas; es una carga controlada, no una campaña económica. Cuatro observaciones por variante son insuficientes para extrapolar un p95 o una mejora sostenida de campaña; la eliminación de 20 solicitudes redundantes sí es determinista. Una variante rechazada que comprobaba todos los segmentos evitó igualmente las búsquedas, pero ejecutó 634 consultas geométricas y tardó 10,2–12,9 ms frente a 2,4–2,9 ms de la referencia. La comparación motivó la invalidación por área de cambio, sin consultas físicas adicionales para rutas manifiestamente lejanas.

Reproducción: `node tools/experiments/benchmark-deferred-active-routes.mjs report.json 415c23a5`; para la medición de tick, establecer `WALL_BENCH_TICK=1` en el entorno antes de ejecutar el mismo comando. Ambas variantes usan el mismo binario WASM y generan la misma geometría y el mismo trazado pagado.

`full-abba-local-overlay.json` repite el mismo escenario con el overlay del trazado completo, sobre los binarios cuyos hashes constan en el JSON. Frente a 31,84 y 32,55 ms en las rondas base, las medianas candidatas fueron 5,76 y 5,46 ms. El p95 candidato fue 7,62/7,42 ms. Las ocho cotizaciones pasaron de 24 a **cero previews** y de 256 a **cero reconstrucciones de sector**; la compra pagada siguió haciendo cuatro actualizaciones locales de sector. Se mantuvieron 15 módulos, una puerta en la misma posición, coste 150, hash del estado final y 16 MiB de memoria lineal. Esta mejora corresponde al anillo sin rutas laborales que certificar; no extrapola la eliminación de toda previsualización a recintos ocupados.

### Estado congelado de Desierto con trabajadores activos

`desert-abba.json` reproduce Desierto/983, día 15, con 42 trabajadores llegando o huyendo. Compara cuatro cotizaciones por ronda de un trazado de cinco módulos, sin mutar el estado, y después ejecuta una compra con la cotización preparada. El script conserva los SHA-256 del código JS y los dos binarios. Ejecutar:

```sh
node tools/experiments/benchmark-deferred-wall-desert.mjs baseline.wasm src/world/hierarchical-wasm/spatial-savanna.wasm desert-report.json ca212cd964cef246bcd81f485c8a25a6a2e2a6e4
```

| Variante | Mediana por cotización, ms | p95, ms | Rutas / 4 | Previews / 4 | Updates de sector / 4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Base A1 | 49,03 | 53,69 | 172 | 24 | 96 |
| Candidata B1 | 35,24 | 39,16 | 172 | 20 | 80 |
| Candidata B2 | 36,51 | 39,59 | 172 | 20 | 80 |
| Base A2 | 48,39 | 59,52 | 172 | 24 | 96 |

La rama elimina una segunda comprobación del mismo plan ya declarado fallido: si todas las puertas alternativas fallan y se revierten, repetir `preserved()` no puede aportar información nueva. Esta supresión ahorra una preview y cuatro actualizaciones de sector por cotización en este escenario. La compra resultó idéntica en ambas variantes: cinco módulos, una puerta en la misma posición, precio 50, cero rutas al construir y mismo SHA-256 del estado serializado. La carga lineal fue 16 MiB. **Persisten 43 búsquedas por cotización** para certificar accesos laborales previamente existentes; estas búsquedas dominan este caso y no deben eliminarse sin una prueba física equivalente.

Se probó como variante descartada sustituir cada ruta con una comprobación directa de segmento cuando este era transitable. Redujo las búsquedas de 172 a 92, pero la mediana candidata subió aproximadamente de 31–34 a 36–39 ms en las rondas próximas: la comprobación física consumía el ahorro. Se revirtió. Los tiempos de las rondas con solo cuatro muestras cada una son orientativos; los recuentos de operaciones y la igualdad funcional son los resultados más sólidos.

`desert-abba-local-overlay.json` repite el estado con la consulta local de trazado. Medianas A/B/B/A: **51,37 / 31,98 / 32,34 / 46,92 ms**. Las cuatro cotizaciones pasan de 24 a 16 previews, de 48 a 32 transacciones de barrera y de 96 a 64 actualizaciones de sector. Conservan las 172 rutas de auditoría de acceso, la misma puerta, precio 50 y el mismo hash tras construir. La mejora es real en este estado, pero la mayoría de previews restantes obedecen a la certificación laboral.

### Construcción sencilla de 20 módulos

`flat20-abba.json` añade el escenario solicitado de una línea sobre terreno despejado de Desierto/983. La partida empieza en una posición generada por Wild Engine y contiene un centro **colocado legalmente**, con ruta laboral válida antes y después de construir. Los 20 módulos son legales, no hay piezas omitidas ni props que suprimir, y no se genera puerta. Reproducción:

```sh
node tools/experiments/benchmark-deferred-wall-flat20.mjs baseline.wasm src/world/hierarchical-wasm/spatial-savanna.wasm flat20-report.json ca212cd964cef246bcd81f485c8a25a6a2e2a6e4
```

| Variante | Mediana, ms | p95, ms | Previews / 8 | Sectores / 8 | Rutas / 8 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Base A1 | 19,30 | 24,06 | 16 | 160 | 8 |
| Candidata B1 | 4,50 | 9,57 | 0 | 0 | 8 |
| Candidata B2 | 4,78 | 5,55 | 0 | 0 | 8 |
| Base A2 | 20,49 | 23,25 | 16 | 160 | 8 |

La construcción pagada sí actualizó diez sectores en ambas variantes. Precio 200, 20 piezas y hash serializado final idénticos. Este caso muestra por qué un trazado abierto no debe montar una topología hipotética completa solo para averiguar si aparece una puerta. Las ocho rutas restantes certifican una vez por cotización el acceso **actual** del centro. Para omitir la prueba posterior, la variante candidata comprueba de forma conservadora que todos los segmentos de esa ruta queden fuera de los límites de colisión ampliados de los nuevos muros. Si se acercan, conserva la previsualización y la búsqueda física. Esto elimina las 16 previews por ronda sin afirmar que cualquier ruta de un recinto sea válida por simple conectividad lógica.

### Finca de Gran Cañón junto a barreras naturales

`canyon-diagnostic.json` usa la finca inicial real de Gran Cañón/712, 40 módulos propuestos, cuatro puertas y dos props suprimidos. El escenario obliga a utilizar la previsualización completa para parte del trabajo: el overlay local no puede simular esas supresiones y devuelve `unknown`. Con **dos muestras por ronda**, las medianas A/B/B/A fueron **3872 / 104 / 101 / 3794 ms**; las previews se redujeron de 42 a 4 por ronda y las actualizaciones de sector de 7788 a 144. Son cifras diagnósticas, no un benchmark estadístico definitivo. La mayor parte de la diferencia corresponde también a cambios anteriores de ordenación de puertas y prueba local de candidatos; no puede atribuirse solo al overlay de trazado incorporado ahora.

La variante base y la candidata proponen cuatro puertas en posiciones diferentes: el ranking anterior calculaba rutas, mientras el actual ordena por distancia antes de la validación física. Por eso **sus hashes serializados finales difieren** y no se presenta esta comparación como equivalencia exacta. Ambas pagaron 400, mantuvieron la ruta del poblado al centro y cada puerta permitió cruzar al trabajador sin dejar cruzar a ninguna de las cinco especies por su portal. El candidato con el overlay local forzado a devolver `unknown` produjo exactamente la misma propuesta y el mismo hash que el candidato normal, confirmando el fallback en este estado. Esta prueba no certifica todavía que todo el perímetro proteja cultivos frente al movimiento y al alcance de ataque; esa garantía exige una auditoría física específica.

## Corrección y trabajo restante

Pasaron 102 pruebas dirigidas de puertas automáticas, trabajadores dentro/fuera, ruta cortada por murallas, recintos parciales, barreras naturales, reparaciones, persistencia de props suprimidos y previsualizaciones anidadas. La comparación directa entre overlay y previsualización incluye ahora puntos de habitación, candidatas de puerta con el trazado completo y espacio no residente en los seis biomas; todas pasan. El caso congelado de Desierto compara además el plan con el fallback forzado de previsualización completa, verifica las rutas de 42 trabajadores y su movimiento tras construir. Instrumenta también que una ruta laboral afectada **sí** se vuelve a probar físicamente dentro de la preview. El benchmark de 20 módulos exige que la ruta laboral preexistente sobreviva y que la cotización lejana no reconstruya sectores hipotéticos. Pasaron 25 pruebas focalizadas tras esa ampliación, y `npm run build` con el binario actual. La suite completa llegó a 910 pruebas antes de detenerse por campañas de larga duración; las dos fallas observadas fueron las conocidas de `active-farm.test.js` (derrota en vez de victoria en dos granjas de 100 noches). Ese simulador no construye murallas y no ejercita estos cambios. La suite completa no está validada en esta rama.

Esto **no completa** la arquitectura solicitada. El overlay resuelve las pruebas físicas **locales** de habitaciones y puertas. `withWallPreview` aún muta temporalmente la topología confirmada para certificar accesos y planificar recintos; hace falta un overlay topológico de solo lectura para esas consultas, con revisiones independientes. El perfil congelado de Desierto muestra que las 43 rutas por cotización cuestan mucho menos que las transacciones de barrera, aunque siguen siendo cálculos anticipados. El paso siguiente es sustituir las pruebas de conectividad que no necesitan rutas completas por consultas topológicas conservadoras y dejar las rutas físicas para la certificación final cuando la conectividad no baste. Después deben compararse los estados congelados de Gran Cañón, reparaciones, sectores ausentes y propuestas repetidas, además de medir `Game.tick` y campañas. No debe integrarse en `main` antes de esas pruebas.
