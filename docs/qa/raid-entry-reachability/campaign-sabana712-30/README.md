# Extensión nativa de Sabana/712 a 30 noches

Se prolongó el brazo amurallado `service-side` del piloto de 14 noches con
la misma semilla, genes, economía y presión militar. El checkout de prueba es
`d9110380`; los hashes de módulos y la configuración exacta constan en
`config.json`. Sólo cambió el horizonte de 14 a 30 noches y el presupuesto
máximo de tiempo de ejecución. Los primeros 14 registros económicos y
agrícolas coinciden exactamente con el piloto anterior, excluyendo los
tiempos de ejecución. La optimización posterior que consulta el índice de
cultivos vivos en la selección de entradas no formaba parte de este checkout;
su replay congelado y pruebas focales se validaron aparte.

| Jornada | Animales | Golpes a muros | HP perdido en muros | Cultivos destruidos | Cultivos expuestos al inicio | Saldo final | Cultivos vivos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 12 | 18 | 37 | 814 | 6 | 140 | 987 | 134 |
| 13 | 18 | 44 | 1063 | 10 | 138 | 949 | 128 |
| 14 | 18 | 27 | 656 | 3 | 130 | 867 | 127 |
| 15 | 18 | 18 | 568 | 42 | 115 | 808 | 73 |
| 16 | 18 | 0 | 0 | 57 | 107 | 621 | 50 |

El simulador notificó una **derrota nativa en el día 16**, tras superar 15
noches. No fue una parada por coste: cada jornada concilió con el ledger y
`Game.tick` consumió 2,0–4,0 segundos entre los días 14 y 16. Los animales
gastaron sus presupuestos de golpes mediante ataques reales. El número de
animales se mantuvo en 18; la presión bajó ligeramente de 0,2173 en la
noche 15 a 0,2151 en la 16. Esta reducción no evitó una segunda pérdida
grave cuando la defensa ya no interceptaba golpes.

La política pagó 86 módulos de zarzas (860 monedas) durante la campaña,
además de reparaciones. En el día 15 sólo pudo pagar 16 nuevos módulos y
el plan aún registraba 18 huecos; en el día 16 las diez oportunidades de
construcción terminaron por presupuesto y no compró ninguno. Hubo cinco
ruinas estructurales en la incursión del día 15. Esta evidencia muestra una
defensa insuficiente o degradada, pero **no certifica** que el perímetro
estuviera completamente cerrado antes de la pérdida. No permite atribuir la
derrota únicamente a la intensidad militar ni concluir que todas las
murallas sean ineficaces. Tampoco justifica modificar daño o economía desde
esta PR de entradas.

`service-side-sabana-712-30.json.gz` conserva el informe completo de
campaña, incursiones, defensa y conciliación; `jsonl` conserva el avance
diario y `summary.json` distingue la derrota real de errores técnicos. El
control sin murallas del mismo código ya había perdido en el día 12 del
piloto de 14 noches, por lo que no se repitió después de su final terminal.
