# Tandas de preparación de texturas

2026-10-06. prepareNativeFarGpu deduplica las texturas y limita initTexture a texturesPerFrame por tanda (entero positivo, valor inicial 1). Entre tandas espera el siguiente requestAnimationFrame. Comprueba cancelación/contexto/timeout antes de cada textura y antes de compilar; después conserva pasada de cero píxeles, restauración y fence. Devuelve cantidad de tandas, máximo de texturas por tanda y duración CPU máxima observada.

## Resultado WebGL

Fixture aislada 5191, 1280 × 720, DPR 1, acacia nativa a 25 m. ready-report.json: seis texturas, seis tandas, máximo una textura por tanda, 606,50 ms de preparación total. **La tanda más lenta duró 260,60 ms**: limitar cantidad no garantiza un presupuesto de tiempo. La medición rodea initTexture y puede incluir decodificación/subida/scheduling del proceso; no identifica todavía el recurso ni aísla tiempo GPU.

El árbol termina ready=1, gpuCovered=true y cobertura nativa=1. Tres programas/tres llamadas, webglError=0, errors vacío, consola vacía. ready.png conserva el resultado. No se midió frametime durante las tandas ni se compararon lotes A/B; tampoco se vaciaron cachés. Los atlas ya se usaban para dibujar el impostor.

## Pruebas

`node --test tests/native-far-gpu.test.js tests/native-prepared-tree-coverage.test.js`: nueve aprobadas, cero fallidas, 349,77 ms. Las pruebas nuevas comprueban cinco texturas únicas de una entrada con duplicados, límite configurable de dos, dos esperas entre tandas antes de compilar, cancelación después de la primera textura y rechazo de límites inválidos. Las pruebas previas conservan restauración de render, espera de fence e invalidación de generación.

## Pendiente

Es una limitación de cantidad, no un presupuesto estricto de milisegundos. El resultado contradice cualquier afirmación de que una textura por frame elimine los tirones. Antes de conectarlo durante gameplay hay que identificar el recurso lento, investigar decodificación anticipada/formatos de subida y preparar los recursos costosos durante carga inicial cuando corresponda. Faltan programación automática por grupo y medición integrada de frames; WorldScene todavía no utiliza este helper. No se acreditan mejora de FPS ni hardware móvil.
