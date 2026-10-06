# Búsquedas de entidades por trabajador con historial grande

Referencia congelada 1bfd85a. La actualización de trabajadores buscaba separadamente cultivos, cajas y tareas con `Array.find` para cada persona. Los cultivos recogidos y cajas entregadas permanecen en el guardado, por lo que los objetivos actuales suelen estar al final de esas colecciones.

Ahora cada llamada síncrona a `updateWorkers` crea búsquedas locales: no consultan colecciones si el ID es null/undefined, hacen búsqueda directa para la primera consulta y para arrays de menos de 64 elementos, y construyen un índice para consultas repetidas en arrays mayores. Solo se indexan las colecciones realmente consultadas. No se cachea entre pasos, ataques o cargas.

Los objetos conservan sus campos vivos (alive, delivered, workerId). Cambio de referencia o longitud invalida el índice dentro del mismo paso: cubre cajas nuevas, filtros que retiran tareas y reconstrucciones. Los IDs del dominio son strings inmutables y las operaciones actuales de membresía reemplazan el array o cambian su longitud; el helper no es una caché general para renombrar IDs ni reemplazar un elemento en el mismo array sin cambiar longitud. Se conserva también el primer match en caso de duplicados, aunque el guardado los prohíbe.

## Pruebas y comparación

68 pruebas dirigidas correctas, incluyendo objetos vivos, cajas añadidas tras consultar un ID ausente, arrays de tareas reemplazados con la misma longitud, eliminaciones y ausencia de acceso con trabajador sin asignación. También se verifican cosecha automática, transporte físico, reparaciones, recuperación y reservas.

Doce comparaciones nativas frente a la referencia: incursiones pobladas durante 600 pasos por bioma y trabajo pagado durante 2000 pasos por bioma. **15.600 estados serializados completos idénticos** en seis biomas, con el mismo número de búsquedas de ruta. Riego inicial: ocho cultivos en cinco biomas y dos en Gran Cañón durante esos cien segundos, como la referencia; no se acredita el alcance de los restantes ni una campaña completa.

El escenario integrado de 32 cultivos y ocho trabajadores pagados con crédito QA explícito de 10000, seguido por cinco especies, conserva la trayectoria completa en los diez pares (dos calentamientos y ocho medidos): 1630 ticks, 146 búsquedas y hash `3c035b1b27ca92321f5055c3f7bb87c5b5e60f960b5c905ee2e1c0dd105f996c`. Su mediana total varía de 3200,09 a 3175,38 ms, pero gana solo 3/8 pares; máximo tick mediano 397,86 a 385,98 ms, 4/8. **No se atribuye una mejora global significativa**. El tiempo total incluye inicio de proceso, preparación, serialización y hashing por paso; no es frametime del juego.

## Benchmark de búsquedas aisladas

Tres colecciones (cultivos, cajas, tareas), objetivos cerca del final y algunos IDs de tarea no asignados. Creación e indexado por actualización incluidos; datos preparados fuera del tiempo. Diez pares de calentamiento y diez medidos en orden alternado, resultados completos deep-equal.

| Historial por colección de cultivo/caja | Trabajadores | Referencia (ms/paso) | Índice adaptativo (ms/paso) | Pares mejores |
|---|---|---|---|---|
| 32 | 8 | 0,00829 | 0,00632 | 9/10 |
| 14558 | 114 | 27,49 | 4,10 | 10/10 |

Las tareas grandes contienen 1200 entradas. Cada muestra repite 100 pasos pequeños o diez grandes. El primer piloto siempre indexaba: para 32 entidades pasó de 0,00733 a 0,01239 ms; se conserva como **descartado**. La búsqueda directa para arrays pequeños evita esa construcción. El primer lookup directo evita construir el mapa cuando solo se necesita un objetivo.

Son medidas sintéticas de CPU de consultas, no ticks de una finca grande real, FPS, GPU, RAM, móvil o economía. Las campañas largas 20608/36076 seguían vivas; no había otras suites/builds/perfiladores propios durante las medidas. Pruebas y build se ejecutaron después de los benchmarks. Quedan comprobar fincas grandes reales, otros tamaños/plantillas y picos de navegación; el caso de 114 trabajadores no cubre todos los perfiles posibles.

## Reproducción y archivos

Extraer `git archive 1bfd85a src content package.json` como referencia; para la fixture integrada añadir `tools/check_integrated_load.mjs`, `tools/check_opening.mjs`, `public/content/biome-savanna.json` y `public/content/villages.json` de ese mismo commit.

- `node tools/benchmark_worker_entity_lookup.mjs <salida.json>`
- `node tools/check_navigation_query_reuse.mjs <referencia>`
- `node tools/benchmark_prop_query_integrated.mjs <referencia>`

Los informes JSON, hashes y logs comprimidos conservan el alcance. La build se acredita mediante `build-result.json` y `build.log.gz`. No se modifica ni reinicia ninguna campaña ya iniciada.
