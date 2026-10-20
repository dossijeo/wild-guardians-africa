# Separación entre trabajadores

El movimiento trataba a los animales retirándose y a las personas incapacitadas como cuerpos dinámicos, pero un trabajador en marcha no incluía a sus compañeros en `actorBlockers()`. Dos trabajadores con rutas opuestas podían atravesarse. La comprobación de movimiento ahora incluye a los compañeros visibles y conserva la misma prueba de segmento barrido y los desvíos locales existentes. Los trabajadores en el poblado no bloquean el mundo.

La consulta de un paso de trabajador limita los candidatos a la zona local de ocho metros más los radios corporales. Las búsquedas animales conservan su corredor completo de dependencias y las comprobaciones explícitas de ocupación de un destino siguen usando la lista completa. No cambia el grafo de Wild Engine ni se recalculan rutas estáticas por el mero hecho de que otro trabajador se mueva.

Varios trabajadores contratados comparten el punto de servicio de un centro. Exigir que todos ocupen esa coordenada exacta dejó al segundo esperando hasta que el primero se alejase por azar. Una llegada con ruta activa y vigente se considera completa dentro de los dos metros del punto si el segmento restante es físicamente transitable. No se acepta una ruta ausente, obsoleta ni bloqueada, y el trabajador conserva su posición real. En la finca congelada de cuatro trabajadores, todos llegan a la zona de servicio en menos de 20 segundos.

## Reproducción

`node --test tests/actor-motion.test.js` verifica dos trabajadores que se cruzan y un trabajador que rodea a otro inmóvil; ambos casos fallaban antes del cambio. También se ejecutaron las pruebas de encuentros, contratación, regreso tras incursiones, recinto incremental, puente de intenciones, guardado/carga y la build de producción. En la prueba congelada de 42 trabajadores, la separación puede posponer el primer paso de algunos cuerpos; se exige que todos reanuden el movimiento dentro de 20 pasos, sin exigir que quepan simultáneamente en una entrada estrecha.

`node tools/experiments/benchmark-worker-clearance.mjs <trabajadores> 100` mide 100 pasos con rutas paralelas separadas tres metros. En el mismo host, con Node y el código de `origin/main` como referencia, las medianas de tres rondas fueron:

| Trabajadores | Referencia, ms/100 pasos | Separación, ms/100 pasos |
| ---: | ---: | ---: |
| 50 | 10,4 | 36,8 |
| 150 | 34,4 | 65,2 |
| 300 | 44,3 | 141,5 |

Es un microbenchmark de movimiento en paralelo, no una medición de `Game.tick` ni de una campaña. El coste añadido procede de examinar compañeros próximos y crece con el número de trabajadores; el caso de 300 es una carga sintética extrema. La localidad evita que los cuerpos lejanos entren en el cálculo de desvíos, pero todavía se recorre la lista de trabajadores para formar candidatos. Conviene perfilar una finca real de gran tamaño antes de introducir otro índice dinámico.
