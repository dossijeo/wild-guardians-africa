# Attachment retenido en el host de producción — 2026-11-19

Continúa `a6643b56c`, A4/e-R3/f-R4. El host existente acepta el cursor y los checkpoints de efectos capturados por la Surface retenida y utiliza la proyección de `3b545d908`. Obtiene su propio handoff de terreno de la autoridad, prepara el replay antes de sustituir el transporte y lo inicia después de resolver esa sustitución. **La selección desde WorldWorker/cliente/UI todavía está pendiente.**

## Referencia y decisión

Se vuelve a leer el código real de [Redis 8.2.1, `masterTryPartialResynchronization` y `replicationResurrectCachedMaster`](https://github.com/redis/redis/blob/cd0b12938b6c99978440c6f7e44e34d7ff0aa537/src/replication.c): identidad/rango e historial se verifican antes de activar la conexión y enviar el sufijo; el cliente retenido conserva su estado. Revisión y bytes exactos se archivan en el recibo. Nuestra adaptación separa preparación e inicio del replay existente para que un ACK temprano no pueda abrir el stream vivo durante el relevo de terreno. No se atribuye a Redis nuestra API `deferStart/start`.

No se añade dependencia, diario, cola de publicaciones, caché, propietario físico ni permiso GPU. Se mantienen la congelación de autoridad, watchdog, rechazo/reintento, renovación de checkpoint, visibilidad y activación existentes.

## Cambios

- `worker-hosted-runtime` transmite opcionalmente `retainedCheckpoint` como datos, transfiriendo solo los tres endpoints de transporte. El consumidor no puede suministrar un handoff autoritativo ni sustituir el control nativo en una recuperación retenida.
- `worker-runtime-host` exige perfil temporal/de trabajo, valida la historia y obtiene `inspectTerrainRecoveryHandoff` en su propia frontera congelada. Proyecta el checkpoint y el sufijo antes de `reattachTerrain`; el handoff procede de la autoridad. Solo después de resolver terreno y, para recuperación fresca, control, comienza el replay. La base original del diario se conserva.
- `presentation-recovery-replay` admite preparación diferida. `wake()` no la salta; `start()` revalida la base y no duplica mensajes. La disposición es terminal. Los fallos de attachment retiran el replay preparado para permitir el reintento explícito existente.

## Evidencia

**12 pruebas nuevas pasan.** Dos de inicio diferido fallan con la fuente anterior (23 casos previos omitidos por filtro); las diez nuevas de host fallan con los tres módulos anteriores. La selección intermedia completa pasa 80/80. El host se empaqueta en modo producción `DEV:false`, con WorkerGameRuntime, diario y encoder existentes, autoridad Wild Engine real y canales MessageChannel/receptor temporal/estado confirmado reales.

Los casos directo y preparado parten de base1, retienen2 y reproducen solo3; un relevo de terreno bloqueado no emite checkpoint y su resolución tampoco confirma attachment antes del ACK real. Se conserva la identidad del actor de datos. Tras negociación/finish/visibilidad/activación, el mismo host publica snapshot completo4 y delta5 desde el nuevo encoder. No se reatacha el control nativo. Cursor, efectos o tiempo de trabajo incoherentes, handoff aportado por cliente, handoff real obsoleto y puerto de control sustituto rechazan antes de cambiar terreno. Un fallo del cambio de transporte retira el replay preparado y permite reintentar.

El adaptador de conexión con la autoridad, el transporte de terreno y los headers de efectos son fixtures. No se demuestra todavía un relevo con la Surface dentro del WorldWorker ordinario, ni un frame GPU/UI, ni ausencia de tirones.

Validación final: **599 dirigidas/40 archivos**, **4209 de 4210 seleccionadas/328 archivos**, una omisión opcional, cero fallos/cancelaciones en esas selecciones; build Vite **49.93s**, cinco sintaxis. Fuentes congeladas: **556 inputs, 64 nativos intactos, 16 ajenos exactos**; no se recompila WASM.

Se contrastan por separado los fallos existentes: dos casos de `worker-runtime-host-historical-recovery` producen `releaseCommand is not a function` tanto antes como ahora (3 pases/2 fallos). Los otros controles anteriores siguen con timeline19/20 por timeout de negociación y host timeline sin terminar en25s, también antes/ahora; se retiran solo sus árboles propios. No se declara suite universal ni se ocultan esos pendientes. Las primeras pruebas nuevas omitían ACK del consumidor principal y una publicación de arranque válida; los arneses se corrigen y los logs fallidos/parciales se conservan fuera de la aceptación final.

El controlador inicial tenía un plazo de360s, menor que los587,97s registrados en la regresión completa anterior. Se retira únicamente ese controlador y se observa el **mismo proceso Node16224** mediante su handle de Windows abierto hasta su salida0; después se compila. No se reinician las pruebas ni se cuenta un log parcial como aceptación. Comando, recibo terminal y hashes se conservan.

**No hay ejecución GPU nueva en este avance.** Los cuatro casos y ceros de asignaciones/forks de `a6643b56c` son evidencia heredada del componente Surface, no una validación GPU del attachment ordinario del host.

Logs completos, baseline con fuentes anteriores, controles, listas exactas, fuente externa y hashes: [recibo](performance/native-retained-host-validation-20261119.json).

## Siguiente punto

Conectar el RPC de reconexión de WorldWorker/cliente y seleccionar el camino retenido en la UI sobre el mismo binding/canvas. Invalidar testigos de frame anteriores, comprobar salud GPU real, exigir admisión nativa y frame nuevo de cámara/viewport actuales antes de publicar. Conservar imagen/dispatch bloqueado ante un attachment ambiguo y usar la recuperación fresca donde no sobrevivan los propietarios. Después siguen productor/cohort/paradas/relevos/cadencia/plataforma. A6/e-R3/e-R4/f-R4/A/B/C siguen abiertos; f-R3 seguridad conserva su cierre y D no iniciado.
