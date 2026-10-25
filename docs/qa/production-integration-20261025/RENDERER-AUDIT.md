# Auditoría de integración de recursos y agrupación

Revisión del diff contra origin/main y pruebas sobre 49bdc0fde.

NativeAssetGroups conserva instanceCulling=true y la selección compactada de instancias por frustum. addDirtyRange sigue acumulando intervalos pendientes y los limpia al subirlos; no se vuelve al envío indiscriminado de matrices. La población de sombras conserva su ruta independiente. smoothObstruction aparta las instancias parcialmente visibles en clones FrontSide transparentes, sin escritura de profundidad, manteniendo las instancias opacas agrupadas; los clones actualizan únicamente matrices/cobertura modificadas y se liberan al retirar el grupo. Los epochs invalidan materiales dormidos tras cambios de calidad. Riesgo que sigue requiriendo validación visual: coste/orden de transparencias cuando coinciden varios oclusores.

La preparación incremental de terreno conserva un grupo provisional hasta terminar, valida la revisión y libera el resultado descartado. El scheduler ejecuta unidades síncronas y cede entre unidades; no interrumpe llamadas al driver. La recuperación excepcional solo está habilitada en terreno requerido y sigue condicionada a un frame barato. Esto no prueba progreso garantizado bajo saturación sostenida; la observación del fallo de CI deberá atribuir la fase pendiente antes de cambiar la política.

El guard de epoch GL intercepta creación/liberación, omite solo deletes de handles identificados de generaciones anteriores y restaura sus wrappers al disponer. No reemplaza la propiedad de Three.js ni demuestra por sí solo una restauración visual completa del contexto.

Resultados: scheduler-resource-tests.log, 63/63; asset-resource-audit-tests.log, 77/77. Cubren contratos de colas, cancelación, preparación y bindings, retención, rangos de buffers, culling, ocultación y calidad con pruebas dirigidas. No son benchmarks GPU ni sustituyen la matriz real de juego. La suite completa continúa por separado.

Pendientes concretos antes de merge: CI del head actual; explicar o reproducir el timeout nativo de carga registrado; finalización del instalador; cerrar la matriz de juego normal de seis biomas día/noche, cámara/streaming y calidad; validar restauración real de contexto y cancelación durante carga. Después siguen, por orden, menú por capas/parallax y microeventos.
