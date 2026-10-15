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
