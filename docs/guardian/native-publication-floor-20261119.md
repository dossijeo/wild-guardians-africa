# Secuencia fuente de una suspensión nativa — 2026-11-19

Continúa `cc218472e` dentro de A4/e-R3/f-R4. El RPC existente de suspensión puede devolver ahora, a petición del llamador, la secuencia real de la última publicación autoritativa. Ese dato permite exigir posteriormente un checkpoint confirmado después de la suspensión, sin inventar números, introducir comandos o clonar el recibo local.

## Código consultado y adaptación

Antes de implementar se leyó el código de [Redis 8.2.1, `src/replication.c`, revisión `cd0b12938`](https://github.com/redis/redis/blob/cd0b12938b6c99978440c6f7e44e34d7ff0aa537/src/replication.c): `waitCommand` toma el offset de escritura existente y `replicationCountAcksByOffset` contrasta las confirmaciones contra él. Se adapta la captura de una posición real y su comparación posterior a nuestro protocolo; no se incorporan Redis, su lista de clientes bloqueados ni otra cola, reloj, caché o dependencia. URL, revisión, SHA-256 y decisión previa están fijados en el recibo.

## Contrato e implementación

- `quiesceNativeIntentProduction({withPublicationFloor:true})` en el runtime hospedado transmite esa opción por el host y el cliente existentes. La variante sin opciones conserva sus mensajes y respuestas anteriores; la reanudación mantiene su contrato.
- El estado del productor de la autoridad expone `publicationSequence`, leyendo el contador de comandos existente. Tras la quiescencia real y la barrera del puerto gráfico, el Worker incluye `publicationFloor` en la respuesta solicitada. No incrementa ese contador ni muestrea Game, terreno, física o Rapier.
- Con un productor, el valor es la última secuencia real, incluido cero antes de la primera publicación. Sin productor es `null`: no inventa actividad nativa. **Un valor nulo no libera el registro de suspensión**; la reanudación sigue exigiendo la identidad de ese registro, conforme al contrato anterior.
- El cliente de autoridad valida el número contra los comandos realmente enviados y confirmados. Una orden admitida pero todavía en la cola no acredita una publicación. El runtime hospedado valida el formato sin confundir sus IDs RPC con las secuencias de simulación. Identidad, sesión, versión, acción, suspensión, fallo y disposición conservan sus comprobaciones.
- El objeto opaco que autoriza reanudar permanece dentro del Worker. El transporte sigue llevando únicamente datos. El metadato se solicita explícitamente; no se añade a cada publicación de juego ni a cada frame.

## Evidencia

Diecisiete casos nuevos: las cinco fuentes de producción anteriores cargadas desde sus URLs originales y antes del bundle dan **16 casos anteriores aprobados/17 nuevos fallidos**. El código actual pasa **67/67** en la selección inicial. El primer baseline contenía dos rechazos pendientes sin observar al fallar antes la aserción de opción ausente; el fixture final observa esas promesas inmediatamente y mantiene las mismas aserciones. El control final no genera avisos de actividad asíncrona; se conservan ambos logs.

Validación final: **887 dirigidas/63 archivos** y **4400 de 4401 seleccionadas/342 archivos**, 1 omisión opcional, cero fallos/cancelaciones en esas selecciones. Siete sintaxis y build completo de producción **60.70 s**. **614 entradas congeladas, 64 nativos intactos y 16 ajenos exactos**, sin recompilar WASM.

Los tres controles anteriores siguen abiertos: timeline 19/20 por handshake, host sin terminar en 25 s e histórico 3 pases/2 fallos por `releaseCommand`; sus reproducciones antes/actual pertenecen a `6445f17ae` y se heredan expresamente. No se proclama suite universal. Decisión, fuentes anteriores, baselines, logs completos, selecciones, sintaxis y hashes en el [recibo de validación](performance/native-publication-floor-validation-20261119.json).


La cadena de producción recorre runtime, host, cliente y Worker con autoridad/planner/C++/WASM reales, ambos puertos y commits nativos reales. Conserva una sola autoridad. Solicita la posición antes de conectar recursos, reanuda, espera un commit y vuelve a suspender. La vista confirmada sigue describiendo el estado anterior mientras el nuevo recibo conserva la misma secuencia fuente: **terminar el commit no publica por sí solo otro comando**. La siguiente publicación explícita de diagnóstico usa la secuencia siguiente y muestra `native-idle-stroll`. Esa comprobación no introduce un snapshot automático en producción ni prueba todavía el checkpoint del host.

Otro caso recorre la misma cadena sin productor, obtiene `null`, rechaza una segunda suspensión mientras se mantiene la primera y solo permite continuar tras su reanudación válida. Las pruebas del cliente cubren cero, nulo, un comando en vuelo, una orden en cola no enviada, una secuencia anterior a la ya confirmada, formato incorrecto y opciones inválidas. El runtime hospedado también comprueba la petición y la correlación de sus respuestas.

Los adaptadores de creación y envío ejecutan los handlers reales; el Host/control/cola GPU son los adaptadores deterministas existentes. No es una prueba nueva de hilos del navegador, GPU hardware, cadencia o partida completa. Las evidencias previas conservan exclusivamente su alcance publicado.

## Siguiente integración

La posición transportada **no acredita que el último commit esté incluido en un checkpoint**. El coordinador deberá mantener la suspensión, renovar el checkpoint sobre un comando normal posterior y esperar la confirmación gráfica real, incluyendo la frontera nativa. Se conserva el criterio de no inyectar/priorizar snapshots ni añadir muestreos de Rapier.

La revisión del flujo actual muestra que `markVisualLost` separa el canal antes de `prepareVisualRecovery`. Para una renovación confirmada por el consumidor anterior, la coordinación debe ocurrir antes de esa separación y contar con un consumidor capaz de responder. El camino de consumidor fallido necesita su propia evidencia de drenaje, sustitución o reanudación válida; este incremento no lo habilita ni borra sus errores. Tampoco añade aún la política de adquisición, cancelación y liberación automática de la suspensión a esos métodos del host.

La conexión ordinaria de recursos en `main`, bootstrap/relevo completos, todas las intenciones, cadencia y plataformas siguen pendientes. La política conservadora de publicaciones pausadas de `cc218472e` conserva su coste sin aceptar. A6/A/B/C siguen abiertos, D no iniciado y f-R3 conserva su cierre de seguridad; los tres fallos anteriores del host/timeline permanecen separados.
