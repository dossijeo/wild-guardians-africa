# f-R4: localizar y reducir la espera del relevo preparado

14 de noviembre de 2026. Continúa la [instalación de terreno preparado](f-r4-native-prepared-terrain-20261114.md).
**f-R4 y A6 siguen abiertos.** Se mide el camino posterior al commit físico;
el primer dibujo todavía llega demasiado tarde para acreditar continuidad.

## Investigación y decisión

Antes del cambio se leyeron las fuentes de
[Node v22.21.1, internal/util/comparisons.js](https://github.com/nodejs/node/blob/v22.21.1/lib/internal/util/comparisons.js)
y [fast-deep-equal v3.1.3, src/index.jst](https://github.com/epoberezkin/fast-deep-equal/blob/v3.1.3/src/index.jst).
Node compara vistas binarias a través de su primitiva nativa de buffers;
fast-deep-equal recorre las vistas con un bucle directo y salida temprana.
La primitiva de Node no existe en el navegador. Se adapta solamente el recorrido
directo al comparador existente de Wild Guardians, sobre **bytes**, manteniendo
constructor, longitud y límites de la vista. No se adopta la igualdad numérica
de floats de la biblioteca, que perdería diferencias de bits relevantes.

El callback por byte de `Uint8Array.every` se sustituye por ese bucle. Se mantienen
todas las comprobaciones de propuesta, staging, publicación y recepción, las
copias propias y los rechazos de datos alterados. No hay hashes, dependencias,
flags de confianza, otro canal ni cambios de autoridad. Es una corrección del
coste observado dentro de la frontera crítica de f-R4; no la aceptación D.

## Medición del camino real

El harness registra las fronteras de staging del payload confirmado, armado de
propuesta, liberación del control nativo, publicación, entrega, activación y
primer render. Solo se añaden relojes al harness; el producto no recibe hooks
de diagnóstico. El primer dibujo y los intervalos nativos proceden del draw
Worker real, como en el incremento anterior.

[Recibo anterior](performance/prepared-handoff-before-20261114.json) y
[recibo posterior](performance/prepared-handoff-after-20261114.json), mismo
harness NVIDIA, seis mutaciones, trabajador estacionario a tiempo nativo 10:

| Restauración del terreno (nueve chunks revisados) | Antes | Después |
| --- | ---: | ---: |
| Staging confirmado | 11,6 ms | 2,3 ms |
| Armado de propuesta | 23,0 ms | 3,6 ms |
| Publicación de terreno | 11,4 ms | 1,7 ms |
| Activación gráfica | 44,6 ms | 43,6 ms |
| Drenaje → primer dibujo nuevo | 176,1 ms | 104,9 ms |
| Intervalo máximo entre dibujos nativos | 199,9 ms | 132,1 ms |

Son dos ejecuciones dirigidas, no percentiles ni latencia máxima del producto.
Los tiempos agregados también incluyen variación de entrega y pacing. La
activación sigue costando unos 44 ms: la mejora del comparador no resuelve ese
trabajo ni el primer render/entrega. No se declara ausencia de tirones.

En ambos recibos se conservan meshes, materiales, buffers y texturas intactos,
sin regenerar recetas en el commit, sin forks/errores GPU, con el mismo dispositivo
y cierre/drenaje verificados. Las alturas admitidas coinciden con el payload
nativo. Bloquear 500 ms el preparador todavía deja 15 dibujos del mundo anterior
sin efecto físico; ese personaje no camina durante la prueba.

## Validación y siguiente bloqueo

Tres casos nuevos protegen el contrato exacto: vistas con offsets/prefijos/sufijos
distintos y corrupción interior/extremos, signed zero/NaN con bits diferentes,
constructor, metadatos canónicos y copias propias. También pasan las pruebas de
rechazo del canal ante payload confirmado o publicación en tránsito alterados.
Selección dirigida: **57 casos** sin fallos/skips.

Selección amplia: **966 pruebas en 84 archivos**, concurrencia 2, sin fallos ni
skips: `.cache/native-prepared-handoff-regression.tap` y
`.cache/native-prepared-handoff-selection.json`. Sintaxis del módulo y harness
comprobada. Build WebGPU/remote draw aprobado en 44.02s, con las advertencias
habituales de tamaño de chunks: `.cache/native-prepared-handoff-build.log`.
El siguiente punto es localizar el trabajo de validación/activación que permanece
dentro de los propietarios gráficos existentes, investigando sus equivalentes
consolidados antes de modificar el mecanismo. Autoridad ordinaria, personajes,
intenciones y aceptación A–F/B/C siguen pendientes; no se retiran protecciones.
