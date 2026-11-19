# Suspensión nativa por el protocolo Worker — 2026-11-19

Continúa `f64986779` dentro de A4/e-R3/f-R4. La barrera local del productor ya puede solicitarse desde el runtime de presentación, atravesar el host y el cliente autoritativo y resolverse en el Worker de autoridad. El recibo real permanece en ese Worker; la respuesta transporta únicamente versión e identidad de la solicitud que mantiene la suspensión.

## Código consultado y adaptación

Se releyó [Comlink v4.4.2, `src/comlink.ts`](https://github.com/GoogleChromeLabs/comlink/blob/v4.4.2/src/comlink.ts): `requestResponseMessage` registra la espera antes de enviar, y `wrap` selecciona por ID y elimina la espera resuelta. Se adapta ese patrón a los RPC existentes, añadiendo comprobaciones de sesión, acción y suspensión. Se conserva el transporte actual: no se incorpora Comlink, su proxy, su generador aleatorio de IDs ni sus finalizadores. La fuente exacta y SHA-256 están fijados en el recibo.

El host contiene además el criterio de no inyectar snapshots ni priorizarlos: un muestreo adicional de Rapier puede cambiar un rig. Se conserva ese contrato. Este incremento proporciona la operación de suspensión a través del protocolo; todavía no la inserta automáticamente en la captura del checkpoint ni en `main`.

## Implementación

- El runtime hospedado utiliza su `next` y su mapa de RPC pendientes. El host pasa esa identidad al cliente autoritativo, cuyo contador `next` sigue perteneciendo exclusivamente a los comandos de simulación. La suspensión y su reanudación no consumen números de comando ni bloquean el FIFO ordinario.
- Se admite una sola operación de ciclo de vida pendiente por cliente. La respuesta debe corresponder a solicitud, acción, versión y `holdId`. Mensajes completados antiguos se descartan; una respuesta activa mal formada falla de forma explícita. Fallo y disposición rechazan las esperas pendientes.
- El Worker conserva un solo registro con el recibo local de `f64986779`. Responde a `quiesceNativeIntentProduction` únicamente después de terminar la operación real. `resumeNativeIntentProduction` exige la identidad de esa suspensión y utiliza el objeto local exacto. Una segunda suspensión, una reanudación temprana, un ID reutilizado o una suspensión anterior no liberan la actual. Disponer la autoridad elimina el registro y descarta la continuación pendiente.
- El RPC no crea una autoridad, consumidor, renderer, cola, reloj ni permiso físico. La reanudación confirma que se consumió la suspensión local; no que una preparación posterior haya terminado ni que se haya dibujado un frame.

## Validación y alcance

Catorce casos nuevos: baseline **0 pases/14 fallos** con los cuatro módulos anteriores desde sus URLs originales y fuentes anteriores al bundle; los actuales pasan junto a los 24 casos del productor (**38/38**). Pasan **847 dirigidas/60 archivos** y **4360 de 4361 seleccionadas/339 archivos**, 1 omisión opcional, cero fallos/cancelaciones en esas selecciones; seis sintaxis y build de producción completo **60.78s**. **610 inputs, 64 nativos intactos y 16 ajenos exactos**, sin recompilar WASM.

Los tres controles preexistentes del host/timeline siguen pendientes: 19/20 por handshake, no terminación en 25 s y 3 pases/2 fallos por `releaseCommand`. Sus reproducciones antes/actual pertenecen al recibo de `6445f17ae`; se heredan explícitamente, no se repiten ni se atribuye su reparación a este protocolo. No se proclama suite universal.

Fuentes, controles, selecciones, logs completos, sintaxis y hashes: [recibo de validación](performance/native-production-lifecycle-validation-20261119.json).


La prueba de cadena recorre los cuatro módulos de producción con `DEV:false` y `MODE:production`, autoridad/planner/WASM y commits nativos reales. Los adaptadores de creación devuelven una única autoridad existente; los de envío ejecutan los handlers reales, el canal de recursos es MessageChannel y el control/Host/cola GPU son los adaptadores deterministas existentes. No es una prueba de hilos de navegador o de GPU hardware. El helper mantiene sus sesiones anteriores por defecto y permite indicar la sesión del protocolo, exponer sus dos puertos existentes y reenviar el error de autoridad; no se cambian las reglas de admisión ni los paquetes.

Se conectan ambos puertos bajo suspensión sin iniciar preparación. Al reanudar se adquiere el mismo cuerpo 1 y una publicación ordinaria confirma `native-idle-stroll`, con una sola creación de autoridad. Otra prueba mantiene la preparación pendiente y recibe un comando normal sin huecos de numeración. Los handlers del Worker rechazan suspensión duplicada, IDs viejos y reanudación antes de terminar un paquete ya preparado. Fallo de preparación y cierre no producen un testigo tardío ni limpian el fallo.

El baseline inicial de once casos incluía una espera de comando no observada al faltar la API; el fixture final observa su rechazo sin cambiar las aserciones. La primera ejecución del protocolo obtuvo 9 pases/2 fallos porque la prueba suponía que todos los comandos eran snapshots: la autoridad solicitó correctamente un `addChunk` de residencia. La prueba final exige numeración contigua, exactamente los snapshots solicitados y solo los comandos de residencia normales restantes; no se omite esa demanda. Se conservan todos los logs.

## Siguiente punto del plan

Falta insertar esta operación en el relevo de recuperación y conectar `attachNativeResourcePreparation` desde la partida. La captura debe incluir cualquier mutación nativa comprometida después de la última publicación sin introducir muestreos adicionales de física ni cambiar las reglas. El host aún conserva su flujo de recuperación anterior.

La terminación del productor tampoco confirma que el endpoint gráfico haya procesado su último `commitNativeGateResources`: ese mensaje sigue siendo asíncrono. Se mantiene el preflight gráfico actual; la conexión ordinaria necesita su ACK/barrera de transporte real. Un productor o cohort fallido no se reactiva limpiando su error.

No hay nueva aceptación GPU, de cadencia o de partida completa. Las evidencias GPU de `4c646d3c9` se heredan solo en su alcance previo. Productor/cohort ordinarios, paradas, relevos, personajes/puertas, cadencia y plataformas continúan pendientes; A6/A/B/C abiertos, D no iniciado y f-R3 conserva su cierre de seguridad.
