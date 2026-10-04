# Plantación intensiva en Gran cañón: diez noches

Comando ejecutado: `node tools/check_intensive_farm.mjs 10 gran-canon mapungubwe mixed`. Semilla 712, trabajadoras mayores, terreno y recorridos nativos, cámara de entrada de incursión, pagos ordinarios y reserva creciente de jornales/mantenimiento. Se restaura el guardado dentro de cada una de las diez incursiones. No se alteran RNG, dinero, daño, crecimiento, tareas ni desplazamientos.

La ejecución se inició sobre main 8cb2edc y precede a la cabecera automática de procedencia de las siguientes campañas. Su informe carece de esa cabecera; no se le atribuye retrospectivamente una huella de archivos calculada después. El audio, renderizado y frametime no se ejecutan en esta simulación de dominio.

Resultados auditados mediante `tools/summarize_intensive_farm.mjs` sobre el informe y snapshot originales:

| Medida | Resultado |
| --- | --- |
| Noches completas / incursiones resueltas | 10 / 10 |
| Brotes pagados | 625 |
| Máximo de plantas vivas simultáneas | 156 |
| Plantas vivas al finalizar | 148 |
| Cosechas recogidas y entregadas | 464 / 464 |
| Plantas destruidas | 13 |
| Ingresos por entregas | 5364 monedas |
| Saldo final / centro principal | 569 monedas / 600 HP |
| Días contratados | 10 |
| Especies realmente observadas | 1: mijo |
| Tiempo diurno sin acciones | 2338 / 3000 s (77,93 %) |
| Espera por presupuesto / fin de jornada | 2141 / 197 s |
| Mayor intervalo sin acciones / percentil 90 diario | 155 / 144 s |

Se conservan los cargos enteros, semillas pagadas, riegos obligatorios antes de madurar, recogidas y entregas físicas únicas, y round-trip exacto del guardado. El modo `mixed` solo selecciona otras especies desde el día 10 cuando hay más de 1000 monedas; aquí no ocurrió. Por ello esta ejecución no acredita diversidad, victoria de cien noches ni todo el balance del juego.

La espera del 77,93 % es un problema pendiente para el requisito de mantener al jugador ocupado. Es tiempo sin comandos de esta estrategia automatizada; no una medida subjetiva de aburrimiento. Antes de ajustar ganancias, costes o daño se debe comparar con los resultados completos de cien noches y con otros perfiles, manteniendo la posibilidad de derrota por mala gestión. Sobrevivir estas diez noches no resuelve ese requisito.

Evidencia: `intensive-canyon-10/report.json`, `intensive-canyon-10/state.json` y `intensive-canyon-10/summary.json`. La victoria de campaña permanece sin verificar.

## Comparación con trabajadoras jóvenes

Se repite la estrategia con el argumento `youngFemale`, sin alterar sus valores ordinarios: jornal 40, velocidad de trabajo 1,5 y jornada completa. El informe identifica esta selección y registra HEAD 8cb2edc, cambios locales de los scripts de QA y 165 huellas de fuentes/dependencias antes de empezar. Las reglas del juego estaban sin cambios. Evidencia adicional: `young-report.json`, `young-state.json` y `young-summary.json` en el mismo directorio.

Diez noches completas, 610 brotes pagados, máximo de 132 plantas vivas, 483 cosechas recogidas/entregadas, 7 plantas destruidas y 653 monedas finales. El centro conserva 600 HP; la selección mixed vuelve a no activarse y solo se planta mijo. La misma política de contratación conserva doce plantas por trabajador independientemente de su perfil, así que no se presenta como contratación óptima para las jóvenes.

La espera diurna alcanza 2356/3000 s (78,53 %), de los cuales 2156 son por presupuesto y 200 por final de jornada. El máximo sin acciones es 158 s y el percentil 90 diario 89 s. El mayor número de entregas no elimina la espera bajo esta política. Sigue pendiente contrastar el resultado completo de cien noches y encontrar un balance/gestión que permitan actividad frecuente sin impedir perder con decisiones malas. No se cambian expectativas de victoria para hacer pasar una derrota ni se consideran estos diez días una aceptación completa.

## Flujo de caja real

| Operación en las diez jornadas | Mayores | Jóvenes |
| --- | --- | --- |
| Ingresos por entregas | 5364 | 5643 |
| Semillas cobradas | 3125 | 3050 |
| Jornales cobrados | 2370 | 2640 |
| Reparaciones cobradas | 0 | 0 |
| Centro inicial | 800 | 800 |
| Flujo operativo, excluyendo el centro | −131 | −47 |
| Saldo final desde 1500 | 569 | 653 |

Los cargos se extraen del ledger conservado, no se estiman a partir del número de tareas. Las igualdades son `1500 + 5364 − 3125 − 2370 − 800 = 569` y `1500 + 5643 − 3050 − 2640 − 800 = 653`. No hubo reintegros ni otras operaciones. La diferencia de 84 monedas se explica por 279 más de ingresos y 75 menos de semillas, frente a 270 más de jornales. Los cultivos todavía vivos forman parte de la inversión realizada y no han generado todos sus ingresos; estos flujos de caja no acreditan beneficio final ni inviabilidad de cien noches.

La regresión de dominio comprueba conservación exacta de las categorías contra el saldo real, ingresos contra entregas físicas y la persistencia de una derrota con reinversión irresponsable. Las dos pruebas pasan tras añadir el desglose; no se modifican precios, salarios, crecimiento ni daño para este análisis.
