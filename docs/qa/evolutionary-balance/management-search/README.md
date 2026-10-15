# Búsqueda acotada de gestión con balance fijo

## Cohorte de 14 noches iniciada tras sincronizar con `main`

`protocol-14-main-sync.json` fijó la ejecución nativa iniciada en el commit
`2fde4049`, con dos semillas de entrenamiento, una reserva de otro bioma y un
corte cooperativo de coste por campaña. **Su versión del runner aún ordenaba
genomas con `terminal-defeat-v2`**, diseñado para el cribado corto. Los
informes físicos de cada campaña se conservarán como evidencia, pero su
ranking no selecciona una política competente de 14 noches. Esta limitación
se detectó durante la primera campaña, antes de interpretar resultados.

Las búsquedas posteriores de al menos 14 noches requieren ahora
`post-intro-v2` y un umbral de entregas terminales fijado previamente con
controles nativos de entrenamiento y su fuente documentada. Esto impide que
las cinco noches introductorias o una explotación casi inactiva determinen
silenciosamente el ganador. No se alteró la campaña ya iniciada, sus genes ni
el balance de producción; su hash de fuente distingue ambos evaluadores.

`protocol-14-post-intro.json` congeló un segundo ensayo con el cuartil
inferior **82⅙ cajas/día** de los seis controles nativos de desarrollo
documentados en `post-intro-pilot-14/README.md` (también incluye las granjas
sin muros). Sus semillas de entrenamiento Sabana/712 y Gran Río/2026 difieren
de las usadas para fijar ese umbral; Manglares/24681357 queda reservado como
bioma y semilla no utilizados en aquella cohorte. El umbral clasifica
elegibilidad competitiva, nunca altera ingresos, cultivos ni resultados
nativos. Los gastos pagados y las entregas reales seguirán visibles también
para cualquier candidato excluido por baja producción.

Durante ese segundo ensayo se descubrió un contraejemplo del evaluador
`post-intro-v1`: sus términos secundarios podían variar más de 500 puntos y
colocar una derrota terminal por encima de una partida aún viva con las mismas
14 noches contabilizadas. Se conserva `v1` para interpretar las ejecuciones
ya iniciadas y se crea `post-intro-v2`, que aumenta **sólo en el fitness** la
penalización terminal total a 800 puntos. La amplitud máxima de los términos
secundarios es 650 puntos; así una derrota no supera a una superviviente del
mismo horizonte. `protocol-14-post-intro-v2.json` congela los mismos genes,
semillas, umbral y reglas físicas para una búsqueda posterior. No se lanzará
mientras las dos cohortes anteriores sigan ejecutándose; sus rankings son
exploratorios y deberán evaluarse con el criterio versionado antes de elegir
una política.

Para comprobar que cambiar el evaluador no cambió una campaña ya ejecutada,
`compare-native-campaigns.mjs` compara informes completos del mismo genoma y
escenario: economía diaria, cultivos, incursiones, política y defensa. Excluye
únicamente las duraciones de `wallTime`, afectadas por la concurrencia de
procesos. El hash obtenido prueba igualdad de **esos observables**, no de
todos los estados serializados, que estos informes no contienen.
El primer par Sabana/712 con el mismo genoma `4419e5eb34a46b9f` completó
14/14 jornadas en ambos procesos. Los 14 registros diarios y las 14
incursiones coinciden, así como economía, política y defensa: hash comparable
`aa4258d9d18be8c6d16f5dec28bd24bf70a8891c98836b9084576f4aa2725b0f`.
Los informes íntegros, sus hashes de fuente y el alcance de la comparación
están en `parity-sabana712-14.json`.

El segundo par del mismo genoma, Gran Río/2026, también completó 14/14 noches
en ambos procesos. Coinciden los 14 registros diarios y las 14 incursiones,
incluidas economía, política y defensa, con hash comparable
`cf360f31b71e6bd892100b17f143343031868408267ad60a0dcbd8d0700f7ac0`.
Al final conserva 126 cultivos y 1.010 monedas; esto sólo acredita
supervivencia del horizonte corto. Los informes nativos y la comparación están
en `parity-gran-rio2026-14.json`. Ninguno de los dos pares constituye una
victoria de 100 noches ni valida el ranking de fitness antiguo.

