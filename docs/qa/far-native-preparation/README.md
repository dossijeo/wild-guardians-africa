# Preparación GPU explícita antes del fade

2026-10-06. Fixture aislada de acacia nativa, servidor 5191, 1280 × 720, DPR 1. El lote combinado permanece separado de la escena hasta completar la preparación. Antes del botón: dos programas y dos llamadas de dibujo; instancia nativa empaquetada pero ready=0. Se evita así la preparación incidental del lote nativo durante los frames anteriores.

prepareNativeFarGpu inicializa las texturas, espera compileAsync del root nativo con las luces de la escena destino, ejecuta una pasada en render target 1 × 1 para subir los buffers activos y espera una fence WebGL mediante consultas no bloqueantes entre frames. Solo después se incorpora el root a la escena y se autoriza ready. No usa gl.finish. Restaura render target, cara/mip y padre original; elimina fence y target temporal incluso al fallar. Permite cancelar y limita la espera a 30 segundos.

## Resultados

- before-report.json: ready=0, cobertura nativa=0, programas=2, drawCalls=2, WebGL sin errores.
- ready-report.json / ready.png: primera ejecución, 1517,10 ms de tiempo total de preparación, ready=1, cobertura=1, programas=6, WebGL sin errores.
- matched-color-report.json / matched-color.png: ejecución posterior tras asignar al target el espacio de color de salida del renderer, 577,90 ms, ready=1, cobertura=1, programas=6, WebGL sin errores. Esa asignación **no eliminó las variantes adicionales**. No inferir mejora de tiempo: son ejecuciones únicas sucesivas, con posibles cachés compartidas y carga externa variable.
- Ambas consolas capturadas están vacías.

Los tiempos incluyen compilación asíncrona, subida/pasada y espera de fence; no son frametime ni un benchmark repetido. Se evitó el renderizado previo de la geometría nativa en esta página, pero no se vaciaron cachés de shaders del navegador/driver. Los atlas ya eran necesarios para dibujar el impostor y podían estar calientes. No se acredita carga completamente fría de todos los recursos.

## Pruebas y trabajo restante

`node --test tests/native-far-gpu.test.js tests/native-tree-coverage.test.js`: 10 pruebas aprobadas, 0 fallidas (578,38 ms). Tras ajustar el espacio de color se repitieron las tres pruebas de preparación: aprobadas (272,66 ms). Los dobles prueban orden compilar → dibujar → fence, deduplicación de texturas, espera por frame, restauración al fallar y cancelación antes de operar. La ejecución WebGL acredita también el camino real sin errores.

Se prepara únicamente el nivel/grupo actualmente empaquetado; futuros niveles y grupos necesitan otra preparación. Seis programas frente a tres en la prueba anterior indican variantes adicionales de la pasada temporal: su coste de compilación/memoria debe reducirse antes de adoptar esto en el juego completo. Tampoco se evita todavía el trabajo síncrono de initTexture/subida: faltan presupuestos por frame y medición de latencia visual. WorldScene no usa este helper; no se ha demostrado eliminación del tirón de incursiones, rendimiento móvil ni ausencia de popping durante desplazamiento.

El descarte de impostor y nativo ya emplea la misma función coverageThreshold. Por tanto no se modificó su patrón. La discrepancia visual del punto medio de la prueba anterior sigue pendiente: el atlas procede del modelo completo y la transición puede coincidir con un nivel nativo simplificado.
