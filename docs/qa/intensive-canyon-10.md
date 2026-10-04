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
