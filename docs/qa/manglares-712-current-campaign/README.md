# Manglares/712: campaña defendida con Wild Engine actual

Tres ejecuciones independientes usan Mapungubwe, estrategia `good`, defensa
topológica, intenciones y planes de murallas nativos, y presión militar V1.
Las de 14 y 30 noches parten de `main` en `d502e27b` (árbol Git
`4c9a7063f4b095399518b4f630c8a31251d38a77`); la de 100 parte
de `a21a7197` (árbol `92e99b7b6466043f484d1911dab194afc5f21a80`),
que solo añade estos informes al mismo código de juego. El SHA-256 del
`native-campaign-runner.mjs` es
`fe029930fc1d3a0dd5f90a799227ba8673d84dc5bdc655ad7af7a7a2a2e6b725`;
el del WASM de producción es
`09616da85bf59c50c0cde7b743a4bdccb2eac06ec4eb0b79f79c44ef71d9caa9`.
No se modificaron reglas, precios, daño, presión militar ni la política del
jugador virtual.

Reproducción desde ese árbol, con rutas de salida vacías:

```sh
node tools/experiments/compare-enclosure-defense-campaigns.mjs manglares 14 712 report-14.json topological
node tools/experiments/compare-enclosure-defense-campaigns.mjs manglares 30 712 report-30.json topological
node tools/experiments/compare-enclosure-defense-campaigns.mjs manglares 100 712 report-100.json topological
```

| Horizonte | Incursiones verificadas | Cultivos vivos | Monedas | Cultivos perdidos en incursiones | Golpes a murallas | Piezas pagadas / coste | Solicitudes de reparación | Resultado |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 14 noches | 14/14 | 142 | 981 | 0 | 170 | 43 / 430 | 53 | Activa |
| 30 noches | 30/30 | 153 | 992 | 244 | 732 | 43 / 430 | 290 | Activa |
| 100 noches | 100/100 | 15 | 266 | 1.209 | 3.188 | 66 / 660 | 1.500 | Victoria |

Los primeros 14 hashes de estado serializado coinciden **14/14** entre
[la ejecución corta](report-14.json) y [la de 30 noches](report-30.json).
Los primeros 30 hashes también coinciden **30/30** entre esta última y
[la ejecución de 100 noches](report-100.json). Los tres informes terminan
sin problemas de evidencia de incursiones. Las
solicitudes de reparación no acreditan por sí mismas reparaciones terminadas;
su historial completo está en los JSON. Entre las noches 17 y 29 hubo pérdidas
agrícolas importantes, pero el bot replantó y conservó una finca activa hasta
la noche 30. Después sufrió pérdidas sostenidas y acabó la noche 100 con
15 cultivos vivos y 266 monedas: una victoria ajustada de esta semilla,
no una garantía de victoria en Manglares ni una estimación de tasa general.

El informe de 30 noches registra 131,9 s de `Game.tick`, 59,7 s de decisiones
y 211,6 s de tiempo total. `Game.tick` acumuló 27,3 s en las noches 1–10,
50,7 s en 11–20 y 53,9 s en 21–30. Cambian tanto la finca como la presión
durante el recorrido y hubo carga variable del host: estos tiempos describen
una ejecución, **no** una comparación A/B ni una prueba de fuga de memoria.
Las ejecuciones tienen estados iguales durante sus 14 noches compartidas,
pero duraciones distintas; no deben utilizarse para atribuir una mejora de
rendimiento a la versión corta.
La ejecución de 100 noches acumuló 374,2 s de `Game.tick`, 191,2 s de
decisiones y 630,2 s de tiempo total. Tampoco es un brazo A/B: los estados
cambian mucho durante la campaña y los tiempos no aíslan una optimización.

Esta evidencia amplía a Manglares el ensayo de [Sabana/123](../defended-campaign-regression-2026-10-18/README.md)
y el de [Gran Cañón/712](../gran-canon-712-current-campaign/README.md).
Muestra una victoria apretada con pérdidas reales y recuperación,
sin estimar una tasa general de victoria ni cambiar el balance para conseguirla.
