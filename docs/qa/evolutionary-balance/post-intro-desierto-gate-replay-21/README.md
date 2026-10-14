# Desierto/983: repetición emparejada de 21 noches tras PR #40/#41

Fuente de **ambos** brazos: `2b208619dca8c79d3bd859493e2e735db0e78a60`, que incorpora `main` `020b6abcaa602d51823bd477dd3cdf4de73b1e26`. Genes `DEFAULT_GENES`, misma semilla/bioma/cultura y magia actual. La única diferencia de política es `wallPolicy:none` en el control. Presupuestos de parada: 60 s de `Game.tick` por jornada y 15 min de tiempo real por caso. El runner guardó configuración, hashes de módulos, ledger diario, informe nativo comprimido y snapshots de la primera observación de cada incursión de las noches 6–11. **Los 34 archivos originales de ambos brazos están preservados sin pérdida en `evidence.zip`**; `integrity.json` enumera SHA-256 y tamaño del ZIP y de cada miembro. La cohorte antigua de SHA `1082d98e` permanece íntegra en `post-intro-holdout-21` y **no se combina** con ésta.

Los dos brazos llegaron a **21/21 noches** sin derrota nativa ni parada técnica. El brazo defendido superó el día 15, donde el motor anterior se había censurado: `Game.tick` pasó de exceder el límite de 60 s a 5,0 s ese día. Sus primeros 14 días tienen las mismas magnitudes físicas/económicas diarias (dinero, plantilla, plantación, entregas, pérdidas, vivos, magias) que los recibos parciales de la cohorte censurada; no afirmamos igualdad de tiempos. El control sin murallas reproduce exactamente sus filas diarias y `raidEvidence` antiguos, aparte de los tiempos de pared; los resultados físicos no cambiaron al integrar PR #40/#41 para ese brazo.

| Métrica, noches 6–21 salvo indicación | Murallas + Escudo | Sin murallas + Escudo |
| --- | ---: | ---: |
| Animales generados | 261 | 278 |
| Contactos lógicos | **0** | 318 |
| Impactos en cultivos / destruidos | 0 / 0 | 288 / 288 |
| Golpes a murallas | **0** | 0 |
| Contactos de Escudo | **0** | 59 |
| Retiradas por espera/bloqueo | 261 | 204 |
| Retiradas por presupuesto agotado | 0 | 74 |
| Eventos `AnimalTargetUnavailable` | 23.657 | 18.421 |
| Ingreso / semillas / salarios / nuevas murallas / reparaciones | 19.408 / 8.410 / 9.793 / 620 / 0 | 23.978 / 12.280 / 11.568 / 0 / 246 |
| Entregas | 1.573 | 1.860 |
| Máximo `Game.tick` diario | 5,6 s | 5,8 s |
| Final noche 21: dinero / cultivos vivos | 1.130 / 138 | 718 / 70 |

El brazo defendido pagó **1.170** monedas de murallas en toda la campaña, 620 desde la noche 6. La composición y número de animales divergen legítimamente por la distinta atracción agrícola; no son hordas idénticas. Todos los ledgers diarios reconciliaron. La supervivencia defendida **no demuestra eficacia militar ni económica normal de las murallas**, porque ningún animal llegó a golpear cultivo, Escudo, estructura o muro en 16 incursiones consecutivas. Tampoco corresponde declarar superior al control: éste sufrió daño físico real desde la noche 11. **La comparación de eficacia defensiva se clasifica como no evaluable** hasta explicar por qué los animales del recinto defendido jamás atacaron una barrera accesible, o certificar que sólo tenían barreras naturales infranqueables sin muro atacable.

## Probe topológico acotado

La campaña sólo copió estado, bounds y `raidView` una vez por incursión; **no preguntó rutas adicionales al navegador activo** ni alteró RNG. `probe-raid-connectivity.mjs` reconstruyó Wild Engine offline y cargó los 36 chunks de los bounds capturados. Para cada especie presente consultó desde el primer animal a dos cultivos testigo (más próximo y mediano). Las salidas `*-connectivity.json` conservan las respuestas y las razones observables de `unknown`.

- Defendido, noche 6: cuatro consultas testigo (facóquero e hiena) dieron `blocked`; sus cultivos resultaron `sealed` en la reconstrucción y sus componentes eran distintos de los del animal. No hay prueba todavía de que ningún **lado de muro** fuera alcanzable y atacable. Noches 7–11 mezclan testigos `blocked` con extremos agrícolas sin conector de cuadrícula (`unknown`).
- Sin murallas, noche 6: los cuatro testigos dieron `unknown` por grafo inconcluso pese a componentes de extremos conocidos; sus cultivos fueron `open-frontier`, no recinto sellado. Noches 7–11 mezclan esa causa con cultivos testigo sin conector de cuadrícula. `unknown` no equivale a `blocked` ni certifica un río, acantilado o barrera física. La noche 11 obtuvo 10 contactos reales pese a que algunos testigos siguieron inconclusos.

El probe carga todos los chunks de la vista guardada, por lo que **no reproduce la residencia exacta en vivo**. Tampoco dos cultivos por especie representan toda la finca. Sus respuestas son diagnóstico de los puntos de muestra, no un certificado global de recinto o acceso. Capturas e informes negativos se conservan.

La investigación técnica de entrada, conectividad y selección de muro sigue en rama separada del motor. No ampliar a 30 noches ni optimizar presión militar sobre esta cohorte hasta distinguir protección física legítima de un fallo de selección que retire animales con golpes intactos. Las noches 1–5 introductorias quedan fuera de las métricas militares anteriores.

Para reproducir ambos brazos desde una revisión limpia idéntica a la fuente anterior, extraer `config.json` y `no-walls-config.json` de `evidence.zip` a este directorio y ejecutar `run-post-intro-pilot.mjs` con cada uno por separado. Una repetición en otra revisión es **otra cohorte** y debe usar directorios nuevos. Para examinar una captura, extraer el miembro `*-probe.json.gz` deseado del mismo ZIP y ejecutar `node tools/evolutionary-balance/probe-raid-connectivity.mjs <archivo-raid-probe.json.gz>`. La salida correspondiente `*-connectivity.json` también está en el ZIP. El empaquetado verificó byte por byte todos los miembros antes de retirar los duplicados sueltos.
