# Reconexión de transporte en la Surface retenida — 2026-11-19

Continúa `3b545d908`, A4/e-R3/f-R4. Los receptores existentes pueden sustituir sus puertos a partir de una frontera comprometida, conservar sus identidades públicas y volver a recibir publicaciones después de checkpoint/replay. La Surface coordina ese relevo sobre sus mismos propietarios gráficos. **El host/WorldWorker/cliente/UI ordinarios todavía no seleccionan este camino.**

## Referencia de código y decisión

Antes de implementar se inspeccionó [Redis 8.2.1, `replication.c`](https://github.com/redis/redis/blob/cd0b12938b6c99978440c6f7e44e34d7ff0aa537/src/replication.c), en particular `replicationResurrectCachedMaster` y `masterTryPartialResynchronization`. El primero enlaza una conexión nueva al cliente retenido y reinstala handlers, manteniendo su estado; el segundo valida identidad y rango antes de continuar. Revisión y SHA-256 están fijados en el recibo.

La adaptación mantiene las fachadas actuales de stream/terreno, el receptor de estado confirmado, el reloj, los actores y los propietarios GPU. Sustituye puertos, decodificador y cliente de consultas de transporte; una generación y la identidad del puerto descartan callbacks del enlace anterior. Es una adaptación al ciclo asíncrono de JavaScript, no una afirmación de que Redis utilice nuestro contador. No se añade dependencia, proxy público, caché, autoridad ni propietario gráfico.

## Implementación

- `assertRecoveryTransport` comprueba antes de mutar: capacidad retenida, puerto distinto, secuencia/tiempo comprometidos exactos, reloj coincidente, estado no fallido ni dispuesto y ausencia de entrada pendiente, checkpoint en exportación, hold/transacción histórica o propuesta nativa incompatible. El terreno además conserva su época y exige los propietarios visuales listos.
- `rebindForRecovery` conserva el estado aplicado. Descarta solo el wire aún no aplicado, sin ACK de aplicación ficticio; la historia autoritativa sigue perteneciendo al productor y debe reproducirse desde el cursor. Se cancelan preparaciones gráficas anteriores, se liberan sus reservas de recepción y se ignoran resoluciones/rechazos y créditos de otra generación. Los handles tardíos se abortan.
- El estado conserva su receptor, actor de datos, reloj e IDs ya consumidos; un decodificador nuevo recibirá snapshot completo antes del delta siguiente. El terreno conserva recursos y frontera aplicada, inicia replay en la misma época y difiere el ACK de negociación hasta terminarlo. No se cambia una revisión, tiempo o permiso físico para hacer encajar el canal nuevo.
- La negociación del puerto sustituto se hace después de replay y es independiente de la configuración del arranque. También funciona sobre un stream que nació en replay fresco con `handshake:false`; ese enlace nuevo debe negociar antes de reanudar al productor. Las disposiciones explícitas siguen siendo terminales.
- `Surface.rebindTimelineRecovery` hace ambos preflights antes de tocar los canales, captura efectos/trabajo actuales y bloquea dibujo/picking. Rechaza una transacción histórica activa o un propietario nativo pendiente. Usa después la reconciliación/checkpoint/replay/admisión final existentes; el controlador fallido no se reactiva. Un error después de empezar el relevo exige terminar esa Surface según el contrato previo.

Los propietarios que guardan referencias a stream/terreno, incluido el pump y las consultas lejanas, conservan la misma fachada. El camino fresco permanece disponible; una reconexión no declara sano un dispositivo o consumidor GPU fallido.

## Validación CPU y controles

**21 pruebas nuevas pasan.** El baseline original de 16 casos obtiene 0 pases/16 fallos. El baseline final, cargando los tres módulos anteriores desde sus URLs originales, obtiene **1 pase/20 fallos**; la ausencia de la capacidad retenida ya era compatible. Se prueba el protocolo con MessageChannel, snapshots guardados y eventos `Game` reales: prefijo no reaplicado, mismas identidades, snapshot completo/delta, dos reconexiones, peer separado frente a disposición explícita, estado parcialmente reconciliado rechazado, entrada/checkpoint pendientes, aborts/resoluciones/rechazos antiguos y crédito tardío.

Pasan **450 dirigidas/30 archivos**, **4060 de 4061 seleccionadas/318 archivos**, una omisión opcional y cero fallos/cancelaciones en esas selecciones; build Vite **47.08s**, seis sintaxis. Se verifican **540 inputs, 64 nativos intactos y 16 ajenos exactos**, sin recompilar WASM.

Se repiten por separado los dos controles fallidos previos con fuentes anteriores y actuales: timeline 19/20 con `Visual handshake timed out`, y host timeline que no termina en 25 segundos. Se retira únicamente el árbol de procesos de cada control propio; salidas y lista exacta se conservan. No se proclama suite universal ni se eliminan esos pendientes.

La primera validación ampliada se detuvo antes de completarse al detectar un defecto del nuevo relevo: conservar el flag inicial `handshake:false` de una Surface fresca omitía el hello del enlace sustituto. La prueba específica falla por timeout antes de corregirlo. La fuente previa a esa corrección se reconstruye byte a byte, coincide con el SHA del primer congelado y vuelve a producir **1 fallo/20 omisiones** en esa misma prueba final. La negociación se hace ahora por enlace; las 21 nuevas pasan. El primer log parcial no se cuenta como una regresión terminada. Todas las validaciones finales usan fuentes nuevamente congeladas.

Antes del commit se normalizan únicamente los terminadores de línea del receptor de terreno (CRLF y un CR a LF). Se conservan los bytes originales de CPU/GPU y se comprueba equivalencia exacta tras normalizar saltos; se repiten sintaxis y las **450 dirigidas**, todas pasan. El recibo distingue el SHA probado anterior y el publicado; no se atribuye otra ejecución GPU a este cambio de formato.

## GPU NVIDIA: propietarios retenidos y canales nuevos

Cuatro casos finales se ejecutan secuencialmente después de CPU/build: reconexión, readmisión de material, rechazo semántico y control fresco. Autoridad C++, commits de mundo1/mundo2, cohort/control directo, draw Worker y Surface son reales. Tiempo10, un trabajador quieto y desierto; las publicaciones completas/delta3/4 del relevo son fixtures de protocolo. No es todavía una partida con el productor/WorldWorker/UI ordinarios ni una prueba de locomoción o cadencia.

- La recuperación previa conserva **9 chunks, 175 nodos y 180 generaciones nativas inmutables vivas**, con 80 objetos para el chunk transitorio. El control fresco recrea **1.893**. Las copias iniciales de uniformes/bindings se registran separadamente; no hay forks de vértices/índices/texturas.
- La reconexión en secuencia2 conserva **stream, terreno, estado, renderer, dispositivo, escena y raíz del trabajador**: **0 fábricas/objetos y 0 forks uniformes/bindings/buffers/texturas**. El checkpoint idéntico posterior también obtiene cero en todas esas categorías.
- Se negocian los puertos nuevos y se reciben **snapshot completo3 y delta4**, con ACK y dibujo reales. Llegan a secuencia4 en la misma frontera nativa requerida por control, conservando las generaciones y la imagen: **0 objetos/fábricas y 0 forks nativos** en esas dos publicaciones y sus dibujos.
- El material0→1 sigue invalidando la prueba de escena y exige readmisión; el negativo de efectos incompatibles sigue rechazándose antes de fábricas y conserva la imagen anterior. Cada caso verifica disposición y finalización GPU reales, sin errores GPU/console/HTTP/red inesperados.

Las capturas retenidas conservan SHA-256 `2b37183648a9a4560cb6c8c78aa32b28dc368ce7f1578ab3683a85fcf1a46682`: 58.104 píxeles distintos del fondo, 2.316 de contraste en la caja proyectada del trabajador y rechazo del control vacío. Atributos CPU vacíos de bendiciones y targets de sombra ya destruidos antes de medir continúan informándose aparte. El Host solo recibe inventario de identidad de lectura para QA; stream/terreno/Surface servidos son producción sin bypass de sus métodos.

La sonda exploratoria anterior también pasó el relevo normal; los cuatro casos finales corresponden a la fuente posterior a corregir la negociación de arranque fresco. El caso específico fresca→retenida se valida en Node y el control fresco en GPU; no se presenta esa combinación como una sesión UI integrada.

Logs, fuentes servidas, fuentes externas fijadas, controles, PNG y hashes completos: [recibo de validación](performance/native-retained-rebind-validation-20261119.json).

## Siguiente punto

Conectar host/WorldWorker/cliente/UI: congelación y suspensión de dispatch, cursor/efectos actuales, proyección del checkpoint fuente ya implementada en `3b545d908`, reattachment de canales y replay, admisión nativa final y publicación/visibilidad sin recrear la Surface cuando sea recuperable. Después siguen productor/cohort/paradas/relevos ordinarios, cadencia y plataforma. No se declara ausencia de tirones. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos, f-R3 seguridad conserva su cierre y D no iniciado.
