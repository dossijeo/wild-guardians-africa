# Balance de Despertares — ocho campañas nativas

## Método

Campañas del jugador virtual nativo, semilla 712 / sabana / mapungubwe y control adicional 983 / desierto / saheliana. Comandos ordinarios, ingresos por entrega física, costes del diario contable, contactos animales de Wild Engine. No se inyectan monedas, progreso ni daño. El perfil laboral es `olderFemale`, con la política `legacy` del simulador. No se cambian las reglas de producción para conseguir victorias.

`tools/check_awakenings_campaign.mjs` registra procedencia, hashes, evaluaciones diarias, decisiones, pérdidas y estado. `tools/summarize_awakening_campaigns.mjs` produce el resumen compacto, compara únicamente periodos comunes y separa los ingresos pasivos cobrados de las diferencias generales entre campañas.

La evidencia completa y los guardados terminales se adjuntan como `campaigns/*.json.gz`, con compresión sin pérdida verificada byte a byte; el resumidor acepta tanto JSON como gzip. [Resumen final](campaigns/summary-final.json) permite revisar las métricas sin desplegar los extensos registros nativos de rutas e incursiones. Todos los brazos se ejecutaron con objetivo de 100 noches y terminaron en victoria o derrota nativa; ninguno se truncó para esta comparación final.

La política competente elige muralla cuando las tres últimas jornadas suman más de tres pérdidas de cultivos; en otro caso elige una planta con vecinos. Agricultura prefiere replantar alrededor de focos; defensa espera una muralla disponible. Recuperación retira deliberadamente una muralla bendecida mediante el comando normal después de dos cargas ganadas y continúa jugando: es un escenario prescrito, no una decisión autónoma ni una pérdida atribuida a animales.

## Resultados completos

| Brazo | Noches superadas | Resultado nativo | Cargas ganadas / aplicadas | Bendiciones perdidas | Ingreso agrícola | Ingreso pasivo incluido | Dinero final | Cultivos productivos finales |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Control sabana | 47 | Derrota | 0 / 0 | 0 | 35 410 | 0 | 23 | 0 |
| Competente sabana | 100 | Victoria | 16 / 15 | 13 | 83 560 | 648 | 188 | 12 |
| Deficiente sabana | 46 | Derrota | 7 / 7 | 7 | 31 918 | 186 | 33 | 0 |
| Agricultura sabana | 94 | Derrota | 14 / 14 | 14 | 72 406 | 2514 | 13 | 0 |
| Defensa sabana | 100 | Victoria | 17 / 17 | 16 | 83 691 | 0 | 97 | 6 |
| Recuperación sabana | 47 | Derrota | 6 / 6 | 2 | 33 396 | 0 | 30 | 0 |
| Control desierto | 46 | Derrota durante el día 47 | 0 / 0 | 0 | 40 092 | 0 | 113 | 0 |
| Competente desierto | 74 | Derrota durante la noche 75 | 11 / 11 | 9 | 50 962 | 793 | 29 | 0 |

Las victorias competente y defensiva son **supervivencia frágil**, no granjas prósperas: terminan con 12 y 6 cultivos productivos, dos y una fuentes y poco efectivo. Sus centros conservan 600 HP. Los controles no tienen datos posteriores a su derrota; no se extrapolan hasta la noche 100. Los gastos e ingresos de toda una campaña con distinta duración no son una comparación causal.

Primer Despertar: cierre de la noche 6, aplicado al inicio del día 7. La competente promedia 19,12 puntos ganados en las primeras diez jornadas y 17,47 en toda la campaña. La deficiente promedia 17,69 en su campaña más corta: perder sus fuentes reduce el divisor de recarga. Ese promedio no significa mejor gestión; pierde las siete bendiciones y no supera la noche 46. La carga 16 de la competente queda almacenada al final de la noche 100.

## Comparación durante las primeras 47 noches de sabana

| Métrica | Control | Competente | Diferencia |
| --- | ---: | ---: | ---: |
| Ingresos entregados | 35 410 | 54 621 | +19 211 |
| Contratación | 15 691 | 24 482 | +8 791 |
| Semillas | 18 858 | 27 011 | +8 153 |
| Reparaciones | 568 | 2 029 | +1 461 |
| Variación neta del diario | −677 | −211 | +466 |
| Cultivos destruidos por incursiones | 759 | 700 | −59 |

La diferencia de ingresos incluye reinversión, colocación, defensa y trayectorias posteriores de incursiones. **No equivale al valor monetario de las bendiciones.** El ingreso pasivo cobrado en las 100 noches competentes fue 648 monedas, atribuido a `plant-3876` mediante 324 entregas. Las 14 decisiones defensivas y las 336 preferencias de colocación cerca de una fuente sí demuestran que la política cambia su comportamiento; las preferencias no se cuentan como plantaciones exitosas por sí mismas.

