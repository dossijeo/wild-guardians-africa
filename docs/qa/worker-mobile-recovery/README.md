# Recuperación móvil de trabajadores: experimento aislado

La separación dinámica incorporada en `main` por la PR #166 impide que dos trabajadores se atraviesen durante el movimiento ordinario. La campaña expuso una excepción anterior: `walkTo()` activa `mobilePhaseRemaining` después de un atasco y, durante tres segundos, la ruta del trabajador deja de comprobar otros cuerpos. La contratación crea además varios trabajadores en la misma entrada del poblado; ese solapamiento inicial se resuelve mientras salen. No debe presentarse la separación ordinaria como una garantía universal.

El brazo A es `main` en `44da3cac` (WASM de producción SHA-256 `0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`). El brazo B es esta rama, cuya única variación funcional impide activar la fase móvil para trabajadores; la recuperación animal y las comprobaciones estáticas siguen iguales. Ambos ejecutan Sabana/Mapungubwe/712, estrategia `good`, 14 noches, con la misma semilla y política. El sondeo de pares se ejecuta después de cada tick mediante `tools/experiments/probe-worker-overlaps.mjs`; no modifica el estado. Se excluyen trabajadores `home`. Se registra un solapamiento si la distancia entre centros es menor que la suma de radios por más de `1e-6` m. Son una ejecución por brazo y mediciones de CPU en distinto momento, no un benchmark ABBA.

| Medida | A: `main` | B: sin fase de trabajador |
| --- | ---: | ---: |
| Noches completadas | 14 | 14 |
| Ticks muestreados | 5.751 | 5.650 |
| Ticks con algún solapamiento | 84 | 31 |
| De ellos, tras los primeros 3 s de jornada | 53 | 0 |
| Recuperaciones móviles (todos los actores) | 97 | 2 |
| Entregas físicas | 1.464 | 1.373 |
| Cultivos vivos al cierre | 126 | 65 |
| Trabajadores al cierre | 23 | 16 |
| Monedas al cierre | 949 | 620 |
| Suma de `Game.tick` | 100,26 s | 93,58 s |

El brazo A termina con 14 incursiones finalizadas, conciliación económica y `result=null`: alcanza el horizonte, pero no demuestra una victoria de 100 noches. El brazo B también llega a ese horizonte, pero reduce entregas y empeora claramente la finca. Sus 31 ticks con solapamiento ocurren únicamente durante los primeros 1–3 segundos después de contratar; los pares afectados pueden figurar como `walking` porque el plan de tareas cambia su estado antes de que abandonen la entrada. El total de pares solapados no es comparable como indicador de calidad entre brazos, porque el número de trabajadores, contrataciones y recorridos diverge.

Desactivar el escape completo **no es candidato a integración**. La menor suma de CPU tampoco prueba una optimización: el brazo B procesa menos ticks, entregas y entidades. La siguiente solución debe resolver la circulación en entradas y pasillos, conservar la productividad y demostrar ausencia de cruces durante la jornada. En particular, hay que distinguir un trabajador bloqueado por otro trabajador de uno bloqueado por un animal, encontrar un espacio de cesión físicamente válido o mantener una cola de entrada, y comprobar que una espera no deja una tarea asignada para siempre. No se cambiarán radios, velocidad, precios ni salarios para recuperar la producción.

Reproducción en cada revisión, con el mismo WASM de producción:

```sh
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe
```

La prueba dirigida `node --test tests/actor-motion.test.js tests/acceptance-worker-routing.test.js tests/spatial-desert-compound-gate.test.js` pasa 46/46 en el brazo B. Esa cobertura no detecta la pérdida económica: la campaña es indispensable para decidir.
