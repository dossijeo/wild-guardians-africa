# Piloto nativo de treinta noches, Manglares/123

Campañas continuas de Wild Engine con el balance de producción intacto, en el
worktree temporal `de719e0bdda877fe4ee183fb7107f69db4f7b585` más el
cherry-pick de la corrección de rutas de trabajadores `2486ba01076e8e221c3ec413167937a49b2fd401`
(`723ff991e2de3ed0149236ce069b33d698c958c4`). La rama de la PR #36 y
`main` no cambiaron. `stamp.json` conserva el SHA del runner, versión y
opciones. Los `report.json.gz`, sus índices SHA-256 `archive-index.json`,
`progress.jsonl` y checkpoints comprimidos permiten auditar resultado, ledger
y estado. Los informes JSON se comprimieron sin pérdida tras la corrida; el
runner original escribió JSON plano. Los checkpoints son observaciones
del estado, no recargas durante la campaña.

`evolved` designa aquí el candidato congelado `eee9529b306e0091`, idéntico a
`DEFAULT_GENES`. No se ha demostrado una mejora evolutiva: la búsqueda corta
exploró sólo cuatro genomas únicos. Además de sus genes, el candidato usa
`cashPolicy: minimum-reinvestment`; `good-current-magic` usa
`progressive-village`. Por tanto, su comparación emparejada **no aísla** la
contribución de los genes ni la eficacia de un material de muralla. Se añadió
`expansive-current-magic` como control de la política de caja. Los tres brazos
emplean las magias agrícolas vigentes, la misma semilla, bioma y reglas de
daño; la composición concreta de las hordas puede divergir porque la
atracción agrícola evoluciona de manera diferente.

| Política | Noches superadas | Resultado nativo | Caja final | Plantas vivas | Plantas destruidas | Ingresos | Semillas | Salarios | Murallas | Reparaciones | `Game.tick` |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Candidato `DEFAULT_GENES` | 30/30 | Sin terminal | 307 | 20 | 293 | 33.588 | 15.611 | 15.508 | 900 | 1.962 | 237,7 s |
| `good-current-magic` | 29/30 | Derrota en noche 30 | 205 | 1 | 390 | 31.113 | 14.660 | 14.285 | 900 | 1.763 | 169,0 s |
| `expansive-current-magic` | 17/30 | Derrota en noche 18 | 64 | 1 | 243 | 14.886 | 7.190 | 6.868 | 620 | 844 | 51,7 s |

Ambos brazos conciliaron exactamente el ledger cada jornada. El candidato
superó una noche más en esta única semilla, pero sus veinte plantas finales y
la pérdida de 167 a 20 plantas vivas entre los días 14 y 30 indican una
explotación frágil. El control sufrió una derrota nativa; no es un error ni una
parada por coste. La diferencia de `Game.tick` incluye fincas, trabajadores y
ataques físicamente distintos, por lo que no mide el rendimiento puro del
algoritmo.

La transición del candidato entre las jornadas 14 y 15 requiere distinguir
cosecha de daño: 167 plantas vivas anteriores generan exactamente 167 cajas
nuevas y pasan a inactivas, se compran 82 brotes, seis son destruidos por la
incursión y quedan 76 vivos. El aumento de cajas de 1.520 a 1.687 y los IDs
`sourcePlantId` de los dos snapshots certifican la cosecha de esas 167
plantas. No se debe atribuir la caída de 167 a 76 a bajas militares. En la
noche 16 sí se registraron 50 cultivos destruidos.

El control `expansive-current-magic` comparte la política de caja
`minimum-reinvestment` del candidato, pero difiere en otras decisiones de
reserva, plantación y defensa. Su derrota temprana muestra que la política de
caja por sí sola no explica la diferencia frente a `good-current-magic`;
ninguno de los tres brazos aísla un gen concreto. Sus totales abarcan sólo
dieciocho filas, incluida la jornada de derrota, y no deben tratarse como
treinta jornadas completas. Los tres informes concilian el ledger a diario.

En una corrida separada con horizonte máximo de sesenta noches, el candidato
reprodujo exactamente las treinta primeras filas físicas/económicas y sus
incursiones. Sufrió una **derrota nativa en la noche 31**: cerró con cero
plantas, 220 monedas y 29 plantas destruidas en esa incursión, sin fallo
técnico ni parada por coste. Véase `../worker-ab-campaign60/evolved/`.

Manglares/123 ya se usó para seleccionar y examinar el candidato durante 7 y
14 noches; esta extensión es **desarrollo**, no reserva virgen. La búsqueda
corta eligió `DEFAULT_GENES`, no una mutación superior, y ahora sabemos que
esa política no llega a la noche 100 en esta semilla. Se necesita validar una
política defensiva corregida en biomas y semillas inéditos, con horizontes
14/30 y reglas de producción fijas. No se modificó el balance.
