# Selección de hordas sin materializar todas las combinaciones

El índice cuenta subárboles de composiciones y selecciona por rango en el mismo orden de la enumeración anterior. Usa una extracción RNG para el rango, igual que antes; no cambia presupuesto, especies, probabilidades, daño ni precios. La enumeración original sigue disponible como referencia para QA.

Validación: comparación de cada rango para las31 combinaciones no vacías de especies y presupuestos1–24, equivalencia de planes nocturnos/estado RNG, conteos exactos a72/132, regresión de incursiones diurnas y reglas introductorias.127/127 pruebas dirigidas PASS; build9,13s. El primer ensayo detectó un oráculo antiguo que imponía cinco animales y caps por especie: se actualizó a la retirada de esos límites ya autorizada e implementada en5f0a0d80, manteniendo una tabla independiente del código de producción.

Benchmark reproducible: `node --expose-gc tools/benchmark-raid-composition-index.mjs docs/qa/native-economic-balance/composition-index-recheck`. Ocho pares AB/BA, GC antes de cada muestra; cifras medianas, Node local. Los deltas de heap incluyen asignaciones temporales, no miden pico total de aplicación, GPU ni VRAM.

| Presupuesto | Combinaciones | Enumeración CPU | Índice CPU | Enumeración delta heap | Índice delta heap |
|---|---:|---:|---:|---:|---:|
|14|58|0,156ms|0,096ms|113.616B|266.108B|
|72|25.537|23,766ms|1,375ms|14.651.660B|276.348B|

En presupuesto pequeño no hay ahorro de asignaciones medido: el índice asignó más memoria temporal. El beneficio relevante es evitar la explosión de arrays cuando sube la presión; no se afirma una mejora del frametime del juego. Las campañas económicas y entradas físicas de hordas mayores siguen pendientes.
