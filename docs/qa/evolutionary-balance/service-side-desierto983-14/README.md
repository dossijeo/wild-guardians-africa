# Desierto/983: candidata de murallas por lado accesible (rechazada)

Esta prueba comparó dos políticas del jugador virtual sobre la misma versión
`d66858a1`, semilla, bioma, economía, magias y presión militar. `planned` es la
política congelada; `service-side` compraba segmentos individuales sólo cuando
Wild Engine encontraba conexión desde un centro operativo hasta uno de sus
lados **antes** de construir. Los informes nativos completos, los recibos por
jornada, la configuración y el código fuente identificado por hash están en
este directorio. La candidata fue retirada de la cabeza de la rama tras el
resultado negativo; el commit experimental sigue en el historial.

| Política | Noches completadas | Saldo final | Cultivos vivos | Muros pagados | Entregas días 7–8 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `planned` | 14/14 | 1.082 | 143 | 68 | 76 y 96 |
| `service-side` | derrota al amanecer tras 8 | 8 | 88 | 22 | 0 y 0 |

La derrota de `service-side` fue insolvencia al amanecer, no destrucción
agrícola. Su libro mayor concilió cada jornada. Hubo cero golpes a murallas y
cero cultivos destruidos en las incursiones de los días 6–8. La observación
directa de los días 7–8 registró 17 trabajadores inmóviles en estado `fleeing`
y hasta 15 nuevos trabajadores en estado `arriving`, sin entregas. El centro
seguía intacto con 600 HP; los 88 cultivos seguían vivos. Los 22 segmentos
habían formado una barrera oeste entre el poblado (entrada x=60,z=0) y la
plantación/centro (x=83,z=0), pero **ninguno era puerta automática**. Para seis
trabajadores muestreados, `workerPath` devolvió `null` y la conectividad
nativa al poblado fue `false`. Las posiciones y estados están en
`service-side-day7-diagnostic.json.gz`; las observaciones periódicas de ambas
jornadas están en `service-side-deadlock.json.gz`.

Esto prueba que la política de segmentos individuales es insegura y que su
comprobación previa de un lado no garantiza conservar la salida después de
construir. También expone un caso de cierre gradual donde el motor no creó
puerta; requiere una regresión específica de construcción por tramos y una
corrección del motor antes de ensayar de nuevo esta política. No se cambia el
balance, no se atribuye el resultado a la fuerza de las hordas y no se usa
esta candidata para entrenar el algoritmo evolutivo.

Reproducir con el código `d66858a1` y el `config.json` archivado mediante
`node tools/evolutionary-balance/run-post-intro-pilot.mjs <config>` desde la
raíz del repositorio. Los dos informes `.json.gz` se pueden descomprimir como
JSON; `summary.json` conserva la clasificación de cada brazo.
