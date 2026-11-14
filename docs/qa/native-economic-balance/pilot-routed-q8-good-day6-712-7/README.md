# Piloto nativo de defensa trazada — siete noches

Fuente congelada `ed541269`, semilla 712, Sabana/Mapungubwe, política laboral
Q8 sin cambios, estrategia buena con murallas financiadas desde el día 6.
Los parámetros agrícolas, salariales y militares permanecen iguales.

Comando: `node tools/run_native_campaign.mjs --out
docs/qa/native-economic-balance/pilot-routed-q8-good-day6-712-7 --days 7
--seed 712 --strategy good --biome sabana --culture mapungubwe
--labour-policy q8 --defense-policy routed --defense-start-day 6`.

| Día | Saldo | Cultivos vivos | Brotes comprados | Cajas entregadas | Murallas pagadas | Reparaciones pagadas | Inactividad |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 219 | 95 | 123 + brote inicial | 29 | 0 | 0 | 59,0 % |
| 2 | 183 | 113 | 57 | 39 | 0 | 0 | 81,0 % |
| 3 | 292 | 120 | 61 | 54 | 0 | 0 | 78,3 % |
| 4 | 243 | 143 | 72 | 49 | 0 | 0 | 75,0 % |
| 5 | 403 | 169 | 96 | 70 | 0 | 0 | 67,0 % |
| 6 | 285 | 154 | 42 | 57 | 470 | 0 | 81,7 % |
| 7 | 318 | 99 | 0 | 55 | 480 | 64 | 93,3 % |

Todos los movimientos diarios concilian exactamente con el ledger. Los cinco
primeros registros diarios son idénticos, campo por campo, al piloto financiado
anterior `5985791f`, que no logró construir murallas. No se atribuyen diferencias
anteriores al comienzo efectivo de la defensa.

| Incursión | Animales | Cultivos expuestos | Cultivos destruidos | Golpes contra murallas | HP perdidos por murallas | Contactos con escudo | Golpes sobrantes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Candidata, noche 6 | 10 | 154 | 0 | 25 | 565 | 4 | 0 |
| Control anterior, noche 6 | 11 | 227 | 15 | 0 | 0 | 0 | 0 |
| Candidata, noche 7 | 9 | 99 | 0 | 31 | 707 | 0 | 0 |
| Control anterior, noche 7 | 11 | 206 | 15 | 0 | 0 | 0 | 0 |

La composición no se ha forzado para igualar unidades: el mismo generador
nativo responde al distinto valor agrícola producido por las decisiones.
Por tanto, esta comparación de estrategias no aísla causalmente cada variable.
Sí acredita impactos físicos contra murallas, presupuestos de golpes agotados
y ausencia de pérdidas agrícolas en esas dos incursiones observadas. La noche
7 no tuvo contactos con escudo. No se aplicó una reducción sintética de daño.

Primer recinto completado al tiempo 72 del día 6. Se pagaron 95 piezas por 950
monedas entre ambos días; se solicitaron nueve reparaciones, pero solo se
atribuyen como gasto las 64 monedas efectivamente cobradas al ejecutarlas.
La reducción de cultivos vivos también incluye cosechas reales; no equivale a
destrucción. Véanse los censos de incursiones, no solo la columna diaria.

**No aceptado como balance:** 76,43 % de inactividad agregada frente al objetivo
inferior al 25 %. Solo hay una semilla y siete noches, sin derrota ni victoria.
No se lanza una campaña de cien noches a partir de este resultado. El historial
revela además un nuevo trazado exterior durante el día 7 mientras el recinto
anterior necesita mantenimiento: revisar que la política repare/reconstruya
el perímetro pagado antes de financiar otro cuando el área agrícola no crece.
Este gasto no debe convertirse en mantenimiento ficticio ni ocultarse.

Evidencia conservada: `source.json` (hashes), `protocol.json`, `days.jsonl`,
`report.json`, `state.json.gz`, `receipt.json` y `comparison.json` (comparación
y hashes de los informes). No se han sobrescrito campañas anteriores.
Pruebas dirigidas: nueve de trazado/financiación y 22 de CLI, contabilidad,
defensa y contratación aprobadas. No es una medición WebGL/GPU/móvil; el
planificador de QA no se ha integrado en el juego ni fusionado con `main`.