Agricultura seleccionó 14 focos y registró 1312 preferencias de colocación cercana, con 2514 monedas pasivas entregadas; acabó perdiendo los 14 focos. Defensa seleccionó 17 murallas, perdió 16 y sobrevivió 100 noches sin ingresos pasivos agrícolas. En las primeras 47 noches, agricultura mejoró el neto del control en 432 monedas y defensa en 579. En desierto, durante las primeras 46 noches completas, la competente obtuvo 2149 monedas más de ingresos y mejoró el neto en 324, pero perdió 81 cultivos más por incursiones. Las diferencias no son uniformemente favorables.

| Brazo completo | Contratación | Semillas | Murallas | Reparaciones | Neto del diario |
| --- | ---: | ---: | ---: | ---: | ---: |
| Control sabana | 15 691 | 18 858 | 970 | 568 | −677 |
| Competente sabana | 36 154 | 41 376 | 1720 | 4822 | −512 |
| Deficiente sabana | 13 860 | 18 725 | 0 | 0 | −667 |
| Agricultura sabana | 31 113 | 36 345 | 1670 | 3965 | −687 |
| Defensa sabana | 36 547 | 41 105 | 1640 | 5002 | −603 |
| Recuperación sabana | 15 050 | 17 597 | 940 | 482 | −670 |
| Control desierto | 19 157 | 18 063 | 1700 | 1759 | −587 |
| Competente desierto | 23 073 | 23 650 | 2090 | 2820 | −671 |

Recuperación incluye tres monedas de crédito por retirada, además de las entregas. Los totales conservan transacciones reales de una jornada terminal incompleta; las comparaciones a igual duración excluyen esa noche no superada. Todos los diarios se reconcilian exactamente.

## Trabajo y presión final

El resumen usa jornadas laborales equivalentes pagadas: contratación / 30 monedas para el perfil de mayores. Las entregas por jornada pagada son 5,08 en el control sabana y 5,34 en la competente. No se usa `workerSeconds` como tiempo productivo: ese contador original incluye residencia nocturna. La gestión deficiente obtiene 5,67 entregas por jornada pagada, pero pierde 1124 cultivos y la granja; esta razón aislada tampoco mide buen balance.

La campaña competente conserva amenazas relevantes al final: en la noche 98 pierde 26 cultivos y 315,8 HP de murallas; en las noches 99 y 100 pierde 744 y 542,5 HP de murallas respectivamente. En total se destruyen 1426 cultivos y 13 bendiciones. No se presenta la protección como invulnerabilidad ni se asigna a cada muralla un ahorro contrafactual de reparación que no se ha medido.

## Recuperación y límites de la conclusión

El escenario prescrito perdió una muralla ante animales en el día 9, retiró otra en el día 13 y obtuvo nuevas bendiciones en los días 19, 25, 31 y 38. La recuperación de cargas funciona, pero la política fija de murallas acabó derrotada en la noche 47, con cuatro fuentes todavía vivas. **No demuestra recuperación económica satisfactoria.** La campaña competente sí llega a 100 tras 13 pérdidas, de modo que perder un foco no impone automáticamente una derrota; tampoco garantiza recuperarse de cualquier pérdida o política.

Los seis checkpoints solicitados (10, 20, 30, 50, 75, 100) se conservan en el resumen cuando la campaña supera realmente esas noches. Se excluye del resumen el checkpoint bruto 75 del desierto competente, registrado por el harness al terminar una jornada en derrota antes de completar esa noche. `summary-progress.json` conserva el informe provisional anterior; `summary-final.json` es la referencia vigente. Las dos ejecuciones interrumpidas por la prioridad visual se conservan localmente separadas y no se concatenan con los resultados finales.

El harness queda corregido para futuras ejecuciones: solo emite checkpoints de noches completadas y conserva `cropsDestroyed` por separado del contador acumulado de bendiciones destruidas. Esta corrección de telemetría no modifica la simulación ni reescribe los datos originales; el resumidor utiliza la evidencia nativa de incursiones para las pérdidas agrícolas de estas ocho campañas.

Los primeros seis días del nuevo brazo defensivo coinciden exactamente, operación agregada por categoría, con la campaña competente previa al cambio de compatibilidad de crates históricos; no se afirma por ello equivalencia de las campañas posteriores a distintas decisiones. El resumidor valida el perfil laboral antes de normalizar sus costes. El ingreso pasivo se desglosa por fuente; en solapamientos reparte el bonus entre las fuentes, no estima contribución marginal. No se ha medido un ahorro monetario contrafactual individual de cada muralla: se conservan pérdidas de HP, costes de reparación y resultados agregados sin inventar esa atribución.

Se mantienen los parámetros iniciales. Antes de fusionar conviene probar más semillas y estrategias de recuperación adaptativas, además de revisar con jugadores humanos si las decisiones resultan divertidas. La evidencia muestra cambios de construcción y vulnerabilidad persistente, pero no certifica balance óptimo ni diversión. La suite completa posterior a la revisión visual terminó con 5035 aprobadas, cero fallos y 62 omitidas; el PR permanece en borrador.
