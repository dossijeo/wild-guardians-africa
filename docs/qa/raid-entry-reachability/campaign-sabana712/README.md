# Segundo piloto nativo: Sabana/712

Se repitió el experimento de Desierto con la misma combinación de fuentes
(`4133f914` del laboratorio evolutivo + entrada `99aa7015`, checkout
`d9110380`), los mismos genes agrícolas y dos decisiones defensivas. Cambian
sólo bioma y semilla a Sabana/712. Los parámetros exactos y resultados
íntegros están en `config.json`, `summary.json` y los dos JSON comprimidos.
El informe de cada jornada concilia con el libro mayor.

| Defensa | Noches superadas | Resultado | Saldo final | Cultivos vivos | Cultivos destruidos desde noche 6 | Golpes a muros | HP estructural perdido | Muros pagados |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Murallas `service-side` | 14 | horizonte completo | 867 | 127 | 33 | 337 | 7880 | 70 piezas / 700 monedas |
| Sin murallas | 11 | derrota nativa día 12 | 780 | 94 | 268 | 0 | 0 | 0 |

Las noches 1–5 no causaron bajas agrícolas en ninguno de los dos brazos.
Desde la noche 6, las murallas absorbieron ataques reales; sus daños y
reparaciones están en el informe. La finca protegida terminó las 14 noches,
mientras la explotación sin muros perdió entre 24 y 45 cultivos cada noche
desde la 6 hasta caer durante el día 12. La diferencia no procede de cambiar
el daño, la composición, los precios ni el comportamiento físico según la
estrategia.

Este resultado contrasta con Desierto/983, donde ambos brazos cayeron durante
el día 13. La ventaja defensiva es medible en esta semilla, pero dos biomas
con una semilla cada uno no permiten estimar probabilidades de victoria ni
aprobar el balance para 100 noches. Tampoco se ha certificado que cada tramo
de `service-side` forme un recinto totalmente cerrado. Se mantienen la PR y
sus cambios fuera de `main` hasta revisar cierres, brechas, otras semillas y
presión sostenida.
