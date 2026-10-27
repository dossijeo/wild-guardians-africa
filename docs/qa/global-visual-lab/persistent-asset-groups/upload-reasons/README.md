# Causas de invalidación de lotes

Instrumentación QA opcional de prepare(), sin cambios de producción. Ejecutar `node tools/experiments/trace-persistent-asset-uploads.mjs` con Vite5190. Sabana baja, semilla712, cámara móvil día/noche; control agrupado y prototipo persistente por chunk. Cuatro bloques terminados, sin errores y estado simulado estable. El resumen conserva contadores por bloque.

Los contadores abarcan30 fotogramas de calentamiento y180 de cadencia, después de reiniciar el acumulador. Las consultas GPU precedentes no se incluyen. Esta ejecución instrumentada NO es un benchmark de rendimiento: añade serialización y comparaciones. Se conservan datos crudos localmente en benchmarks.json.

| Lotes de color actualizados | Control día/noche | Por chunk día/noche |
|---|---:|---:|
| Total |1687 /1685 |2925 /2907 |
| Nuevos o recreados |226 /226 |465 /465 |
| Cambió composición/conteo |1157 /1157 |2070 /2070 |
| Cambió secuencia de versiones de matrices |1170 /1171 |2168 /2168 |
| Solo visibilidad |290 /288 |292 /274 |

Las causas no son excluyentes y no deben sumarse. Los sellos comparan secuencias de entradas: cambiar composición puede cambiar también el sello de matrices o transformaciones sin que se haya movido un objeto. No confundirlo con animación o movimiento del terreno. Tampoco son bytes transferidos. Los grupos nuevos pueden ser recreaciones por capacidad/LOD, no streaming nuevo del mundo.

Lectura del código: asset-lod.js recalcula bins al cambiar la celda de cámara de1.5m; solo cuando cambia el orden de un bin reconstruye las matrices y aumenta su versión. packLodCoverage actualiza por separado el atributo de cobertura. asset-groups.js combina ambas versiones en un único sello y sube matriz y cobertura juntas. El prototipo por chunk mantiene este acoplamiento y la selección de LOD empaquetada.

Resultado: aproximadamente17% de las actualizaciones de color del control corresponden exclusivamente a visibilidad. Separarlas evita trabajo innecesario, pero no elimina el mayor problema de reordenación por LOD. Para matrices realmente residentes, la selección debe referirse a IDs lógicos estables de batch.instances y batch.orders, con datos de visibilidad separados; no basta con añadir una clave de chunk. Las sombras requieren población propia y no deben adoptar el culling de la cámara principal.

Siguiente implementación QA: comprobar primero la separación de subidas de visibilidad/matriz, preservando la selección actual; luego evaluar indirection por IDs para evitar empaquetar matrices al cambiar LOD. Mantener el material, densidad, geometría y las transiciones visuales.
