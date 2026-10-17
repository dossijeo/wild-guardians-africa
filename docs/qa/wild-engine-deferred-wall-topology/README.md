# Topología diferida de murallas: primer corte experimental

Rama: `codex/wild-engine-deferred-wall-topology`, creada desde `ca212cd964cef246bcd81f485c8a25a6a2e2a6e4`. No cambia economía, daño ni física. El binario WASM de referencia tiene SHA-256 `7817ebadc3dfa4c4d32f6197b5c4eb53468ad5f7f23293d72b902c23a7707095`; el candidato, `7fb2eb073f69a8a87e63fac76a3022871b8e6a7613e87b690da9bf138b6df585`.

## Auditoría del flujo efectivo

```text
Antes: quoteWallChain -> wallPlacement por módulo -> planNewWallGates
       -> rutas completas para ordenar puertas -> withWallPreview (barreras reales
       provisionales) -> prueba física de puerta -> rutas previas y posteriores
       de centros/trabajadores -> restauración de barreras y props
       -> plan preparado -> buildWallChain -> pago + mutación local + evento

Ahora: quoteWallChain -> wallPlacement por módulo -> planNewWallGates
       -> ordenar candidatos por distancia geométrica -> withWallPreview
       -> prueba física de puerta y accesos -> restauración local de props
       -> plan preparado -> buildWallChain -> pago + mutación local + evento
```

`buildWallChain` ya distingue la cotización preparada de la construcción y aplica las barreras en una transacción nativa. En el caso medido, la construcción de 15 módulos generó una llamada `applyBarrierChanges`, cuatro actualizaciones de sector y ninguna nueva consulta de ruta. El coste principal corresponde a la **propuesta**, no al pago. `spatial-crop-enclosure-plan.js` sigue certificando candidatos mediante `withWallPreview`; no existe todavía un overlay topológico de solo lectura.

La puntuación de puertas construía rutas del poblado a centros solo para ordenar candidatos. Ahora usa distancias geométricas para ese orden. La validación posterior conserva `gatePortalPoints`, `walkable`, `segmentClear` y la comprobación de rutas laborales anterior/posterior. Si el candidato elegido no preserva accesos, se ensayan puertas alternativas bajo las reglas existentes. La elección de puerta puede variar en otra geometría; por eso debe evaluarse su legalidad física, no exigir siempre la misma coordenada.

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
| Base A1 | 32,30 | 16 | 24 | 256 | 1900,95 | 3840 |
| Candidata B1 | 29,40 | 8 | 16 | 192 | 57,40 | 64 |
| Candidata B2 | 27,05 | 8 | 16 | 192 | 53,25 | 64 |
| Base A2 | 31,71 | 16 | 24 | 256 | 1844,01 | 3840 |

La reducción fuerte corresponde a la restauración de props residentes, aproximadamente 32–35 veces en esta carga. La propuesta de anillo mejora menos y tiene dispersión: se eliminaron las rutas anticipadas de **ordenación**, pero quedan las rutas de garantía de acceso, además de previsualizaciones que todavía modifican y restauran temporalmente el grafo. No extrapolar esta prueba a campañas o seis biomas. Memoria lineal: 16 MiB en todas las rondas. La construcción pagada tomó 12–15 ms en estas rondas; no hay muestras suficientes para una comparación estadística de esa etapa.

## Corrección y trabajo restante

Pasaron 96 pruebas dirigidas de puertas automáticas, trabajadores dentro/fuera, ruta cortada por murallas, recintos parciales, barreras naturales, reparaciones, persistencia de props suprimidos y previsualizaciones anidadas. También pasó `npm run build`. Se añadió una regresión que exige que restaurar un único prop residente actualice sectores locales. La suite completa llegó a 910 pruebas antes de detenerse por campañas de larga duración; las dos fallas observadas fueron las conocidas de `active-farm.test.js` (derrota en vez de victoria en dos granjas de 100 noches). Ese simulador no construye murallas y no ejercita los dos cambios de esta rama. La suite completa no está validada en esta rama.

Esto **no completa** la arquitectura solicitada. `withWallPreview` aún muta temporalmente la topología confirmada; hace falta un overlay nativo de solo lectura para consultar barreras hipotéticas y resultados con revisiones independientes. El paso siguiente es sustituir las pruebas de conectividad que no necesitan rutas completas por consultas topológicas conservadoras y dejar las rutas físicas para la certificación final cuando la conectividad no baste. Después deben compararse los estados congelados de Gran Cañón, reparaciones, sectores ausentes y propuestas repetidas, además de medir `Game.tick` y campañas. No debe integrarse en `main` antes de esas pruebas.
