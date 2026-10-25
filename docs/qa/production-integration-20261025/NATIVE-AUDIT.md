# Auditoría de preparación nativa previa a la fusión

Revisión sobre f92065f2e, con los binarios publicados de la rama. No modifica reglas, navegación ni generación para facilitar pruebas.

## Propiedad y publicación inspeccionadas

spatial-preparation-worker.inc mantiene un trabajo con entradas acotadas (poblados cercanos, supresiones, nueve muestras vecinas, obstáculos y rasters vecinos). El worker usa registros de muestreo thread_local y datos propios; las estructuras vivas de navegación siguen perteneciendo al hilo principal. La transición queued/running/ready usa atómicos acquire/release. La publicación comprueba id, cancelación, revisiones de terreno/residencia/obstáculos y perfiles activos antes de mover buffers y aplicar sectores. No vuelve a llamar a la generación procedural.

spatial-thread-runtime.js espera de forma asíncrona al estado final y a la devolución del worker al pool antes de liberar/terminar. Esta inspección explica el mecanismo; no constituye por sí sola una prueba exhaustiva de ausencia de carreras.

## Ejecuciones actuales

- native-cancellation.json: tres cancelaciones reales por demanda de cámara obsoleta, epoch forzado y retirada/reintroducción. No se publica el chunk cancelado; los trabajos posteriores completan.
- native-lifecycle.json: seis biomas, ocho ciclos por bioma de edición transitoria de polígonos, rechazo de snapshot obsoleto, reintento, publicación y retirada; consultas del hilo principal durante generación. El snapshot final conserva el estado salvo los IDs asignados.
- native-routes.json: seis biomas y seis perfiles de actores, comparación contra WASM síncrono antes/después de publicación y retirada; puertas y obstáculos editados mientras el estado del worker es running. Los resultados obsoletos se rechazan; permisos de puerta diferenciados para trabajadores/animales se conservan.

Reproducir con WG_THREAD_REPORT apuntando a un archivo nuevo y ejecutar, por separado, tools/experiments/check-spatial-thread-{cancellation,lifecycle,routes}.mjs. Son pruebas funcionales de Node con pthread real, no benchmark del renderer ni simulación completa de una campaña. No atribuir sus tiempos a GPU o presentación. Siguen pendientes la auditoría de los demás cambios heredados y los controles integrales de distribución/rendimiento.