Otro genoma de la ejecución exploratoria, `f4967cb9f88e23dd`, también alcanzó
14/14 noches en Sabana/712, pero terminó con 26 plantas, 315 monedas y
23⅔ cajas/día en las tres jornadas finales. El umbral congelado de 82⅙ lo
clasifica como **producción colapsada**, no como derrota nativa. Su informe y
progreso originales se conservan; este resultado no autoriza a seleccionar la
política ni a alterar la presión militar.

El mismo genoma completó también 14/14 noches en Gran Río/2026, sin derrota
terminal, pero acabó con sólo siete cultivos y 141 monedas. Entregó cero cajas
en los días 11 y 12, 26 en el 13 y cuatro en el 14: diez cajas/día de media
terminal, muy por debajo del umbral. El ledger concilia en los 14 días. Esta
segunda observación refuerza el rechazo de la política por producción, sin
atribuir todavía el colapso a una causa concreta: la secuencia combina daños,
contratación y decisiones de gasto que requieren un análisis separado. El
informe y el progreso nativos se conservan en `results-14-main-sync/`.

La ejecución independiente con evaluador `post-intro-v1` completó después
ambos escenarios del mismo genoma. Su economía, cultivos, política, defensa,
14 jornadas y 14 incursiones coinciden con los informes del evaluador antiguo
en cada bioma tras excluir `wallTime`: hashes comparables
`216f3fbf29317c2c91f25209699b6efdddf516b1d323aad9ab93ee3de5919e93`
para Sabana y
`bae7800bd5b15e9258ac634764400e24e5422dce37af30d0836cf96661bed51d`
para Gran Río. `post-intro-v1` y `v2` lo clasifican como
`collapsed-production` en ambos casos. La evidencia está en
`parity-collapsed-genome-14.json`; no compara estados serializados íntegros.

Un tercer genoma exploratorio, `2db23cb3f5302cc9`, sufrió una **derrota nativa**
en Sabana/712 durante el día 7: completó seis noches y terminó con cero
cultivos y 37 monedas. El último ataque destruyó físicamente las dos plantas
que quedaban al generarse la incursión; hubo diez animales, 11 impactos contra
muralla y una estructura arruinada. Los siete registros diarios concilian con
el ledger. El resultado se guarda íntegro en `results-14-main-sync/`, sin
convertirlo en un fallo técnico ni proyectarlo a una tasa de derrota general.

El mismo genoma terminó derrotado en Gran Río/2026 en el registro del día 10,
con diez noches contabilizadas, cero cultivos y 15 monedas. Allí **ninguna
incursión destruyó cultivos** en los diez registros: el censo se agotó sin
atribuirlo a daño agrícola militar. Gastó 580 monedas en muros durante los
cinco días introductorios y 1.000 en muros a lo largo de la partida, frente a
690 en semillas; pagó además 942 en salarios y 143 en reparaciones. En Sabana
los ataques sí destruyeron diez cultivos, mientras el bot pagó 940 en muros.
Estos dos informes muestran que el genoma combina fragilidad económica con
exposición militar según el escenario. No demuestran por sí solos qué decisión
concreta dejó incompleto un recinto ni justifican cambiar el balance.

El segundo evaluador reprodujo también ambas derrotas del tercer genoma:
los siete registros diarios y de incursión de Sabana y los diez de Gran Río
coinciden con los resultados de la primera ejecución, salvo las duraciones
concurrentes. `parity-defeated-genome-14.json` conserva los hashes y enlaces
a los cuatro informes. El cambio de fitness no evitó, causó ni reinterpretó
las derrotas nativas.

