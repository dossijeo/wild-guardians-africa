# Fence de uploads retenidos en generaciones no publicadas — 2026-11-19

Continúa `3a303d390`, A4/e-R3/f-R4 y la recuperación incremental pendiente. El fence existente solo admitía buffers con sombra de uniformes; por ello bloqueaba incluso un buffer nuevo que ninguna imagen publicada leía. Se completa ese camino: una generación no uniforme estable y ausente de los snapshots activo/pendiente recibe sus uploads CPU en el mismo recurso. Una generación no uniforme publicada sigue rechazada. **No se habilita aún recuperación saludable del mundo.**

## Código consultado y adaptación

Se inspeccionó [wgpu v26.0.1, `Buffer::destroy`, pending writes y destrucción diferida](https://github.com/gfx-rs/wgpu/blob/0c978d0d46c7eaf68f6d1ecf2ea1bd03a96b7c47/wgpu-core/src/resource.rs): retiene el recurso temporal si la cola tiene escrituras pendientes y, en otro caso, liga su destrucción al último submit. El snapshot/revisión/hash quedan fijados. Se adapta esa separación a nuestras generaciones, pins y cola existentes: no se descartan uploads ni se confunde destrucción solicitada con trabajo GPU completado.

La comprobación usa identidad de la generación nativa, no solo el ID lógico. Conserva el contraste con el snapshot retenido y valida todos los destinos antes de escribir o realizar COW. El fork existente se utiliza únicamente donde ya correspondía; el buffer no publicado se escribe sin copiarlo. El contador nuevo distingue uploads no uniformes de los uniformes. No se añade propietario, caché, dependencia, renderer ni permiso de reloj/frontera.

## Pruebas y fuente de evidencia

Baseline significativo: **3 fallos y 2 negativos aprobados**, antes de cambiar producción. Los 141 tests omitidos en ese comando eran los no seleccionados por filtro de nombre. El primer fixture abría dos frames y se corrigió antes del baseline significativo; se conserva. Pasan las **5 pruebas nuevas**: espera real de cola/generación visible intacta, upload antes de destrucción diferida, rechazo de vértices publicados, generación COW nueva frente a la antigua publicada y rechazo atómico de un lote mixto. Autoridad WASM/client/Host reales, GPU/transporte dobles.

Pasan **206 dirigidas/7 archivos**, **3497/3498 seleccionadas/288 archivos**, una omisión opcional/siete exclusiones históricas, sin fallos ni cancelaciones; build Vite **46,26s**. Los 487 inputs de producción/pruebas se mantienen exactos durante esas validaciones. Las cuatro fuentes QA existentes añadidas a esta entrega elevan el conjunto final a **491 inputs**, con **5 módulos/JS y 1 script HTML** parseados sobre los bytes finales, **64 nativos intactos/16 ajenos exactos**. Sin recompilación WASM ni cambios de producción después de los checks.

## NVIDIA, tras terminar tests/build

Se extienden el auditor y los Workers diagnósticos existentes, con modo `QA_AUDIT=retained-buffer-fence`. El upload ocurre en un frame que la mutación C++ real invalida. El fence normal lo envía y una lectura mapeada de la GPU devuelve **123** antes del frame sucesor. El mismo ID lógico y los **19 recursos de protocolo** permanecen; staged operations/recursos retenidos bajan a 0. Se contabilizan aparte **1 fork de uniforme y 1 de binding, cero forks de buffer no uniforme**: no se presenta conservar IDs como cero asignaciones nativas. Los comandos nuevos se presentan en la frontera real y la retirada certifica drain.

La regresión `retained-preparations` conserva su guard original: **18 recursos**, readback 123, **cero forks de uniformes/bindings**. Su comportamiento no se amplía por el nuevo modo.

La sonda del mundo de producto conserva el fallo de admisión **`Live native terrain did not consume its prepared proposal`**, mientras desaparece el error de fence no publicado: un upload no uniforme completado, cero operaciones/recursos retenidos, Host no fallido/cero errores GPU. La publicación ya había llegado a secuencia 2 antes de ese guard; no se afirma rollback ni imagen nueva válida. **Se resuelve el blocker de uploads; sigue pendiente la admisión real de la base retenida.** No se repite aquí la reconstrucción masiva; el último baseline medido 1.893 pertenece a la entrega anterior.

Dos capturas previas pasaban lectura/recursos/drain, pero el check estricto encontró un 404. Registrar su ubicación lo identificó como `/favicon.ico`; la fixture declara ahora un icono inline y el auditor conserva detalles de consola/red. No se filtran fallos de recursos o shaders. Ambas capturas se conservan; los tres casos finales terminan con los resultados esperados y sin ese error. Cinco sesiones totales de esta entrega, secuenciales y sin tests/build/profiler concurrentes.

Los cinco resultados GPU originales completos, incluidos los errores previos, se conservan sin pérdida en los gzip de [evidencia y hashes](performance/native-retained-unpublished-buffer-fence-validation-20261119.json). Los campos heredados de `retainedPreparations` describen IDs de protocolo; las copias nativas se contrastan en `retainedBufferFence.after.consumer`. Este triángulo diagnóstico y la sonda rechazada no acreditan paridad con personajes ni ausencia de tirones/cadencia.

## Siguiente punto del plan

Admisión de recursos/frontera válidas sobre la Surface retenida, manteniendo propietario y generación reales y revalidando tras cada espera. Investigar código consolidado antes de implementar y reproducir el guard en los tests existentes. Productor/cohort/paradas/relevos ordinarios, recuperación integral y cadencia/plataforma siguen pendientes; A6/e-R3/e-R4/f-R4/A/B/C abiertos, D no iniciado. f-R3 seguridad conserva su cierre.
