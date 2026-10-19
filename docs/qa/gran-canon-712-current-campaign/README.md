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
node tools/experiments/compare-enclosure-defense-campaigns.mjs gran-canon 100 712 report-100.json topological
```

| Horizonte | Incursiones verificadas | Cultivos vivos | Monedas | Pérdidas de cultivos en incursiones | Golpes a murallas | Resultado |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 14 noches | 14/14 | 53 | 728 | 7 | 136 | Activa |
| 30 noches | 30/30 | 47 | 1.033 | 16 | 491 | Activa |
| 100 solicitadas | 77/77 | 0 | 31 | 129 | 1.687 | Derrota económica en el día 78 |

Los primeros 14 hashes de estado serializado coinciden **14/14** entre
[la ejecución corta](report-14.json) y [la de 30 noches](report-30.json).
Los primeros 30 hashes de [la petición de 100 noches](report-100.json)
coinciden **30/30** con la ejecución de 30. Esta última terminó antes del
horizonte solicitado: 77 incursiones verificadas, ningún problema técnico
registrado por el informe de incursiones y resultado de juego `defeat`.
La segunda pagó 160 monedas por 16 piezas de muralla y cursó 134 solicitudes
de reparación. Una propuesta topológica incierta quedó sin comprar; la
política no la trató como un recinto certificado.

En el horizonte largo se pagaron 470 monedas por 47 piezas y se solicitaron
599 reparaciones. Al amanecer siguiente a la noche 77 quedaban 31 monedas y
ningún cultivo vivo. `closeNight()` declaró la derrota al comparar ese saldo
con `dawnMinimum()`. Con un centro operativo pero sin cultivos ni cajas, el
mínimo sería 35 monedas (30 de reserva para contratar y 5 para una semilla);
sin centro operativo sería al menos 830. El informe no conserva el estado
final de estructuras y cajas, por lo que no demuestra cuál de esas carencias
determinó el umbral aplicado. Sí demuestra que las 31 monedas quedaron por
debajo de él. La venta de murallas no se considera recuperación.

Las medias de `Game.tick` fueron 1,40, 1,58 y 1,72 segundos por noche para los
bloques 1–10, 11–20 y 21–30. La finca y las incursiones cambian durante el
recorrido, y el host también ejecutó otras tareas; estas cifras describen la
carga observada, no una comparación A/B ni una prueba de fuga de memoria.
En la ejecución larga, `Game.tick` acumuló 46,0 s en noches 1–30, 71,4 s en
31–60 y 18,3 s en 61–77. Hubo picos aislados (8,44 s en la noche 57), no una
subida monótona: el coste cayó al contraerse la finca. Estas duraciones no
separan sus causas nativas y no justifican atribuirlas a un historial no
liberado. Gran Cañón/712 muestra aquí una derrota económica y militar
reproducible; la victoria estrecha ya registrada en Sabana/123 demuestra que
el juego también permite ganar. Ninguno de esos dos casos estima una tasa de
victoria general. Los resultados de otros commits o políticas no pueden
atribuirse a este cambio sin repetir ambos brazos sobre entradas equivalentes.