El cuarto genoma exploratorio, `8a880102bbedf9b1`, completó 14/14 noches en
Sabana/712, con 47 cultivos vivos y 374 monedas, pero sus tres jornadas
finales entregaron 44⅓ cajas/día. También cae por debajo del umbral de
82⅙ fijado antes del ensayo. Gran Río/2026 también terminó 14/14, con 76
cultivos y 454 monedas, pero sólo 59 cajas/día de media terminal. En los
tres últimos días el margen operativo, antes de nuevos muros, fue negativo:
−240 monedas en Sabana y −241 en Gran Río. Ambos informes concilian con el
ledger y `post-intro-v2` los clasifica como `collapsed-production`, no como
derrotas nativas. El día 14 de Gran Río consumió 11,35 s de `Game.tick`,
por debajo del corte de 120 s/día, pero la trayectoria de coste debe revisarse
antes de ampliar a campañas largas. Los informes y progresos se conservan en
`results-14-main-sync/`.

La primera mutación del ensayo con evaluador `post-intro-v1`, genoma
`835711fac6025e72`, completó 14/14 noches en Sabana/712, con 27 cultivos y
223 monedas. Entregó 19⅓ cajas/día de media en las tres jornadas finales;
el evaluador versionado `post-intro-v2` la clasifica igualmente como
`collapsed-production`. El margen operativo terminal fue −82 monedas en
esas tres jornadas y todos los registros conciliaron con el ledger. Se
conserva el informe original de `v1` en `results-14-post-intro/`. Gran Río
del mismo genoma también completó 14/14 noches, pero terminó con 11 cultivos,
281 monedas y 22⅓ cajas/día de media terminal. La última incursión destruyó
25 cultivos. Había pagado 1.010 monedas en muros a lo largo de la partida;
ese gasto no certifica que el perímetro permaneciera cerrado. Los catorce
registros concilian con el ledger y ambos biomas quedan por debajo del umbral.

Otra mutación de la cohorte exploratoria, `6fa5250807e4d560`, eligió
`wallPolicy: none` en Sabana/712. Terminó viva tras 14 noches, con 38 plantas,
625 monedas y 74 cajas/día de media terminal, pero 384 cultivos destruidos y
un margen operativo terminal de −228 monedas. `post-intro-v2` la descarta por
producción insuficiente. El genoma con muros `4419e5eb34a46b9f` en esa
misma semilla acabó con 90 plantas, 631 monedas, 83 cajas/día y 134 pérdidas,
pagando 860 en muros y 642 en reparaciones. Esto no es un experimento causal
de muros: cambian también la siembra, la magia y otras decisiones. Sí impide
presentar la opción sin muros como óptima por mera supervivencia corta. El
informe nativo sin muros se conserva en `results-14-main-sync/`; su pareja de
Gran Río terminó también 14/14 noches: 34 cultivos vivos, 577 monedas,
76 cajas/día en las tres jornadas finales, 392 cultivos destruidos desde la
noche 6 y margen operativo terminal de −264 monedas. Todos los días concilian
con el ledger. La puntuación `post-intro-v2` la excluye por producción
colapsada; no equivale a derrota nativa ni permite atribuir causalidad a la
ausencia de muros, pues otros genes también difieren.

La siguiente mutación sin muros del segundo ensayo, `d131ef6cd76dc6ce`,
terminó Sabana/712 con 40 plantas y 682 monedas. Su producción terminal fue
84⅓ cajas/día, apenas por encima del umbral de 82⅙, pero su margen operativo
terminal fue −411 monedas y sufrió 425 pérdidas agrícolas desde la noche 6.
La incursión final destruyó 54 de las 94 plantas vivas al inicio del ataque.
El ledger concilia en los catorce días. `post-intro-v2` todavía la considera
elegible, lo que revela una limitación del **criterio de fitness**, no una
defensa de ignorar murallas como diseño óptimo. El informe original se conserva
en `results-14-post-intro/`. La pareja Gran Río/2026 terminó también 14/14
noches, con 28 plantas, 482 monedas y 68⅔ cajas/día de media terminal. Perdió
399 cultivos desde la noche 6 y cerró las tres jornadas finales con margen
operativo de −386 monedas.
El último ataque destruyó 49 de las 77 plantas presentes al iniciarse; el
ledger concilia todos los días. `post-intro-v2` la excluye por producción
colapsada. Los 118 de reparaciones registradas corresponden a gastos reales
del informe, pero el genoma no compró módulos de muralla; no se deben borrar
esos gastos ni describir esta finca como carente de toda reparación. En este
par de entrenamiento, la supervivencia del día 14 no aporta evidencia de una
política sin murallas sostenible.

