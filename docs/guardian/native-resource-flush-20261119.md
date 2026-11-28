# Confirmación del endpoint de recursos nativos — 2026-11-19

Continúa `910062f69` dentro de A4/e-R3/f-R4. La suspensión remota del productor espera ahora, además de su operación local, una respuesta emitida por el endpoint gráfico después de procesar los mensajes anteriores del mismo puerto. Vaciar los proxies locales ya no se confunde con haber aplicado el commit remoto.

## Referencias y decisión

Antes de implementar se leyeron las fuentes oficiales de [NATS Go v1.39.1](https://github.com/nats-io/nats.go/blob/v1.39.1/nats.go) y del [servidor v2.10.24](https://github.com/nats-io/nats-server/blob/v2.10.24/server/client.go). `sendPing` registra su espera antes de enviar; `processPong` resuelve la respuesta correspondiente; `FlushTimeout` limita la espera y `close` rechaza las pendientes. El servidor responde desde `processPing`. Se adapta la solicitud/respuesta en el mismo canal ordenado, usando el serial y mapa pendientes existentes y una sola operación de transporte.

La revisión de `checkDrained` mostró otro límite: el round-trip y el trabajo asíncrono local pendiente son condiciones diferentes. Aquí no se copia su polling: el receptor cuenta la duración real de sus preparaciones y actualizaciones hasta el `finally`, incluso después de cancelar y vaciar `entry`. Tanto la barrera como el preflight de recuperación retenida rechazan mientras sigan activas. No se incorporan NATS, dependencias, relojes, colas de trabajo, cachés ni propietarios.

Las versiones, URLs, SHA-256 de las fuentes descargadas y decisión previa están fijados en el recibo. El código permanece disponible en las referencias oficiales; los archivos de terceros descargados se conservan en la caché local.

## Implementación

- `createNativeResourcePreparationConnection.flush()` utiliza el mismo puerto, serial y mapa pendientes. No admite otra preparación, handle retenido o barrera simultánea. Registra su espera antes de enviar y valida sesión, identidad, tipo y versión de la respuesta. Timeout, cierre, envío fallido o respuesta activa incorrecta rechazan y cierran la conexión; una respuesta antigua no resuelve una solicitud posterior.
- El receptor responde a `flushNativeResources` únicamente estando vivo, sin entrada retenida ni callback asíncrono activo y con identidad posterior a la aceptada. Un callback de commit o su notificación fallidos dejan el receptor cerrado y no pueden certificarse con otra barrera. No se debilitan plantillas, admisión, fronteras nativas, terreno o permisos físicos.
- La autoridad expone la barrera de su conexión existente. Sin conexión es un no-op explícito; no crea un endpoint. La operación local del productor conserva su recibo y su semántica anterior. El Worker espera primero la quiescencia local y después la barrera real antes de emitir `nativeIntentProductionQuiesced`. Sigue usando el mismo recibo local; no consume secuencias de comandos ni introduce snapshots.
- El Worker gráfico conserva su preflight y añade la condición de callbacks activos. Una preparación cancelada puede entregar todavía un handle tardío: ese callback debe terminar y retirar sus recursos antes de volver a intentar el relevo. El registro temporal no se declara drenado por haber borrado su handle público.

## Evidencia

Dieciocho casos nuevos: con las cinco fuentes de producción anteriores cargadas desde sus URLs originales y antes del bundle, **23 casos anteriores pasan y los 18 nuevos fallan**. El código actual pasa **66/66** en la selección inicial. El control intermedio sin el guard de callbacks cancelados pasa 22 y falla los tres casos nuevos de ese límite; después pasan los tres.

Validación final: **865 dirigidas/61 archivos**, **4378 de 4379 seleccionadas/340 archivos**, 1 omisión opcional, cero fallos/cancelaciones en ambas selecciones. Ocho sintaxis y build de producción completo **56.62 s**. **611 inputs congelados, 64 nativos intactos y 16 ajenos exactos**, sin recompilar WASM.

Los tres controles anteriores siguen abiertos: timeline 19/20 por handshake, host sin terminar en 25 s e histórico 3 pases/2 fallos por `releaseCommand`; sus reproducciones antes/actual pertenecen a `6445f17ae` y se heredan explícitamente. No se proclama suite universal. El primer intento del launcher de baseline usó una ruta Windows que Node interpretó como paquete: se conserva ese error; el control final usa URL de archivo y ejecuta los casos sin avisos de actividad asíncrona.

Fuentes de la decisión, baselines, logs completos, selecciones, sintaxis y hashes en el [recibo de validación](performance/native-resource-flush-validation-20261119.json).


La prueba del canal retiene deliberadamente commit y barrera: el lado autoritativo ya informa cero pendientes y cero retenidos, pero la promesa sigue esperando y el endpoint conserva su preparación. Solo la entrega FIFO real y su respuesta la resuelven. Incluye respuesta antigua, sesión/identidad/tipo/versión incorrectos, cierre, timeout, commit rechazado/excepción y notificación fallida. Los callbacks cancelados de preparación y actualización siguen bloqueando la certificación hasta terminar.

Dos casos recorren runtime hospedado, host, cliente y Worker de autoridad de producción, con una sola autoridad C++/planner/WASM real y MessageChannel de recursos. El commit queda retenido después de concluir el productor: el RPC no responde todavía; entrega correcta resuelve y permite reanudar, entrega rechazada produce error y ningún testigo de suspensión. No se añade una publicación de simulación. El preflight del Worker gráfico real también rechaza un callback cancelado tardío y acepta el relevo tras su terminación conservando su único propietario.

Los adaptadores de creación y envío ejecutan los handlers reales; el Host/control/cola GPU y la Surface de la prueba de preflight son adaptadores deterministas. No son pruebas nuevas de hilos del navegador, GPU hardware, cadencia o partida completa. Las evidencias GPU anteriores conservan exclusivamente su alcance publicado.

## Pendientes del plan

La barrera acredita el procesamiento de mensajes anteriores y el éxito de los callbacks síncronos del endpoint. No acredita finalización de la cola GPU, dibujo, una publicación de estado coherente ni ausencia de nuevas escrituras después de responder. Un callback cancelado aún activo provoca rechazo conservador; no se añade un gestor de espera o reintento automático para él.

Falta coordinar esta suspensión con `prepareVisualRecovery` y con el checkpoint fuente: un commit nativo puede cambiar Game después de la última publicación. Se conserva el criterio del host de no inyectar/priorizar snapshots ni añadir muestreos de Rapier. Sigue pendiente conectar los recursos desde `main` en bootstrap/relevo ordinarios y resolver la sustitución de consumidores fallidos sin revivir un cohort con error.

La sonda del siguiente requisito reproduce ese límite con autoridad C++ real, `compactPausedAcks:true`, pausa mediante comando y demanda ordinaria del chunk `2,0` satisfecha: la publicación 5 certifica `pausedQuiescent:true` mientras el productor está preparando y el actor sigue `pending-stroll-resources`. Después del commit y de la barrera reales, la publicación explícita de diagnóstico 6 muestra `native-idle-stroll` en el mismo tiempo lógico. El host que ya hubiese aceptado la certificación podría haber dejado de solicitar avances normales. Esta sonda no ejecuta ese host ni corrige todavía su certificación; orienta el siguiente incremento sin justificar snapshots adicionales en producción. Sus fuentes, log final y alcance están incluidos en el recibo.

Productor/cohort ordinarios, paradas y relevos completos, personajes/puertas, cadencia y plataformas siguen pendientes. A6/A/B/C permanecen abiertos, D no iniciado; f-R3 conserva su cierre de seguridad. Los tres fallos preexistentes del host/timeline siguen separados y abiertos.
