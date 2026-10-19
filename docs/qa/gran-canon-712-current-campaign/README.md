# Gran Cañón/712: campaña defendida con Wild Engine actual

Estas ejecuciones usan Mapungubwe, estrategia `good`, defensa topológica,
intenciones nativas, planes nativos de murallas y presión militar V1. Se
realizaron sobre el árbol Git `78454925177c2d0849bd50e66f87cdc95c712711`
(commit `9b0f257f`, idéntico al árbol fusionado en `main` por la PR #144).
El WASM de producción tiene SHA-256
`09616da85bf59c50c0cde7b743a4bdccb2eac06ec4eb0b79f79c44ef71d9caa9`.
No se cambiaron precios, daño, presión, política del jugador virtual ni reglas
de navegación para estas pruebas.

Reproducción desde ese árbol, con rutas de salida vacías:

```sh
node tools/experiments/compare-enclosure-defense-campaigns.mjs gran-canon 14 712 report-14.json topological
node tools/experiments/compare-enclosure-defense-campaigns.mjs gran-canon 30 712 report-30.json topological
```

| Horizonte | Incursiones verificadas | Cultivos vivos | Monedas | Pérdidas de cultivos en incursiones | Golpes a murallas | Resultado |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 14 noches | 14/14 | 53 | 728 | 7 | 136 | Activa |
| 30 noches | 30/30 | 47 | 1.033 | 16 | 491 | Activa |

Los primeros 14 hashes de estado serializado coinciden **14/14** entre
[la ejecución corta](report-14.json) y [la de 30 noches](report-30.json).
La segunda pagó 160 monedas por 16 piezas de muralla y cursó 134 solicitudes
de reparación. Una propuesta topológica incierta quedó sin comprar; la
política no la trató como un recinto certificado.

Las medias de `Game.tick` fueron 1,40, 1,58 y 1,72 segundos por noche para los
bloques 1–10, 11–20 y 21–30. La finca y las incursiones cambian durante el
recorrido, y el host también ejecutó otras tareas; estas cifras describen la
carga observada, no una comparación A/B ni una prueba de fuga de memoria.
La ejecución de 30 noches no certifica supervivencia a 100 noches ni margen
de victoria. El resultado anterior de otro commit o política no puede
atribuirse a este cambio sin repetir ambos brazos sobre entradas equivalentes.