Antes de seleccionar cualquier estrategia sin muros se necesita una ablación
emparejada: mismos genes agrícolas, semilla, bioma, magia y balance, variando
únicamente construcción/reparación de murallas y, por separado, Escudo. El
runner `run-matched-defense.mjs` ya permite ese control; las campañas nativas
históricas de Manglares/123 (`matched-defense-14/`) muestran ventaja defensiva
con otra versión de fuente, pero no sustituyen la prueba de esta cohorte.

El primer brazo de la ablación nueva (`matched-walls-current-magic`,
Sabana/712) terminó 14/14 noches sin error, con ledger conciliado en todos los
días: 90 cultivos vivos, 631 monedas, 83 cajas/día de media terminal,
134 cultivos destruidos desde la noche 6, 860 monedas en muros y 642 en
reparaciones. Sus observables diarios, incursiones, genes, política y defensa
coinciden exactamente con el informe `4419e5eb34a46b9f` de la ejecución
exploratoria tras excluir `wallTime` y el nombre de estrategia. Esto verifica
la equivalencia del brazo defendido, no la igualdad de estados serializados.
La configuración y el informe nativo comprimido están en
`matched-sabana712-14/`.

El segundo brazo emparejado (`matched-no-walls-current-magic`) terminó también
14/14 noches en Sabana/712, con los mismos genes agrícolas y Escudo. Frente al
brazo con muros, conservó 44 en vez de 90 cultivos, perdió 379 en vez de 134
desde la noche 6 y cerró con 619 en vez de 631 monedas. Entregó 80⅓ frente
a 83 cajas/día de media terminal y su margen operativo terminal fue −236
frente a +11. Los ingresos totales fueron 16.641 frente a 17.756 monedas;
el brazo con muros había pagado 860 en construcción y 642 en reparaciones,
mientras el control no gastó en esos conceptos. Ambos ledgers concilian.
La diferencia observada es de 245 pérdidas agrícolas menos con muros en esta
única semilla. La presión varió después de divergir el tamaño de las fincas,
según la misma regla militar para ambos brazos; el resultado es una comparación
de políticas completas, no una tasa física de interceptación aislada.

El tercer brazo (`matched-no-defense-current-magic`) terminó en **derrota
nativa** al amanecer del día 13, con doce noches contabilizadas, 30 cultivos
y 650 monedas. No tuvo murallas ni Escudo; desde la noche 6 perdió 345
cultivos (363 incluyendo la introducción). La incursión final registró ocho
golpes a centro, 176 HP estructurales perdidos, una estructura arruinada y 46
cultivos destruidos. Con el centro arruinado, `dawnMinimum` exige 800 monedas
para otro centro y 100 de reserva de contratación; las 650 disponibles no
alcanzaban. La derrota corresponde a la regla nativa de solvencia tras daños
físicos, no a un corte técnico ni a una eliminación sintética de plantas.
Sus trece filas económicas concilian. El informe nativo, progreso y resumen
final están en `matched-sabana712-14/`. La comparación completa favorece
defender en esta semilla, mientras que el resultado de 100 noches y la
generalización entre biomas siguen sin probarse.

El mismo genoma defendido `4419e5eb34a46b9f` completó también 14/14 noches
en Manglares con dos semillas. Con la 123 terminó con 121 cultivos, 911
monedas, 117⅓ cajas/día de media terminal, margen operativo terminal de +186
y 45 pérdidas desde la noche 6. Con la semilla reservada 24681357 terminó
con 129 cultivos, 861 monedas, 118 cajas/día, margen operativo terminal de
+72 y 15 pérdidas. Ambos informes concilian con el ledger y conservan los
mismos genes y reglas físicas; los originales están en `results-14-main-sync/`
y `results-14-post-intro/`, respectivamente. La semilla 123 ya aparecía en
ensayos de desarrollo previos y no cuenta como validación no vista. La 24681357
sí pertenece a la reserva congelada de esta cohorte, pero un solo bioma y 14
noches no acreditan supervivencia prolongada ni eficacia causal de muros.

