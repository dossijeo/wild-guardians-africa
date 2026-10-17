# Manglares/123: reservar reparaciones pendientes una sola vez

Comparación experimental de 21 noches con el balance de producción intacto. La referencia es `paired-leader-manglares-21-with-exit-qa/`, ejecutada sobre `d90de92d`. La candidata usa `6c394c62`: la única diferencia de código posterior a esa referencia es `defenseCashProtection()` en el runner, que deja de incluir reparaciones pendientes en la reserva enviada a la política defensiva porque esta ya las suma. Los commits intermedios añaden documentación y sondas de lectura. Los hashes de fuente y módulos de esta corrida constan en `config.json`.

Ambas estrategias de la candidata ejecutaron compras, reparaciones, movimientos, incursiones y pagos ordinarios con Manglares/123. Los informes nativos completos comprimidos y el progreso diario se conservan junto a este README; `summary.json` resume sus estados finales. Ninguna campaña terminó por error técnico o derrota antes de la noche 21.

| Política | Versión | Noches | Cultivos finales | Monedas finales | Cultivos destruidos, noches 6–21 | Muros pagados | Reparaciones pagadas |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Evolucionada | Referencia | 21 | 58 | 451 | 226 | 900 | 1290 |
| Evolucionada | Reserva corregida | 21 | 100 | 927 | 74 | 900 | 1475 |
| `good-current-magic` | Referencia | 21 | 105 | 722 | 203 | 900 | 1170 |
| `good-current-magic` | Reserva corregida | 21 | 52 | 615 | 207 | 900 | 1198 |

La política evolucionada empezó a diferir en la jornada 9 y el control en la 7. En la jornada 17, la evolucionada pagó 117 monedas en reparaciones y perdió 16 cultivos; la referencia pagó 10 y perdió 70. También perdió 22 cultivos en la noche 20 frente a 53. Estos datos son compatibles con una reparación más oportuna, pero las fincas ya habían divergido antes de ambas noches: **no** demuestran por sí solos que una brecha concreta quedara cerrada por la corrección. El control empeoró en cultivos y caja finales, y aún sufrió una pérdida de 49 cultivos en la noche 14. El resultado es mixto, no una política validada para todos los biomas o semillas.

Esta comparación mide comportamiento de campaña, no rendimiento puro: las trayectorias y cargas de trabajo son distintas y no se hizo ABBA de tiempos. Tampoco certifica que cada cultivo estuviera en un recinto cerrado. El gasto idéntico de 900 monedas en muros evita interpretar la mejora de la evolucionada como abandono de la defensa, pero el estado físico y la continuidad de cada perímetro requieren observación independiente.

`run-input.json` conserva la invocación exacta: `node tools/evolutionary-balance/run-paired.mjs docs/qa/evolutionary-balance/management-search/repair-reserve-candidate-21/run-input.json`. El runner reutiliza los informes existentes; para repetir las simulaciones cambie `output` por una carpeta vacía desde este commit. Registra los hashes y rechaza reutilizar una carpeta que pertenezca a otra versión. Las pruebas dirigidas `native-expanding-defense-policy`, `evolutionary-balance`, `evolutionary-campaign-parity` y `animal-native-exit-bridge` pasaron: 17/17.

Antes de incorporar esta reserva al laboratorio principal hay que repetirla en semillas y biomas independientes, inspeccionar las brechas y reparaciones efectivamente terminadas y compararla con una política que ahorre para cerrar el recinto completo. No se propone cambiar el balance de producción ni fusionar esta rama en `main` a partir de esta sola cohorte.
