# Balance de Despertares — validación en curso

## Método

Campañas del jugador virtual nativo, semilla 712 / sabana / mapungubwe y control adicional 983 / desierto / saheliana. Comandos ordinarios, ingresos por entrega física, costes del diario contable, contactos animales de Wild Engine. No se inyectan monedas, progreso ni daño. El perfil laboral es `olderFemale`, con la política `legacy` del simulador. No se cambian las reglas de producción para conseguir victorias.

`tools/check_awakenings_campaign.mjs` registra procedencia, hashes, evaluaciones diarias, decisiones, pérdidas y estado. `tools/summarize_awakening_campaigns.mjs` produce el resumen compacto, compara únicamente periodos comunes y separa los ingresos pasivos cobrados de las diferencias generales entre campañas.

La evidencia completa y los guardados terminales se adjuntan como `campaigns/*.json.gz`, con compresión sin pérdida verificada byte a byte; el resumidor acepta tanto JSON como gzip. `campaigns/summary-progress.json` permite revisar las métricas sin desplegar los extensos registros nativos de rutas e incursiones.

La política competente elige muralla cuando las tres últimas jornadas suman más de tres pérdidas de cultivos; en otro caso elige una planta con vecinos. Agricultura prefiere replantar alrededor de focos; defensa espera una muralla disponible. Recuperación retira deliberadamente una muralla bendecida mediante el comando normal después de dos cargas ganadas y continúa jugando: es un escenario prescrito, no una decisión autónoma ni una pérdida atribuida a animales.

## Resultados completos disponibles

| Brazo | Noches superadas | Resultado nativo | Cargas ganadas / aplicadas | Bendiciones perdidas | Ingreso agrícola | Ingreso pasivo incluido | Dinero final | Cultivos productivos finales |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Control sabana | 47 | Derrota | 0 / 0 | 0 | 35 410 | 0 | 23 | 0 |
| Competente sabana | 100 | Victoria | 16 / 15 | 13 | 83 560 | 648 | 188 | 12 |
| Deficiente sabana | 46 | Derrota | 7 / 7 | 7 | 31 918 | 186 | 33 | 0 |
| Control desierto | 46 | Derrota durante el día 47 | 0 / 0 | 0 | 40 092 | 0 | 113 | 0 |

La victoria competente es **supervivencia frágil**, no una granja próspera: termina con 12 cultivos productivos, dos fuentes y poco efectivo. El centro conserva 600 HP. Los controles no tienen datos posteriores a su derrota; no se extrapolan hasta la noche 100. Los gastos e ingresos de toda una campaña con distinta duración no son una comparación causal.

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

## Trabajo y presión final

El resumen usa jornadas laborales equivalentes pagadas: contratación / 30 monedas para el perfil de mayores. Las entregas por jornada pagada son 5,08 en el control sabana y 5,34 en la competente. No se usa `workerSeconds` como tiempo productivo: ese contador original incluye residencia nocturna. La gestión deficiente obtiene 5,67 entregas por jornada pagada, pero pierde 1124 cultivos y la granja; esta razón aislada tampoco mide buen balance.

La campaña competente conserva amenazas relevantes al final: en la noche 98 pierde 26 cultivos y 315,8 HP de murallas; en las noches 99 y 100 pierde 744 y 542,5 HP de murallas respectivamente. En total se destruyen 1426 cultivos y 13 bendiciones. No se presenta la protección como invulnerabilidad ni se asigna a cada muralla un ahorro contrafactual de reparación que no se ha medido.

## Pendiente

Agricultura sabana, defensa sabana, recuperación sabana y competente desierto están ejecutándose desde aperturas nativas. Las dos campañas interrumpidas por la prioridad visual se conservan separadas; no se concatenan con las nuevas ejecuciones. Falta integrar sus resultados y revisar si aconsejan ajustes de parámetros. La batería completa posterior a la revisión visual también está en curso. El objetivo y el PR siguen abiertos.

Los seis checkpoints solicitados (10, 20, 30, 50, 75, 100) se conservan en los JSON cuando la campaña alcanza esas noches. `summary-progress.json` contiene solo los cuatro brazos completos anteriores; es un informe provisional. Los primeros seis días del nuevo brazo defensivo coinciden exactamente, operación agregada por categoría, con la campaña competente previa al cambio de compatibilidad de crates históricos; no se afirma por ello equivalencia de las campañas posteriores a distintas decisiones.