El control `good-current-magic` de Manglares/123 completó también 14/14 con
el mismo balance y semilla: 120 cultivos, 837 monedas, 103⅔ cajas/día
terminales, margen operativo terminal de +185 y 65 pérdidas desde la noche 6.
Frente a él, `4419e5eb34a46b9f` conservó una planta más, 74 monedas más,
entregó 13⅔ cajas/día adicionales y perdió 20 cultivos menos, pero pagó más
semillas y salarios por su propia expansión. Ambos ledgers concilian. El
control original se conserva en `results-14-main-sync/`; la diferencia en
esta semilla de desarrollo no demuestra superioridad estadística ni
supervivencia a 100 noches.

El control de la semilla reservada Manglares/24681357 terminó después 14/14:
94 cultivos, 846 monedas, 99⅓ cajas/día terminales, margen operativo
terminal de +223 y 65 pérdidas desde la noche 6. El genoma `4419…` tuvo 129
cultivos, 861 monedas, 118 cajas/día, margen +72 y 15 pérdidas. Ambos
ledgers concilian. La política evolucionada conservó 35 plantas más y perdió
50 menos, pero su margen operativo terminal fue 151 monedas inferior por la
expansión y los gastos correspondientes; no se debe presentar como ventaja
en todas las métricas. Los informes de ambas políticas están en
`results-14-post-intro/`. Esta es una reserva de una sola semilla y catorce
noches; apoya continuar pruebas, no elegir aún una política definitiva ni
modificar los parámetros militares.

Esta cohorte usa Wild Engine y el balance de producción sin alterar, después de
la mejora de navegación de PR #37. Código ejecutado: `7f358aad97287b40e300026306d26f05cc4e0c29`;
el registro de siete noches guarda además SHA-256 de los módulos y del diff en
`results-7/config-569680ef8525.json`. Los catorce informes nativos de `results-7`
se conservan byte a byte en `results-7/reports-bundle.json.gz`; `results-7/archive-index.json`
registra nombres, tamaños y SHA-256 originales. Se recuperan mediante
`node tools/evolutionary-balance/archive-native-reports.mjs docs/qa/evolutionary-balance/management-search/results-7 <destino>`.
Las campañas anteriores de Sabana en
este laboratorio pertenecen a otro hash y no se agregan a esta cohorte.

## Protocolo

- `input-7.json`: dos generaciones, población tres, cuatro genomas **únicos**
  evaluados en total. Entrenamiento Sabana/712 y Gran Río/2026; reserva
  Manglares/123, disjunta por bioma y semilla. Los tres primeros genomas cambian
  contratación, reservas, siembra y defensa; la segunda generación produjo una
  mutación única y duplicó el genoma élite. Los genes de magia siguen siendo
  decisiones del jugador, con las reglas vigentes de `Game.cast`.
- En la reserva se ejecutaron líder y `good-current-magic`, `good`, `expansive`,
  `bad`, `no-walls` con la misma semilla y balance. El control de paridad mágica
  es `good-current-magic`; los demás conservan el calendario legado de magia y
  sólo describen políticas históricas. Ninguna estrategia recibió recursos ni
  daño adaptado a su identidad.
- `protocol-14.json` deja definida una búsqueda posterior, **no ejecutada**.
  `paired-14-manglares-123.json` sí ejecutó sólo el líder y el control de paridad
  durante catorce noches, sin evolución adicional. Los informes detallados,
progreso diario y ledger están en `paired-14-manglares-123/`.
Los dos informes detallados de esa cohorte se archivaron sin pérdida como
`.json.gz` para mantener revisable el diff de la PR; `archive-index.json`
registra tamaños y SHA-256 antes y después de comprimir. `run-paired.mjs` y
`plot-run.mjs` leen esos archivos comprimidos.

