# Preparación asociada a la generación de recursos

2026-10-06. NativePreparedTreeCoverage recibe NativeTreeCoverage y una firma de los renderables combinados. capture retiene los registros de empaquetado anteriores a la preparación. complete solo acepta registros que siguen siendo exactamente los actuales y cuya firma de recursos sigue vigente; no autoriza árboles añadidos después. Una actualización CPU o sustitución del renderable invalida la autorización anterior. Mantiene contadores por ID para propietarios solapados y respeta supresiones.

La fixture firma identidad de mesh/geometría/material, versión de material y count. No incluye la versión de cobertura visual, que cambia legítimamente durante el fade. update se ejecuta explícitamente una vez después de actualizar la cobertura CPU. has y revision no reconstruyen firmas por cada árbol: las consultas son constantes.

## Comprobación WebGL

Fixture aislada 5191, 1280 × 720, DPR 1. near-ready.json: a 25 m, GPU cubierta y ready=1. Al seleccionar 50 m, middle-unprepared.json muestra instancia CPU empaquetada, gpuCovered=false, ready=0 y cobertura nativa=0: permanece el impostor. Al preparar de nuevo, middle-ready.json muestra gpuCovered=true, ready=1 y cobertura nativa=0,5. Se conservan capturas del fallback y del resultado.

Después de convertir las consultas en O(1) se repitió la preparación cercana y cambio a 50 m: final-near-ready.json y final-middle-unprepared.json confirman los mismos estados. Todos los informes tienen webglError=0 y errors vacío; ambas consolas capturadas están vacías. La etiqueta GPU preparada indica que hubo una preparación completada; gpuCovered es la autorización del lote actual.

`node --test tests/native-prepared-tree-coverage.test.js tests/native-tree-coverage.test.js tests/native-far-gpu.test.js`: 14 aprobadas, 0 fallidas, 537,71 ms. Incluye captura obsoleta, sustitución de empaquetado con los mismos IDs, árbol añadido durante preparación, cambio de recursos con igual cobertura CPU, retirada parcial de propietarios, supresión y mil consultas sin recomputar la firma.

## Límites

Los tiempos de preparación registrados son ejecuciones únicas, con recursos y cachés previamente utilizados; no son benchmarks de carga en frío. Los cambios durante la preparación se verifican mediante dobles; el navegador prueba invalidación después de cambiar de nivel y preparación posterior.

La firma global de grupos es conservadora: un recurso sustituido puede invalidar también grupos que no cambiaron. Para integrarlo habrá que asignar generaciones por grupo y programar preparación incremental con presupuesto. El root ya permanece en escena después de la primera preparación, de modo que un nuevo nivel puede renderizar descartado y calentarse antes de revalidarlo: este lote prueba autorización/fallback, no elimina su coste inicial.

No hay todavía integración en WorldScene ni automatización de esta preparación. No se acreditan ausencia de tirones, todos los biomas, sombras, guardado, precisión extrema o móvil. Las diferencias de silueta en el crossfade siguen pendientes.
