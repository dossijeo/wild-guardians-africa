# Búsqueda acotada de gestión con balance fijo

Esta cohorte usa Wild Engine y el balance de producción sin alterar, después de
la mejora de navegación de PR #37. Código ejecutado: `7f358aad97287b40e300026306d26f05cc4e0c29`;
el registro de siete noches guarda además SHA-256 de los módulos y del diff en
`results-7/config-569680ef8525.json`. Las campañas anteriores de Sabana en
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
no derrota del juego. El informe válido es `profile-50ticks-radius4.json`.

El coste diario real del líder saltó a 17,8/28,7/26,8/32,4 s de `Game.tick`
entre los días 9–12. El control también alcanzó 29,3 s el día 10. Estos datos
apuntan a un cuello de navegación residual que no se debe atribuir únicamente
al genoma; el primer tick frío del replay tampoco representa una jornada
continua. Se requiere perfil de trabajadores y conectividad antes de campañas
de 30 o 100 noches. La instrumentación de recintos debe muestrearse por evento
topológico y conservar `unknown` como categoría separada; no debe usarse aún
para puntuar defensas.

Conclusión provisional: hay una política que sobrevive mejor que el control en
esta única reserva de catorce noches, pero **no hay estrategia competitiva
generalizable demostrada**. El modelo de destrucción agrícola de Fase 1 sigue
siendo demasiado impreciso para filtrar parámetros militares.
