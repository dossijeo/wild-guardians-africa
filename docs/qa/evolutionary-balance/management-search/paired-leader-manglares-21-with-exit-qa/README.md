# Manglares/123: campaña pareada de 21 noches con salida nativa corregida

Prueba de integración aislada, rama `codex/balance-exit-integration-qa`, fuente `d90de92d808bda311be51cf21cb6d0a3c7fbe19e`: política y balance congelados de `codex/evolutionary-balance-lab` más el arreglo técnico de retirada de la PR #48. La configuración, hashes de módulos, progreso diario y reportes nativos completos están en este directorio. No es una prueba de victoria de 100 noches ni un cambio de balance.

| Estrategia | Noches completadas | Monedas día 21 | Cultivos día 21 | Cultivos destruidos | Murallas pagadas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Evolucionada | 21 | 451 | 58 | 226 | 90 piezas / 900 monedas |
| `good-current-magic` | 21 | 722 | 105 | 203 | 90 piezas / 900 monedas |

La estrategia evolucionada reprodujo 121 cultivos y 911 monedas en la jornada 14 y 115/874 en la 16, iguales que antes del fallo técnico. Esta vez la incursión 17 terminó y la campaña avanzó. La misma semilla no demuestra que el líder sea superior: el control acabó con más cultivos y capital. En la noche 17, la estrategia evolucionada perdió 70 cultivos y recibió cero golpes en murallas; en la 20 perdió 53 y tampoco hubo golpes en murallas. El control tuvo otro gran ataque en la noche 10 (52 cultivos, cero golpes en murallas). Estos daños procedieron de golpes físicos reales, no de una pérdida sintética.

El snapshot original del fallo técnico, capturado cerca del final de la noche 17, conserva 78 piezas de muralla y 66 cultivos vivos. `inspect-day17-enclosure.mjs` lo rehidrata y consulta a Wild Engine con 24 chunks residentes. `day17-enclosure.json` registra **cero cultivos certificados como protegidos** para facóquero, hiena y búfalo; 55–57 estaban en regiones abiertas y 9–11 no pudieron clasificarse concluyentemente. Es una muestra puntual de la topología tras el ataque, no una certificación de la posición de cada cultivo al principio de la noche. No respalda la hipótesis de que 90 compras de muralla hayan cerrado un recinto eficaz.

La política `native-expanding-defense-policy.mjs` construye trazos rectangulares y documenta huecos causados por árboles, rocas, agua y edificios; no garantiza un perímetro físicamente cerrado. El siguiente paso para la búsqueda evolutiva es probar un planificador de defensa capaz de cerrar o desviar esos huecos y medir protección real con Wild Engine **antes** de interpretar estas pérdidas como una necesidad de bajar el daño militar. Mantener congelados los informes de esta cohorte permite comparar políticas nuevas con el mismo balance sin reescribir resultados históricos.
