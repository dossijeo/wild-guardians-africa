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

## En ejecución

Semilla 123: control, competente, recuperación fija, recuperación adaptativa y agricultura. Semilla 2026: control y competente. Se añadirá el brazo defensivo de la semilla 123 cuando haya capacidad para ejecutarlo. Los archivos parciales, si existen, describen progreso de procesos vivos, no resultados finales. No se cambian parámetros de juego por la evidencia de una sola partida.
