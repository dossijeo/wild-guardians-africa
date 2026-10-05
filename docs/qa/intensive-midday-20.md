# Comparación de contratación durante la jornada

Se conserva la estrategia original: contratar solo al amanecer sigue siendo el valor predeterminado y el estado completo de su apertura de tres días coincide con el SHA-256 anterior `2e3a31cb41bb301079b641a135810973ea9715ca05ec0dd3c7272ee66716358d`. La variante opcional `middayHiring` usa únicamente `Game.hireAdditional`, sus salarios proporcionales y sus requisitos normales. Reserva el sueldo completo de la plantilla prevista para mañana y el margen de reparación antes de contratar. No modifica crecimiento, FIFO, velocidad, daño, dinero ni RNG.

Ambas partidas comparadas son Sabana/Mapungubwe, semilla 712, olderFemale, cultivos mixtos y veinte noches. Sus hashes de código/datos son iguales; los informes conservan HEAD `dfbdb91` y los scripts modificados al arrancar. Sus snapshots, informes y resúmenes están en `intensive-midday-20/`. No sobrescriben las campañas anteriores.

| Medida | Solo amanecer | También durante el día |
| --- | ---: | ---: |
| Noches completadas | 20 | 20 |
| Saldo final | 670 | 764 |
| Máximo de plantas vivas | 238 | 264 |
| Brotes colocados | 2190 | 2303 |
| Cajas físicamente entregadas | 1948 | 2035 |
| Cultivos destruidos | 24 | 15 |
| Destruidos antes del primer riego | 10 | 6 |
| Contrataciones adicionales / coste | 0 / 0 | 28 / 249 |
| Tiempo diurno sin acciones | 62,35 % | 60,35 % |

La contratación adicional mejora esta partida, pero no resuelve el ritmo de juego: siguen siendo más de tres mil segundos sin acciones por presupuesto. Una sola semilla y veinte noches no prueban una mejora universal ni una campaña de cien noches. El simulador cambia también las decisiones posteriores y los consumos de RNG; no es una comparación cuadro a cuadro de idénticas incursiones. No se cambia la economía para declarar que el balance ya está aceptado.

Tres pruebas pasan: expansión intensiva normal, derrota por mala gestión y contratación adicional pagada con conservación de las reservas. La prueba nueva comprueba costes enteros, cargos proporcionales menores que el sueldo diario, suma de salarios y entregas reales. Las partidas que fallan no se sustituyen por otras más fáciles.

## Pérdidas de la campaña mixta anterior

El análisis del guardado real de cien noches añade contadores de cultivos destruidos que nunca recibieron el primer riego y que tenían algún riego pendiente. No infiere la hora exacta de destrucción ni atribuye automáticamente esas pérdidas a un único motivo. `hundred-night-loss-summary.json` conserva el análisis y mantiene `provenance:null` para aquella ejecución antigua.

El histograma de cargos de semillas coincide con los ocho precios distintos y sus cantidades plantadas. `hundred-night-seed-costs.json` registra esa comprobación y el hash del balance usado para interpretar los precios. Algodón consume 8400 monedas de semillas y realiza 320 en entregas; plátano consume 4800 y no realiza ninguna entrega. Sus aportaciones de caja antes de jornales/reparaciones son −8080 y −4800. En cambio el mijo aporta 69152 antes de esos costes y sostiene la victoria de la estrategia. Esto no valora los cultivos todavía vivos como beneficio futuro garantizado.

38 de los 82 algodones destruidos y 25 de los 32 plátanos destruidos nunca recibieron el primer riego. La comparación de contratación ayuda a investigar la carga de trabajo, pero el balance de todos los cultivos, sus horarios de plantación y su defensa sigue pendiente de aceptación.
