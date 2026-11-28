# Comparación nativa de contratación joven

Fuente congelada `e90a7b6e`, siete noches completas, semilla 712,
Sabana/Mapungubwe, Q8, cultivos históricos y defensa trazada con mantenimiento
desde el día 6. Selección pagada `youngFemale`, frente a `olderFemale` del
control `f8542c59`. Los 317 hashes nativos y de balance comparados coinciden.
Solo se cambia una elección del jugador; se mantienen los jornales 30/40.

| Resultado a siete noches | Mayores | Jóvenes |
| --- | ---: | ---: |
| Saldo final | 429 | 370 |
| Cultivos vivos | 176 | 131 |
| Ingresos efectivos | 4.444 | 4.367 |
| Salarios pagados | 1.541 | 1.737 |
| Semillas compradas, coste | 2.655 | 2.460 |
| Murallas compradas, coste | 470 | 500 |
| Reparaciones ejecutadas, coste | 49 | 0 |
| Cajas entregadas | 353 | 350 |
| Inactividad observada | 73,43 % | 75,14 % |

Todos los movimientos diarios concilian con el ledger. Ambas partidas
completan siete noches sin derrota ni victoria. En la candidata joven la
noche 6 registra once plantas destruidas y ningún impacto contra murallas;
la noche 7 registra cero bajas agrícolas, 25 golpes contra murallas, 550 HP
estructurales perdidos y seis contactos con escudo. No quedan golpes sin usar.
Son consecuencias de su construcción y capital disponibles, no una reducción
oculta de defensa por elegir jóvenes. No se interpreta gasto cero en reparación
como ausencia de daño: solo cuenta el dinero realmente pagado al ejecutarla.

No es un experimento de tiempos de tarea aislados: el capital inicial distinto,
la evolución agrícola y las decisiones posteriores también afectan la presión
militar y los recorridos. No se afirma que los jóvenes sean peores en todos
los contextos. Este piloto **no justifica sustituir el perfil mayor** en la
estrategia candidata ni acredita el objetivo de inactividad inferior al 25 %.

El código nativo acelera las acciones de trabajo con `profile.speed`; no aplica
ese factor a la velocidad de recorrido en `moveWorker`. Se documenta la regla
observada, sin cambiarla para fabricar una mejora. Una ventaja teórica del
50 % en tareas no equivale a un 50 % más de cajas por jornada.

Comando: `node tools/run_native_campaign.mjs --out
docs/qa/native-economic-balance/pilot-young-q8-good-day6-712-7 --days 7
--seed 712 --strategy good --biome sabana --culture mapungubwe
--labour-policy q8 --defense-policy routed --defense-start-day 6
--profile youngFemale --stop-file .cache/young-q8-712-stop.flag`.
No se creó la señal de parada; el horizonte se completó nativamente.

Resultados, journal, protocolo efectivo, procedencia y guardado se conservan
en esta carpeta. `comparison.json` registra ambos informes y hashes.
Las pruebas de CLI, contratos y contabilidad pasan (14 pruebas antes del ajuste
de protocolo; 11 relevantes repetidas después). Sin cambio de producción/main.

Siguiente validación: volver a la candidata mayor y completar primero la
comparación corta de las semillas preseleccionadas y estrategias. La inactividad
alta de la primera semana es una alerta, no una demostración por sí sola de
que la media de cien noches vaya a incumplir el 25 %. Ese criterio permanece
obligatorio y debe comprobarse en el horizonte correspondiente; no se declara
equilibrio válido ni se elimina la necesidad de calibración.