| Entrenamiento, 7 noches | Sabana/712 | Gran Río/2026 | Lectura |
|---|---:|---:|---|
| Genoma inicial `eee9529b306e0091` | 7; 1.226 monedas; 120 plantas | 7; 1.180; 116 | Líder corto |
| Más reserva salarial y defensiva `7aa799d914f0f081` | Derrota nativa noche 4; 17 plantas | Derrota nativa noche 4; 19 plantas | Reserva excesiva impidió sostener la explotación |
| Defensa más intensa `ec50fa2e6501922c` | Derrota nativa noche 6; 0 plantas | Derrota nativa noche 7; 11 plantas | Coste de oportunidad grave |
| Descendiente `2071feb50044f2e1` | 7; 805; 73 | 7; 646; 68 | Sobrevive el piloto, con menos producción y caja |

Todas son campañas reales, no proyecciones. La puntuación usada **durante** la
búsqueda era `survival-v1`; una derrota justo después de la noche 7 retenía el
término de supervivencia de 7.000 puntos. El cambio posterior
`terminal-defeat-v2` resta 500 puntos a cualquier derrota nativa: el genoma
`ec50…` pasa de 6.009,3 a 5.509,3 como peor caso, y `7aa…` de 4.010,4 a
3.510,4. El líder y la reserva no cambian de orden. Los JSON originales y su
ranking `v1` permanecen intactos; la mejora del evaluador afecta sólo a
búsquedas futuras. También se evita ahora generar duplicados en la siguiente
generación. No se ha reinterpretado ninguna derrota como error técnico.

## Reserva de siete noches

Los seis brazos completaron 7/7 noches, sin victoria ni derrota terminal y sin
errores de ledger. La supervivencia, por tanto, **no discrimina** aún.

| Política | Caja | Cultivos vivos | Cajas entregadas | Cultivos destruidos | Muros pagados | Reparaciones |
|---|---:|---:|---:|---:|---:|---:|
| Líder | 953 | 120 | 653 | 0 | 610 | 60 |
| `good-current-magic` | 721 | 129 | 675 | 2 | 740 | 62 |
| `good` legado | 774 | 107 | 553 | 0 | 410 | 44 |
| `expansive` legado | 519 | 166 | 576 | 6 | 410 | 15 |
| `bad` legado | 639 | 126 | 586 | 46 | 0 | 0 |
| `no-walls` legado | 549 | 146 | 573 | 25 | 0 | 0 |

El líder acumula más caja que los controles, pero `good-current-magic` y
`expansive` conservan más cultivos. Las pérdidas de `bad` y `no-walls` muestran
presión física real en esta semilla; no certifican cuánto de la finca amurallada
estaba en un recinto cerrado. `wallHits`, compra de módulos y reparaciones son
observaciones de contacto y gasto, no medidas de protección topológica.

## Reserva emparejada de catorce noches

Mismo bioma, semilla, reglas y versión del motor; el líder no se ajustó tras ver
el resultado de siete noches. Ambas partidas acabaron 14/14, sin victoria ni
derrota terminal, y todos los días conciliaron exactamente con el ledger.

| Política | Caja día 14 | Plantas vivas | Cajas entregadas | Ingresos | Semillas | Salarios | Muros | Reparaciones | Plantas destruidas | `Game.tick` acumulado |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Líder | 905 | 167 | 1.520 | 18.234 | 8.460 | 8.084 | 900 | 585 | 5 | 139,8 s |
| `good-current-magic` | 980 | 99 | 1.509 | 18.114 | 8.290 | 7.940 | 900 | 704 | 50 | 88,1 s |

Las incursiones generaron 136 y 135 animales, respectivamente; son resultados
de la misma regla militar, pero la atracción agrícola diverge con cada política.
El menor número de plantas perdidas del líder es prometedor en esta partida,
aunque termina con 75 monedas menos. No prueba ventaja general, ni rentabilidad
hasta la noche 100, ni cierre de recinto. El coste computacional del líder es
además mayor y debe explicarse antes de ampliar la batería.

