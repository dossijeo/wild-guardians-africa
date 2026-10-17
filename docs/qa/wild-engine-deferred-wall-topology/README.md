# Topología diferida de murallas: primer corte experimental

Rama: `codex/wild-engine-deferred-wall-topology`, creada desde `ca212cd964cef246bcd81f485c8a25a6a2e2a6e4`. No cambia economía, daño ni física. El binario WASM de referencia tiene SHA-256 `7817ebadc3dfa4c4d32f6197b5c4eb53468ad5f7f23293d72b902c23a7707095`; el candidato, `40651bd23c30879601c1f410159b3341d6937f701faf1c5e916414ae440616f6`.

## Auditoría del flujo efectivo

```text
Antes: quoteWallChain -> wallPlacement por módulo -> planNewWallGates
       -> rutas completas para ordenar puertas -> withWallPreview (barreras reales
       provisionales) -> prueba física de puerta -> rutas previas y posteriores
       de centros/trabajadores -> restauración de barreras y props
       -> plan preparado -> buildWallChain -> pago + mutación local + evento

Ahora: quoteWallChain -> wallPlacement por módulo -> planNewWallGates
       -> ordenar candidatos por distancia geométrica -> una preview exterior
       -> prueba física local de puertas con overlay de solo lectura
       -> prueba física de accesos -> restauración local de props
       -> plan preparado -> buildWallChain -> pago + mutación local + evento
```

`buildWallChain` ya distingue la cotización preparada de la construcción y aplica las barreras en una transacción nativa. En el caso medido, la construcción de 15 módulos generó una llamada `applyBarrierChanges`, cuatro actualizaciones de sector y ninguna nueva consulta de ruta. El coste principal corresponde a la **propuesta**, no al pago. `spatial-crop-enclosure-plan.js` sigue certificando candidatos mediante `withWallPreview`; no existe todavía un overlay topológico de solo lectura.

La puntuación de puertas construía rutas del poblado a centros solo para ordenar candidatos. Ahora usa distancias geométricas para ese orden. La prueba local de cada puerta ya no sustituye una muralla provisional por otra en el grafo: `spatial_overlay_local_clear` ignora temporalmente sus IDs en la consulta y evalúa el marco propuesto con los mismos predicados nativos de terreno, props y colisiones estáticas. No crea barreras, rutas ni sectores. Si faltan sectores, no existe la pieza en la preview o la puerta necesita suprimir props adicionales, devuelve `unknown` y conserva la previsualización anterior como fallback. La validación posterior de accesos laborales sigue utilizando rutas físicas. La elección de puerta puede variar en otra geometría; por eso debe evaluarse su legalidad física, no exigir siempre la misma coordenada.

`spatial_restore_removed_props` reconstruía todos los chunks residentes y sus sectores para todos los perfiles. Ahora conserva la geometría de los props residentes suprimidos y restaura solo sus huellas locales. Si la geometría no está disponible o hay más de 16 cambios en un lote, mantiene la reconstrucción global segura. La geometría retenida se descarta al restaurar el prop y al regenerar terreno/asentamientos. La tabla se crea perezosamente porque el módulo standalone no ejecuta constructores globales C++.

El `spatial-intent-state.cpp` de esta base contiene un planificador experimental de tareas por lotes y una revisión del grafo para rechazar propuestas obsoletas; **no contiene** un registro activo persistente con `nav_intent_reconcile_topology`. Por tanto, esta rama no puede afirmar que haya refactorizado una reconciliación que aún no está integrada en `main`. La certificación de acceso mediante ruta sigue siendo costosa y necesaria en los casos ambiguos: `lazy_connected` expresa conectividad lógica posible, no una prueba suficiente de ruta física continua. `unknown` conserva su significado.

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

## Corrección y trabajo restante

Pasaron 102 pruebas dirigidas de puertas automáticas, trabajadores dentro/fuera, ruta cortada por murallas, recintos parciales, barreras naturales, reparaciones, persistencia de props suprimidos y previsualizaciones anidadas. Se añadió una comparación directa entre overlay y previsualización anterior de cada puerta viable de un anillo y seis pruebas equivalentes en los seis biomas; todas pasan. La consulta overlay deja el contador de reconstrucción de sectores intacto. Tras el ajuste de Desierto pasaron de nuevo 33 pruebas focalizadas de puertas, trabajadores y barreras naturales. También pasó `npm run build` con el binario actual. La suite completa llegó a 910 pruebas antes de detenerse por campañas de larga duración; las dos fallas observadas fueron las conocidas de `active-farm.test.js` (derrota en vez de victoria en dos granjas de 100 noches). Ese simulador no construye murallas y no ejercita estos cambios. La suite completa no está validada en esta rama.

Esto **no completa** la arquitectura solicitada. El overlay solo resuelve la prueba física **local de la puerta**. `withWallPreview` aún muta temporalmente la topología confirmada para estudiar el recinto y validar accesos: hace falta un overlay topológico de solo lectura para esas consultas, con revisiones independientes. El paso siguiente es sustituir las pruebas de conectividad que no necesitan rutas completas por consultas topológicas conservadoras y dejar las rutas físicas para la certificación final cuando la conectividad no baste. Después deben compararse los estados congelados de Gran Cañón, reparaciones, sectores ausentes y propuestas repetidas, además de medir `Game.tick` y campañas. No debe integrarse en `main` antes de esas pruebas.
