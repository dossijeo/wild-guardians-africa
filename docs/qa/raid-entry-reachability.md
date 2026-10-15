# Entrada de oleadas grandes: Desierto/983, noche 6

La primera oleada de ocho animales aparecía en el borde del área activa. En
la campaña nativa original, los ocho esperaron unos 90 segundos y se retiraron
con todos sus golpes; no hubo contactos. El selector de entrada exigía que
toda la formación cupiera en una única zona cercana a la finca. Al fallar,
aceptaba una formación lejana con una prueba local de spawn→salida de tres
metros, sin certificar acceso a un objetivo. El mismo patrón se observó en
las noches 6–10 del control sin murallas de Desierto/983 archivado en la PR
#36. Se trata de selección física de entrada, no de un precio o daño mal
calibrado.

El cambio conserva el grupo entero y sus presupuestos. Para una formación
grande, intenta puntos alrededor del centro agrícola, fuera del área ocupada
por sus cultivos. Cada punto y su salida se validan con transitabilidad y
colisiones nativas, separación entre animales, testimonio de exterior cuando
hay murallas y conectividad del grafo Wild Engine hacia el centro o una cara
atacable de muro. Si no puede certificar el grupo completo, sigue disponible
la selección exterior existente. Los animales continúan desplazándose y
atacando mediante las reglas ordinarias; no reciben impactos instantáneos ni
atraviesan obstáculos.

La captura congelada `tests/fixtures/desierto983-d6-no-walls-raid.json.gz`
proviene del piloto nativo con fuente `20ae0954`; SHA-256 comprimido
`0c978e5ecaee185778a5a07074b6f337929799a3bf92a3b67a43bf584a15490f`.
La comparación AB/BA en el mismo estado, después de calentar el JIT y el
grafo, está en `tools/experiments/benchmark-raid-entry-reachability.mjs`:

| Selector | Mediana de 4 entradas | Animales del grupo | Conexión al cultivo testigo |
| --- | ---: | ---: | ---: |
| `main` `1a1e6df4` | 41,5 ms | 8 | 0 accesibles; 8 `unknown` |
| Candidato | 41,2 ms | 8 | 8 accesibles |

El test de integración restaura la captura, vuelve a elegir la entrada,
comprueba que los ocho puntos están fuera de los cultivos y separados,
confirma que la selección no cambia RNG/estado y ejecuta 130 ticks nativos.
En esa reproducción los ocho animales agotaron físicamente sus golpes,
realizaron 29 impactos agrícolas y ninguno generó `AnimalTargetUnavailable`.
La campaña original registró cero impactos y ocho retiradas por espera. Las
pruebas de entradas exteriores, formaciones de 32/72 animales y Gran Cañón
también pasan.

Validación automatizada: `npm run test:playable` (186/186), `npm run build` y
las pruebas de entrada exterior, residencia y Gran Cañón. La build web conserva
la advertencia previa de Vite sobre el tamaño del chunk principal.

Esta reproducción prueba un fallo concreto de Desierto sin muros. No mide aún
la eficacia defensiva en un perímetro cerrado ni demuestra una curva de
supervivencia equilibrada; la selección de objetivos tras entrar y las
campañas completas siguen siendo verificaciones separadas. Tampoco sustituye
una medición física en móviles. La rama permanece experimental para revisar
el cambio de presión real que implica eliminar oleadas inactivas.

Un [piloto posterior de 14 noches](raid-entry-reachability/campaign-desierto983/README.md)
con políticas amurallada y sin murallas sobre la misma semilla confirma ese
cambio de presión: ambos brazos terminan en derrota nativa durante el día 13;
los muros interceptan impactos y reducen pérdidas, pero no sostienen la finca
en esta política. La PR permanece experimental mientras se revisan recintos
cerrados y más escenarios.

En un [segundo piloto Sabana/712](raid-entry-reachability/campaign-sabana712/README.md),
la finca amurallada completó 14 noches con 33 bajas agrícolas desde la 6,
mientras el control sin murallas perdió 268 cultivos y cayó durante el día 12.
Los dos resultados, incluido el negativo de Desierto, se conservan sin
seleccionar sólo la semilla favorable.

La regresión de Gran Cañón construye un recinto de 40 módulos, coloca 40
cultivos y lanza una oleada completa de 16 facóqueros con Wild Engine. Los
16 nacen físicamente fuera; durante la incursión se registran 24 impactos
contra murallas, ningún impacto agrícola y finalización normal. El test
observa los eventos en cada tick porque el anillo de eventos descarta los
antiguos: inspeccionar sólo su contenido final había producido inicialmente
un falso diagnóstico de ausencia de golpes.

Otra regresión prepara una finca con ocho cultivos y solicita una formación
mixta de 16 animales en los seis biomas con el núcleo espacial nativo. En
todos se obtiene la formación completa, con posiciones exteriores, separadas,
salida local transitable y conectividad Wild Engine demostrada hacia el
acceso del centro para cada perfil físico. Es una prueba de entrada, no de
eficacia militar ni de rendimiento sostenido; la preparación de la entrada
en la aplicación usa el trabajador dedicado existente.

La revisión del diff eliminó una exploración del historial completo de
plantas en la búsqueda de entradas próximas. El encuadre de cultivos usa
ahora `activeCrops`, cuyo índice conserva sólo las plantas vivas; las bajas
históricas no incrementan ese recorrido. Tras el cambio pasaron las nueve
pruebas focales de índice y entrada, los 186 contratos jugables y el replay
congelado de Desierto mantuvo ocho de ocho entradas conectadas.
