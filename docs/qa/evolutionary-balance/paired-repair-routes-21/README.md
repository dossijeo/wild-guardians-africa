# Desierto/983: pareja nativa tras corregir rutas de reparación

Fuente única: `175865f3ff75d3d1431e0a13e6293ec58f1ecb88`, que incorpora `main` `7d257501bb389b816aec035fb5c8c3a991bcb716`. El balance de producción no cambió. Se congelaron los genes `DEFAULT_GENES`; el control únicamente usa `wallPolicy: none`. Cada brazo se ejecutó de forma continua durante 21 noches con Wild Engine, acciones legales, ledger real y el mismo bioma, semilla y límites de ejecución. La presión militar normal se analiza desde la noche 6, tras las cinco noches introductorias. `input.json` y `results/config.json` registran la configuración y los hashes de código.

| Métrica | Murallas + Escudo | Sin murallas + Escudo |
| --- | ---: | ---: |
| Noches completadas | 21/21 | 21/21 |
| Dinero / cultivos vivos al final | 965 / 149 | 718 / 70 |
| Animales, noches 6–21 | 264 | 278 |
| Contactos físicos, noches 6–21 | 68 | 318 |
| Cultivos destruidos, noches 6–21 | 0 | 288 |
| Valor base de cosecha perdido | 0 | 4.604 |
| Coste de reposición de cultivos destruidos | 0 | 2.255 |
| Golpes a murallas / HP perdido / piezas arruinadas | 43 / 998 / 11 | 0 / 0 / 0 |
| Contactos de Escudo | 25 | 59 |
| Coste pagado de murallas / reparaciones | 950 / **0** | 0 / 246 |
| Ingresos / semillas / salarios pagados | 25.563 / 11.699 / 12.649 | 28.329 / 14.530 / 13.535 |
| Animales retirados por espera/bloqueo con golpes restantes | **246 / 880 golpes** | 204 / 840 golpes |

Los 21 ledgers diarios de cada brazo conciliaron y los dos informes de incursión tienen `status: verified` sin incidencias. La noche 16 del control destruyó 104 cultivos; el día 20 destruyó otros 78. El gráfico [`results/trajectories.svg`](results/trajectories.svg) muestra dinero, cultivos vivos, pérdidas y salarios por día. Los informes `.json.gz` contienen filas diarias, presupuestos de ataque, especies, contactos, motivos de retirada y decisiones de construcción. Los doce snapshots de incursiones iniciales permiten revisar el terreno y la conectividad offline. Esta cohorte no sustituye ni modifica las campañas históricas.

La corrección del motor resolvió el fallo técnico `SpatialChunkUnavailable` que censuraba el brazo defendido en el día 7 de la cohorte anterior. La diferencia de pérdidas agrícolas en esta semilla es real; **no demuestra todavía una protección generalizable ni un balance de 100 noches**. En cuatro de las dieciséis incursiones normales se golpearon muros (noches 6, 9, 11 y 21). En las demás, gran parte de los animales se retiró con presupuesto intacto. Además, la política defendida solicitó reparaciones pero pagó cero: la auditoría topológica previa sitúa piezas dañadas al otro lado de una cresta que los trabajadores no pueden cruzar. La finca sigue comprando módulos nuevos, por lo que contabilizar ese gasto como mantenimiento reparador sería incorrecto.

Siguiente evaluación: congelar esta política como control y ensayar una **versión explícita** de planificación de perímetro que coloque segmentos reparables desde la región laboral, aprovechando barreras naturales sin certificar accesos inexistentes. Comparar la nueva política con la actual y con el control sin murallas en varias semillas y biomas. Investigar también las retiradas con golpes sin usar antes de atribuir toda la diferencia a la eficacia de murallas. No ajustar aún precios, HP o daño militar a partir de esta única pareja.