## Pico de rendimiento y límites

`capture-manglares-123-day10.json` reproduce el líder y guarda estados nativos
de amanecer e incursión. En un replay de 50 ticks del estado de incursión con
cuatro chunks de radio residente se observaron 7,69 s de `Game.tick`, incluidos
3,76 s del primer tick frío; 11.500 `workerPath` (2,73 s), nueve `path`
(3,57 s), cero `approachPath`, 350 selecciones de animales y 197 eventos
`AnimalTargetUnavailable`. El replay con radio uno terminó en
`SpatialChunkUnavailable` por residencia insuficiente: **fallo de perfilado**,
no derrota del juego. El informe válido está archivado sin pérdida en
`profile-50ticks-radius4.json.gz`, con hash del original y del archivo en
`profile-manglares-123-day10/archive-index.json`.

El coste diario real del líder saltó a 17,8/28,7/26,8/32,4 s de `Game.tick`
entre los días 9–12. El control también alcanzó 29,3 s el día 10. Estos datos
apuntan a un cuello de navegación residual que no se debe atribuir únicamente
al genoma; el primer tick frío del replay tampoco representa una jornada
continua. Se requiere perfil de trabajadores y conectividad antes de campañas
de 30 o 100 noches. La instrumentación de recintos debe muestrearse por evento
topológico y conservar `unknown` como categoría separada; no debe usarse aún
para puntuar defensas.

El observador QA de Wild Engine, incorporado después de las campañas sin
modificar sus resultados, clasificó el snapshot **real** del inicio de la
incursión del día 10 del líder. De 143 cultivos vivos, certificó 124 protegidos
frente a jabalí y búfalo y 128 frente a hiena; dejó 19, 19 y 15 como
`unknown`, respectivamente. No registró cultivos abiertos o expuestos en ese
instante. El snapshot emparejado del control, también al empezar su incursión
del día 10, tenía 124 cultivos: 108 protegidos y 16 `unknown` frente a
jabalí/búfalo; 111 protegidos y 13 `unknown` frente a hiena. El porcentaje
certificado es prácticamente igual: 86,7 % del líder frente a 87,1 % del
control para jabalí/búfalo; hiena 89,5 % en ambos. Los animales empezaron a
atacar en distintos instantes del día por las diferencias legítimas de cada
partida, de modo que esto es una comparación de estado topológico y no de
posición temporal idéntica. La mayoría de ambas fincas sí pertenece a un
recinto cerrado al inicio de esa incursión. **El cierre inicial no explica por
sí solo las 5 frente a 50 pérdidas**; faltan brechas, tiempo de exposición,
selección de objetivos y estado de noches posteriores. La muestra del líder
fría tardó 1,20 s; cinco repeticiones calientes, 18–25 ms cada una con 143
cultivos y 21 chunks residentes. La del control tardó 1,57 s fría y 24–34 ms
caliente, con los mismos 21 chunks residentes. Los detalles están en los
directorios `profile-manglares-123-day10/` y
`profile-control-manglares-123-day10/`. Su coste aconseja
muestrear por evento de topología, nunca cada tick; `unknown` no recibe crédito
defensivo.

`replay-enclosure-raid.mjs` llevó ambos snapshots del día 10 hasta terminar
la incursión con y sin observador. En cada brazo, el SHA-256 del estado final
serializado fue **idéntico entre los dos pases**, por lo que la observación no
alteró estado persistente ni RNG del replay. En ambos aparecieron aperturas
topológicas tras perder módulos: 13 piezas en el líder, ocho en el control,
y los cultivos inicialmente protegidos terminaron clasificados como abiertos.
Sin embargo, el replay reconstruye residencia y navegación derivada a partir
del guardado: el líder perdió dos cultivos en el replay y **cero en la campaña
continua** de ese día; el control perdió cero en ambos. Por ello, la secuencia
de brechas y las bajas del replay **no son una reconstrucción exacta de la
campaña**, ni prueban la causa de las 5 frente a 50 pérdidas finales. Se
conservan ambos informes como QA de topología y de invarianza del observador,
con SHA de cada snapshot. Para atribuir eficacia defensiva hará falta observar
la campaña nativa continua por eventos, con su residencia original.

