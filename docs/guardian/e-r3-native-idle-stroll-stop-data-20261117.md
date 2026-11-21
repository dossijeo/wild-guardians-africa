# Referencia tipada y adaptador de la parada móvil

Continúa la [revalidación nativa y su recibo](e-r3-native-idle-stroll-stop-revalidation-source-20261117.md). La fuente ya recalcula la parada al avanzar la autoridad. Este incremento permite capturar, copiar, cancelar y revalidar esa propuesta con identidades explícitas, y leer su asociación nativa preparada/adquirida. Los puertos y el Host todavía no admiten la nueva parada con autoridad continua. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Referencias leídas y decisiones

Se volvió a leer [`Arena::get`, Rapier v0.22.0](https://github.com/dimforge/rapier/blob/v0.22.0/src/data/arena.rs): el índice sólo identifica una ocupación con su generación exacta. Se adapta la comparación de sesión, actor, asignación, slot y generación antes de reconocer el propietario. No se permite convertir una huella de slot liberado en una ruta ejecutable.

Se contrastó el recorrido de preparaciones aplazadas de [`prepare_assets`, Bevy v0.17.2](https://github.com/bevyengine/bevy/blob/v0.17.2/crates/bevy_render/src/render_asset.rs), que descarta versiones previas cuando el ID fue actualizado o retirado. La referencia separa propietarios de datos de presentación, y distingue una propuesta obsoleta de una versión posterior compatible. Se reutilizan nuestros codecs, sobre de mundo y propietarios existentes; no se añade dependencia ni registro de permisos.

## Datos y lectura de fuente

`native-idle-stroll-stop.js` define una referencia inmutable de familia 12: frontera del mundo, ruta 22 solicitante, propietarios de rutas afectadas y motores. Cada ruta conserva actor/asignación/handle, cuerpo, clase de consecuencia y generación suspendida; cada motor conserva ID/mecanismo. Los conjuntos rechazan duplicados, huecos, sesiones o épocas ajenas y generaciones fuera de 32 bits.

Las poses y aperturas siguen en las filas nativas de 26 y 3 valores del **mismo sobre de recursos de mundo**. La propuesta exige cero chunks y eliminaciones, frontera coincidente, velocidad/running detenidos y semántica física válida. Copia los buffers antes de entregarlos a otro propietario; modificar esa copia no cambia la fuente ni la referencia. **Copiar datos o comprobar igualdad de propietarios no prueba que una pose haya sido dibujada.**

El ticket tipado se devuelve aparte del sobre, que conserva su `ticket` numérico. Incluye la ruta fuente para comprobar su asociación 22 vigente al capturar/revalidar. Una revalidación sucesora conserva los propietarios y la autoridad y avanza ticket/tiempo. Si el cierre cambia, la fuente devuelve la nueva propuesta y `sameResourceOwners: false`; no fabrica una asociación a la preparación anterior.

La atestación contiene la referencia actual y la preparada. El adaptador la contrasta con los cinco valores del recibo C++, la publicación canónica de familia 12 y los propietarios físicos actuales. La lectura usa la nueva consulta **sólo de lectura** `nav_intent_stopped_route_matches`: comprueba la asignación exacta y los metadatos que ya conserva el slot. Para suspensiones valida la generación siguiente y el tiempo; para rutas liberadas valida la huella inactiva y su siguiente generación. No recorre eventos ni crea un historial. Los getters existentes comprueban además cuerpo suspendido, slot, generación, tiempo y mecanismo del motor.

El bridge y el planner exponen `prepare/capture/revalidate/cancelNativeIdleStrollStopProposal` y `nativeIdleStrollStopBinding`. No añaden un commit que eluda el transactor y el recibo gráfico. La cancelación comprueba la familia 12 antes de usar el cancelador de mundo compartido; una referencia fuente alterada se rechaza antes de revalidar la candidata. El selector de ocho enteros se comparte con el recorrido gráfico anterior.

## Validación

Las [evidencias](performance/native-idle-stroll-stop-data-validation-20261117.json) registran los comandos, módulos, entradas y resultados de este incremento. Las pruebas son de fuente y codecs; los commits ABI explícitos no simulan recibos gráficos.

Los cuatro perfiles en standalone y pthread capturan y revalidan dos veces sin mover cuerpos durante la captura, cambiar Game/RNG ni ampliar capacidad ordinaria. La asociación sólo aparece después del commit nativo correcto. Se rechazan asignaciones, cuerpos, generaciones y fronteras preparados sustituidos, aliases Home, geometría ficticia, buffers físicos inválidos y cancelaciones de otra familia. Se verifica la huella de una ruta realmente liberada y el cierre real que incorpora un segundo Home: la nueva referencia no puede asociarse al template anterior de un solo cuerpo.

Pasan **269 pruebas en 24 archivos, 86.168,5868 ms**, incluyendo las 15 pruebas de datos nuevas y la fuente revalidada, cuerpos suspendidos, movimiento, puertos y terreno afectados. Ambos módulos se recompilan; la única modificación C++ es la consulta de identidad sin escrituras. La regresión completa 1.617/142 del incremento anterior queda identificada como evidencia de aquel commit, sin presentarla como una nueva ejecución completa.

Se repite también la aceptación gráfica anterior con los binarios actuales. NVIDIA/Turing conserva 681 IDs residentes; prepara 68 recursos de protocolo y el Host copia 120 uniformes (13.408 bytes) y 120 bindings. No crea shaders/pipelines, no copia buffers estáticos/texturas y no asigna tras READY. Hay 54 frames durante el bloqueo de 1.800 ms, ambos picks y drain correctos, sin errores GPU/consola/página/transporte; se inspecciona la captura. **Ese recorrido conserva todavía el reloj de autoridad durante la preparación; no valida el nuevo relevo GPU revalidado.**

El build de producto pasa en **48,71 s**. Los 61 hashes nativos y los 16 archivos ajenos protegidos se verifican; el helper pthread original sigue sin seguimiento y byte a byte intacto.

## Continuación

Sigue la integración del template/recibo en el transactor, el canal de terreno y el control directo, y del estado final en roster/motores/Host sin detener la autoridad durante preparación. La admisión debe usar el programa y los datos finales nativos, no declarar preparada una pose anterior por conservar sus IDs. Después continúa Home desde el cuerpo suspendido. Tarea durante paseo, restauración móvil, cohorte/productor ordinarios y recuperación integral incremental de los 3.123 recursos siguen abiertos; no se inicia D.
