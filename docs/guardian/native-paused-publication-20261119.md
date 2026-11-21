# Publicación nativa durante pausa — 2026-11-19

Continúa `b1e703191` dentro de A4/e-R3/f-R4. Una autoridad con productor nativo podía certificar una pausa sin trabajo futuro, detener sus avances normales y conservar una vista anterior a un commit asíncrono. Además, sin captura de segmentos de reloj, podía seguir publicando ACKs «sin cambios» aunque Game ya hubiese incorporado ese commit. Se corrigen ambas condiciones en la autoridad existente.

## Fuente consultada y decisión

Antes de implementar se leyó [libuv v1.51.0, `src/unix/core.c`](https://github.com/libuv/libuv/blob/v1.51.0/src/unix/core.c): `uv__loop_alive` comprueba handles, solicitudes, callbacks pendientes y cierres; `uv__backend_timeout` distingue la espera de trabajo pendiente, y `uv_run` consulta esa condición antes de dejar de procesar el bucle. Se adapta la comprobación de propiedad asíncrona a nuestra certificación existente.

Un slot nativo momentáneamente inactivo o suspendido no acredita ausencia de trabajo futuro: conectar sus puertos o reanudarlo puede producir otro commit sin un comando de juego. Por eso la autoridad solo concede el certificado de pausa o el ACK compacto sin cambios cuando no posee ese productor. Se usa su identidad existente, sin consultar repetidamente el estado, ni añadir temporizador, callback de publicación, cola, caché, reloj, dependencia o propietario. La versión exacta, URL, SHA-256 y decisión previa están fijadas en el recibo.

Es una política conservadora: el cohort nativo conserva las publicaciones completas de sus avances pausados normales. Su coste no se declara aceptado ni optimizado. Las autoridades sin productor conservan la compactación y certificación anteriores, incluidas las pruebas de ahorro y replay de pausas.

## Implementación

- `pausedAuthorityQuiescent` exige `hasNativeProduction:false`; el llamador autoritativo pasa explícitamente si posee el productor. Los valores desconocidos no conceden el certificado. El valor por defecto mantiene el contrato de los llamadores anteriores sin producción nativa.
- La selección de ACK compacto de un avance pausado también exige ausencia del productor. Comprobar solo terreno, eventos, física y tiempo no detectaba los cambios semánticos de un commit de ruta.
- El helper de pruebas permite activar el flag existente `compactPausedAcks`, manteniendo su valor anterior por defecto. No cambia admisión, puertos, preparación, reloj, transacciones o mundo nativos.

## Evidencia

Cinco casos nuevos, incluido el control sin compactación: las dos fuentes de producción anteriores desde sus URLs originales dan **1 pase/4 fallos**. Corregir solo el certificado da **3 pases/2 fallos**, reproduciendo además la pérdida de la publicación por ACK sin cambios. La selección inicial final da **19/19**; incluye las pruebas anteriores de compactación, quietud y suspensión nativa.

Validación final: **870 dirigidas/62 archivos** y **4383 de 4384 seleccionadas/341 archivos**, 1 omisión opcional, cero fallos/cancelaciones en esas selecciones. Cuatro sintaxis y build completo de producción **56.42 s**. **613 entradas congeladas, 64 nativos intactos y 16 ajenos exactos**, sin recompilar WASM.

Los tres controles preexistentes siguen abiertos: timeline 19/20 por handshake, host sin terminar en 25 s e histórico 3 pases/2 fallos por `releaseCommand`; sus reproducciones antes/actual pertenecen a `6445f17ae` y se heredan expresamente. No se proclama suite universal. Fuentes de la decisión, baselines, logs completos con las publicaciones, selecciones, sintaxis y hashes en el [recibo de validación](performance/native-paused-publication-validation-20261119.json).


La prueba ejecuta `createWorkerGameRuntime`, autoridad/planner/C++/WASM, receptor de estado confirmado y MessageChannel de recursos reales. El adaptador de cliente conserva el FIFO y ejecuta los comandos sobre esa misma autoridad; el scheduler de prueba invoca únicamente los callbacks del temporizador existente, con incrementos de 50 ms. El Host/control/cola GPU son los adaptadores deterministas existentes; no son hilos de navegador ni GPU hardware.

La secuencia inicial real contiene exactamente un snapshot, el `addChunk` solicitado por residencia y el comando de pausa. Se conectan después los puertos, se retiene un paquete realmente preparado y se espera su commit, suspensión y barrera de recursos. Ninguna de esas operaciones publica por sí sola otro estado en el runtime. Los tres callbacks siguientes producen los avances ordinarios 4, 5 y 6: el receptor pasa de `pending-stroll-resources` a `native-idle-stroll`, con tiempo lógico invariable, cuerpo 1 y una sola preparación. Se comprueba numeración contigua y ausencia de snapshots adicionales.

Se cubren compactación activada con y sin segmentos de reloj, más el control con compactación desactivada. La reproducción original del runtime se quedaba en la publicación 3, certificada como quieta. El control intermedio que corregía únicamente el certificado emitía avances pero, sin segmentos de reloj, seguía respondiendo sin cambios y no actualizaba al actor. Los logs conservan los comandos y publicaciones de cada variante.

## Continuación del plan

Este incremento restablece la publicación normal del estado nativo mientras la partida está pausada. No congela la autoridad ni convierte esa publicación en checkpoint de recuperación. Falta coordinar la suspensión del productor y su barrera gráfica con una publicación fuente posterior antes de congelar el host, y comprobar que diario, estado, terreno y frontera nativa coinciden. Se mantiene el criterio de no inyectar/priorizar snapshots ni añadir muestreos de Rapier.

La conexión ordinaria de recursos en `main`, bootstrap/relevo completos y sustitución de un cohort fallido siguen pendientes. No se modifica el archivo ajeno `worker-game-runtime.js`; no se habilitan cohortes no soportados, se borran errores, se cambian reglas de juego o se reconstruyen recursos gráficos. No hay aceptación nueva de GPU, cadencia, plataformas o partida completa. A6/A/B/C siguen abiertos, D no iniciado y f-R3 conserva su cierre de seguridad; los tres fallos anteriores del host/timeline permanecen separados.
