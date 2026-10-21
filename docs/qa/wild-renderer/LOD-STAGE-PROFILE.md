# Perfil diagnóstico de preparación LOD

Sabana baja, seed 712, 1280×720, Intel UHD, variante engine-selection, mismos 49 chunks residentes y recorrido que el control anterior. Se instrumentó exclusivamente asset-lod.js mediante ruta QA; no hay cambios en el renderer de producción. Día y noche, 180 frames de calentamiento y 360 frames de cadencia por fase. El harness también recoge su ventana GPU habitual, pero esta ejecución instrumentada no constituye evidencia de aceleración.

| Media por frame | Día | Noche |
|---|---:|---:|
| updateAssetLods completo | 1,902 ms | 1,759 ms |
| nativeLodBins | 0,573 ms | 0,516 ms |
| Reconstrucción de matrices | 0,066 ms | 0,069 ms |
| Cobertura y sombras | 0,407 ms | 0,380 ms |
| Resto de updateAssetLods | 0,856 ms | 0,795 ms |
| Agrupador posterior | 1,899 ms | 1,671 ms |

Se recorren 825 lotes por frame. La clave de cámara cambia en 148 de los 360 frames; en promedio se seleccionan 339,17 lotes y se reconstruyen 230,17 matrices por frame. Estas medias incluyen frames sin reselección. La fase LOD se ejecuta antes del agrupador y explica trabajo de preparación que las métricas internas de WASM no cubrían.

**La reconstrucción de matrices no es el principal coste medido.** Evitarla por sí sola atacaría aproximadamente 0,07 ms. La selección de listas, el recorrido de lotes y las actualizaciones de cobertura/sombras suman mucho más. La próxima variante debe abordar esos recorridos y sus invalidaciones, con población persistente y cambios de cámara separados de eventos del mundo, conservando los consumidores de sombras y clipping.

Los temporizadores por lote introducen sobrecoste y tienen resolución limitada; el residual incluye comparaciones de órdenes, estadísticas, recorridos e instrumentación, no una única operación. No extrapolar estos tiempos a rendimiento sin instrumentación ni sumar LOD/agrupador al tiempo total de render, que ya los incluye. Solo se midió una ejecución por fase; no se declara una ganancia ni un techo exacto.

Sin errores GL, sin cambios de estado ni fallos de ejecución. [Datos](lod-stage-profile/benchmarks.json), [resumen](lod-stage-profile/summary.json). Reproducir con `WR_PROFILE_LOD=1`, `WR_FIXED_RESIDENCY=1`, `WR_ORDER=engine-selection` y salida nueva al ejecutar `measure-wild-renderer.mjs`. Los auditores de rendimiento rechazan el perfil como prueba de aceleración.
