# Reparación: trayecto físico, precio y polvo comprometido

Implementaciones `19c3e23`/`20d3fd3` y fixture `888221a`. [71 pruebas dirigidas](qa/repair-chains/targeted.txt) pasan. Se añaden ocho cadenas en `tests/acceptance-repair-chains.test.js` y dos comprobaciones de polvo en `tests/work-vfx.test.js`.

La finca de las cadenas usa las 1.000 monedas iniciales sin financiación extra: centro (800), adobe (35), mijo (5) y empleado mayor (100), saldo 60. La contratación inicial se abre después de plantar. No se teleporta al trabajador ni se adelantan sus poses. Se usa `Navigation` real con huellas nativas, sobre un terreno expresamente plano y sin props; cada segmento del trayecto se comprueba transitable. Esta preparación no acredita la generación del terreno original o todos los biomas.

| Caso | Evidencia |
|---|---|
| QA-076/078 | Solicitar y reservar no cambia el saldo. El precio inicial es 9,45; daño adicional durante el recorrido lo eleva a 15,40. Al alcanzar físicamente el punto de servicio se cobra 16 y restaura una sola vez. |
| QA-077 | Cinco zarzas y otra semilla consumen 55 mediante compras reales; con saldo 5 se rechaza una solicitud de 9,45 sin añadir tarea, comando o pago. |
| QA-080 | Esas compras ocurren mientras la reparación está reservada y el trabajador camina. La orden sigue hasta su llegada, se cancela sin cargo, deja el daño y muestra el aviso de fondos insuficientes. |
| QA-079 | Una orden ya reservada conserva su identidad tras daño total, caída de 1,4 s, ruina y guardado/carga. El trayecto termina reconstruyendo por las 35 monedas originales. La destrucción se aplica expresamente fuera de una incursión para aislar D144. |
| QA-082 | Daño total a menos de 0,25 m del punto de servicio, sin ataque: una orden todavía válida puede reconstruir por 35 antes de acabar la caída. No se convierte en una reparación automática diferida. |
| QA-081/082 | Un ataque real de facóquero cancela inmediatamente la reparación en camino y hace huir al empleado. Tras daño/retirada completos, rehacer colas y cargar no regenera la orden ni paga una reparación. No se altera el presupuesto del animal para acortar esta incursión. |
| QA-083, contabilidad | Repetir el ID contable, ticks y cargar tras la reparación conserva un cargo de 10 y una sola restauración comprometida. |

Se detectó que la ruta normal de reparación no tenía polvo: se completa al llegar, por lo que nunca pasa por la fase `acting` que el antiguo adaptador esperaba. `RepairApplied` guarda ahora tiempo simulado y posición/orientación del punto de servicio; el adaptador presenta allí un único pulso de polvo y tierra del atlas/receta nativos del atelier (`dust`, modo de pulso único). No añade espera a la reparación ni cambia precios. No se afirma que este pulso sea una copia de los siete círculos 2D verdes de BAST.

Las pruebas comprueban ausencia de polvo antes del evento, una composición por identidad aun si la presentación recibe dos veces el mismo hecho, pausa con partículas exactamente estables, carga con el mismo tiempo y partículas dentro de 1e-4 (la integración por subpasos puede diferir en precisión), expiración y liberación de recursos. Eventos antiguos sin posición, futuros, malformados o de solicitud no recrean polvo ni afectan al saldo. El renderer no emite reglas de juego.

El ensayo de polvo usa otro centro pagado y conserva 95 antes de solicitar, 560/600 PV tras el golpe preparado y 41 después de la reparación de 40 PV: 800×40/600 se cobra como 54. Se verifican en navegador terreno original Sabana/Suajili, pausa, recarga en memoria y disipación; la prueba no acredita todas las culturas ni dispositivos móviles físicos.


La octava cadena reproduce explícitamente el callback de una tarea consumida después de recibir otros 20 PV de daño. Antes de `20d3fd3`, el libro contable evitaba cobrar otra vez, pero la ejecución restauraba 300 PV desde 280 y emitía otro hecho de reparación. Ahora solo una transacción nueva puede aplicar restauración y presentación; el replay consume el callback sin borrar ese daño posterior, cobrar ni emitir otro polvo. No es una nueva orden válida del jugador. Se conserva el [fallo previo](qa/repair-chains/replay-before.txt).

En navegador, [llegada](qa/repair-chains/arrival.png), [carga a 0,12 s](qa/repair-chains/reload.png), [polvo a 0,62 s](qa/repair-chains/dust.png) y [disipación](qa/repair-chains/expired.png) mantienen una reparación, centro 600/600 y saldo 41. La receta de polvo es pequeña y queda junto al punto de servicio. Cero errores en consola. El fixture y servidor propios se cierran; la sesión del usuario en 5173 no se modifica.

Validación local final para `20d3fd3`: [717/717 pruebas](qa/repair-chains/tests.txt), cero fallos/omisiones, 296,87 s; 71 dirigidas. Build y paquete web aprobados: 554 archivos, 379.676.256 bytes, 794 enlaces relativos, 20 GLB runtime sin duplicados originales. La comprobación aritmética original del plan pasa 123.048 aserciones; no sustituye aceptación de partidas integradas. Se conserva el aviso de bundle JS mayor de 500 kB. La matriz incremental queda en 66 casos verificados, 6 parciales y 87 pendientes; esto no declara concluido el Plan Maestro.

[CI 37096878679](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37096878679) aprobada para `20d3fd3`: assets, assets web, reglas, 717 tests, build, paquete y exportación ZIP para itch.io. El [log completo](qa/repair-chains/ci.txt) conserva los resultados. Los artefactos del workflow no constituyen publicación en itch.io.
