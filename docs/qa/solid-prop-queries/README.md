# Props sólidos en consultas de movimiento: experimento descartado

Referencia congelada `f9e385a`; herramientas `tools/experiments/solid-prop-queries.mjs` y `compare-solid-prop-queries.mjs`. El candidato se prepara en un directorio nuevo fuera del runtime. El hash de Navigation del juego permanece idéntico al de la referencia; ver `provenance.json`.

## Propuesta

Filtrar primero los slots no sólidos en `propsAt` cuando se consulta movimiento, antes de calcular distancias y añadir resultados al array. Las consultas normales de construcción conservan todos los props para sus supresiones. Se mantienen todas las visitas a chunks, el orden procedural y la comprobación circular estricta. Solo las dos consultas de movimiento (punto y segmento) piden el subconjunto sólido.

Un perfil CPU previo sugirió revisar el filtrado: `propsAt` acumula 391,90 ms de tiempo propio en esa ejecución instrumentada. La fixture también serializa/hashéa cada tick; estas operaciones dominan el perfil y no forman parte del render normal. Los tiempos del perfil no son frametimes comparables con las mediciones sin perfilador. Se conservan el perfil completo comprimido, su resumen y la salida de esa ejecución.

## Comparación

Dos pares de calentamiento y ocho pares alternados del escenario integrado: 32 cultivos y ocho trabajadores pagados con el crédito QA explícito de 10000, cinco especies, 1630 ticks y 146 búsquedas. Todos los hashes de la trayectoria serializada coinciden: `3c035b1b27ca92321f5055c3f7bb87c5b5e60f960b5c905ee2e1c0dd105f996c`.

Mediana total: 3415,16 → 3333,87 ms (−2,38 %), pero el candidato gana solo tres de ocho pares. Mediana del mayor tick: 403,26 → 399,58 ms (−0,91 %); siete de ocho pares mejoran ese pico por una cantidad pequeña. La dispersión y la magnitud no acreditan una mejora práctica de los tirones grandes. Se descarta la integración.

Dos campañas de 100 noches continuaron en segundo plano, verificadas por sus procesos vivos. No se ejecutaron otras suites, builds ni perfiladores propios durante la comparación. Son medidas CPU locales de esta fixture, no GPU, FPS, móvil, RAM o campañas completas.

## Equivalencia dirigida

- 432 consultas de props en seis biomas y tres radios: las consultas por defecto conservan todos los IDs en orden; el subconjunto sólido coincide exactamente con el filtrado original; se conservan visitas y orden de caché de chunks.
- 1152 consultas diferenciales de segmentos en seis biomas: puerta girada, extremos enteros/fraccionarios, radios de trabajador/bestia, ignorar obstáculo y consultas repetidas. Coinciden booleanos, claves/orden de caché y número de comprobaciones físicas.

Estos resultados prueban equivalencia en esos casos, no aceptación visual ni una optimización global. No se modifica el juego ni se necesita recompilarlo por este experimento. Los picos de navegación de unos 400 ms siguen pendientes.

## Reproducción

Extraer con `git archive` la referencia f9e385a (src, tools, tests, content, public/content y package.json). Ejecutar la herramienta `solid-prop-queries.mjs` con las rutas de referencia y de un candidato nuevo. Después ejecutar los comparadores de props y segmentos contra ambas carpetas. Los resultados están en `benchmark.json`, `props-differential.json` y `segments-differential.json`.