Conclusión provisional: hay una política que sobrevive mejor que el control en
esta única reserva de catorce noches, pero **no hay estrategia competitiva
generalizable demostrada**. El modelo de destrucción agrícola de Fase 1 sigue
siendo demasiado impreciso para filtrar parámetros militares.

## Control histórico de gestión en la búsqueda actual

La búsqueda de catorce noches sincronizada con `main` terminó también el brazo
`good` de Manglares/123. Sobrevivió 14/14 noches con 106 cultivos, 807 monedas,
40 plantas perdidas desde la noche 6, 114⅓ cajas/día en las tres jornadas
finales y margen operativo terminal de +184. El genoma `4419e5eb34a46b9f`
en el mismo escenario terminó con 121 cultivos, 911 monedas, 45 pérdidas,
117⅓ cajas/día y margen +186. Ambos ledgers concilian. `good` conserva la
política mágica histórica y **no** es el control con las reglas mágicas actuales;
este último está registrado aparte como `good-current-magic`. Las diferencias
de cinco pérdidas a favor de `good` tampoco prueban superioridad militar o
económica general: las fincas evolucionaron de forma distinta bajo la misma
regla de presión. El informe nativo está en
`results-14-main-sync/712f0156ff37-good-manglares-123-14.json`.

El mismo control histórico terminó la reserva Manglares/24681357 con 99
cultivos, 782 monedas, 102 pérdidas desde la noche 6, 87 cajas/día terminales
y margen operativo de −41. Sus catorce filas concilian. En esa semilla,
`good-current-magic` terminó con 94 cultivos, 846 monedas, 65 pérdidas,
99⅓ cajas/día y margen +223; el genoma evolucionado con magia actual terminó
con 129/861, 15 pérdidas, 118 cajas/día y margen +72. La divergencia entre
semillas confirma que el brazo histórico no debe reemplazar al control de
magias actuales ni justificar una selección por una sola reserva. Informe:
`results-14-post-intro/deb7ec2b4ed1-good-manglares-24681357-14.json`.

El control histórico `expansive` en Manglares/24681357 también completó 14/14
noches, pero terminó con 83 cultivos, 313 monedas, 147 pérdidas desde la noche
6, 46⅔ cajas/día terminales y margen operativo de −118. El ledger concilia;
`post-intro-v2` lo clasifica como producción colapsada por quedar bajo el
umbral congelado de 82⅙ cajas/día. Esto es supervivencia física de 14 noches,
no una política solvente acreditada ni una derrota nativa. Usa la magia
histórica y no debe confundirse con una prueba de expansión bajo la magia
actual. Informe: `results-14-post-intro/deb7ec2b4ed1-expansive-manglares-24681357-14.json`.

En la semilla de desarrollo Manglares/123, el mismo control `expansive`
completó 14/14 noches con sólo 23 cultivos vivos, 574 monedas, 162 pérdidas
desde la noche 6 y 54⅓ cajas/día terminales. Su margen operativo de los tres
últimos días fue +86, pero la producción quedó igualmente por debajo del
umbral congelado; no se declara estrategia sostenible. Las catorce filas
concilian. Informe:
`results-14-main-sync/712f0156ff37-expansive-manglares-123-14.json`.

El control histórico `bad` de Manglares/123 sufrió **derrota nativa** al
amanecer del día 14: completó 13 noches, terminó con una planta viva y 61
monedas. Desde la noche 6 perdió 356 plantas; las últimas tres jornadas
entregaron 19⅔ cajas/día y dejaron margen operativo de −348. Todas sus filas
económicas concilian. Esta derrota no es un paro computacional ni un criterio
de fitness que haya terminado artificialmente la partida. Informe:
`results-14-main-sync/712f0156ff37-bad-manglares-123-14.json`.
