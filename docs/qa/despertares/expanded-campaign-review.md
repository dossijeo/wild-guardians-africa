# Simulaciones adicionales — en curso

El informe anterior, [balance de ocho campañas](balance-review.md), identifica dos limitaciones: solo cubre dos combinaciones de bioma, cultura y semilla, y el escenario prescrito de recuperación sigue invirtiendo en murallas tras perder una bendición. Esta ampliación añade partidas nativas hasta 100 noches con nuevas semillas de sabana, políticas agrícolas y defensivas, y una política de recuperación adaptativa. Las derrotas terminan la partida por las reglas reales; no se simulan noches posteriores.

Las dos políticas de recuperación bendicen murallas y ejecutan la misma retirada ordinaria tras dos cargas. Después, la fija sigue eligiendo murallas; la adaptativa trata de reponer una fuente agrícola cuando no hay ninguna y, si ya tiene una, decide según las pérdidas recientes. Ambas usan la misma economía, estrategia general de contratación/construcción, motor nativo y semillas. La retirada está prescrita; la elección posterior es una política programada, no una decisión humana autónoma.

## Primer resultado completo: sabana, semilla 712

| Indicador | Recuperación fija | Recuperación adaptativa |
| --- | ---: | ---: |
| Noches superadas | 47 | 45 |
| Resultado | Derrota | Derrota |
| Dinero final | 30 | 29 |
| Cultivos productivos finales | 0 | 0 |
| Fuentes finales | 4 | 2 |
| Ingresos, primeras 45 noches | 33 316 | 33 151 |
| Neto contable, primeras 45 noches | −526 | −671 |

Las 12 jornadas anteriores a la retirada presentan iguales saldos, contabilidad y población de cultivos/fuentes; la misma muralla se retira en el mismo instante del día 13. La adaptativa repuso plantas en los días 19 y 24, pero ambas fueron destruidas. En esta ejecución no se observa una recuperación económica satisfactoria ni una mejora de supervivencia respecto a la política fija. El resultado de una semilla no prueba que la estrategia sea peor en todos los casos, y los efectos posteriores incluyen decisiones, posiciones e incursiones divergentes.

[Comparación verificable](campaigns-expanded-20261029/comparison-712.json) y [registro completo](campaigns-expanded-20261029/recovery-adaptive-712.json.gz). El guardado terminal se conserva junto al registro en gzip, verificado sin pérdida. `tools/compare_awakening_recovery.mjs` comprueba la pérdida y los datos previos y compara únicamente noches completas comunes; el campo terminal se toma de la última jornada real y puede corresponder a una jornada incompleta.

## Resultados completos parciales: sabana, semilla 123

| Política | Noches superadas | Resultado | Dinero final | Cultivos productivos finales | Fuentes finales |
| --- | ---: | --- | ---: | ---: | ---: |
| Control | 49 | Derrota | 29 | 0 | 0 |
| Competente | 53 | Derrota | 33 | 0 | 3 |
| Recuperación fija | 51 | Derrota | 26 | 0 | 5 |
| Agricultura | 56 | Derrota durante la jornada 57 | 158 | 0 | 0 |
| Defensa | 54 | Derrota durante la jornada 55 | 125 | 1 | 3 |

Durante las primeras 49 noches, la competente ingresó 48 757 monedas frente a 54 560 del control, pero su variación neta fue −447 frente a −671; perdió 784 cultivos frente a 627. Estas diferencias incluyen distintos gastos, decisiones y trayectorias de incursiones. La entrega pasiva en toda la campaña competente fue de 615 monedas. La recuperación adaptativa de esta misma semilla aún no ha terminado, por lo que no se concluye su comparación con la fija. [Métricas y gastos completos](campaigns-expanded-20261029/summary-123-progress.json).

El control de la semilla 2026 ha terminado en derrota durante la jornada 58, tras superar 57 noches; su partida terminó sin cultivos y con 210 monedas. La campaña competente emparejada todavía sigue en ejecución, por lo que no se anticipa una comparación.

## En ejecución

Semilla 123: recuperación adaptativa. Semilla 2026: competente. Los archivos parciales, si existen, describen progreso de procesos vivos, no resultados finales. No se cambian parámetros de juego por la evidencia de una sola partida.
