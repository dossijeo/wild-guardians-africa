# Piloto de material y umbral de reparación, sin cambiar el balance

Tres campañas nativas de Manglares/Mapungubwe, semilla 123, catorce noches,
usaron `DEFAULT_GENES` y Wild Engine del commit experimental
`4ca3982bcc5bc517c2210d6fb61bed4e439cec99` (base del laboratorio
`de719e0b`, corrección de rutas de trabajadores `2486ba01`). Cada brazo
modificó **un solo gen** del jugador virtual. La referencia zarzas/0,80 fue
ejecutada antes sobre el mismo runtime y se conserva en
`../worker-ab-candidate14/candidate.json.gz`. Los `stamp.json` registran
parámetros y hashes del runner y la política. Los informes completos,
progreso diario y checkpoints nativos se archivaron sin recargas, con hashes
en `archive-index.json` y `checkpoints/index.jsonl`.

| Política | Noches | Caja día 14 | Cultivos vivos | Destruidos | Ingresos | Semillas | Salarios | Muros pagados | Reparaciones | Ruinas registradas |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Zarzas, reparar <80 % (referencia) | 14/14 | 905 | 167 | 5 | 18.234 | 8.460 | 8.084 | 900 | 585 | 44 |
| Zarzas, reparar <95 % | 14/14 | 905 | 167 | 5 | 18.234 | 8.460 | 8.084 | 900 | 585 | 44 |
| Empalizada, reparar <80 % | 14/14 | 840 | 111 | 52 | 17.969 | 8.332 | 7.515 | 1.040 | 942 | 10 |
| Adobe, reparar <80 % | 14/14 | 820 | 130 | 52 | 15.342 | 7.195 | 6.073 | 1.400 | 554 | 4 |

Los dos brazos de zarzas produjeron filas diarias físicas/económicas,
incursiones e historial de defensa exactamente iguales; sólo difieren el gen
declarado y los tiempos de ejecución. El umbral 0,95 está conectado al motor de
decisión, pero **no cambió una acción observada** en esta cohorte. No debe
premiarse ni interpretarse como mejora evolutiva por este piloto.

La empalizada perdió 50 cultivos en la noche 12, con cero impactos contra
muros esa noche. El adobe perdió 19 y 29 cultivos en las noches 6 y 7. Las
trayectorias agrícolas cambian la atracción, composición y posición de los
ataques, de modo que estos resultados no aíslan una eficacia intrínseca del
material. La auditoría topológica independiente
`codex/virtual-perimeter-gap-policy`/`23c7784624a83eceb72fd5e17bb839e0694c8d6e`
halló que empalizada pasó de recinto cerrado en el snapshot del día 11 a 141
de 146 cultivos alcanzables desde exterior en el día 12, con tres ruinas. Al
restaurarlas sólo en memoria, ninguno de esos cultivos siguió alcanzable y
cinco quedaron `unknown`. Zarzas tenía 132 de 136 alcanzables de forma
estática ese día, pero sufrió cero bajas y recibió 36 impactos de muro. Por
tanto, conectividad potencial no equivale a conducta de la incursión; faltan
snapshots del momento exacto de apertura de las brechas.

No hay evidencia para prolongar a treinta noches los dos materiales que
terminaron con menos cultivos y mayores pérdidas, ni para seleccionar un
material definitivo. Manglares/123 ya es escenario de desarrollo, no reserva
virgen. El siguiente experimento debe comparar prioridades legales de
reparación de ruinas con el resto de genes y el balance congelados, antes de
repetirlo en biomas y semillas independientes.
