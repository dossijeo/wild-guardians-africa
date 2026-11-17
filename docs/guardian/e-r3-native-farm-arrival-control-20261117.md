# Publicación y control de la llegada pendiente a granja

Continúa la [fuente tipada y su retención en Game](e-r3-native-farm-arrival-game-20261117.md), siguiendo el [plan principal](integrated-gpu-migration-plan-20261104.md). El baseline y los eventos existentes transportan ahora la petición de llegada vinculada. El control y el Host originales la validan como metadatos. La ruta de llegada preparada, su recibo gráfico, el final de llegada, Home y el productor ordinario de esta clase siguen pendientes; A6/A/B/C permanecen abiertos y D no se inicia.

## Referencia y decisión

Antes de adaptar la publicación se lee el código real de [`SceneReplicationInterface::on_sync_receive` y `on_delta_receive`, Godot 4.4 estable](https://github.com/godotengine/godot/blob/4.4-stable/modules/multiplayer/scene_replication_interface.cpp#L768). El receptor resuelve el sincronizador por su identidad, comprueba la autoridad y el nodo, descarta sincronizaciones antiguas y decodifica antes de aplicar el estado. El emisor `_send_sync` comprueba que el sincronizador esté confirmado para el peer antes de enviarlo. El hash del archivo consultado queda en la evidencia.

Se aprovecha la validación contra un propietario conocido y la separación entre nacimiento, recepción y estado aplicable. Se conservan el slot de actor, el log nativo, los cursores y el reloj causal existentes. Wild Guardians mantiene su orden contiguo y el rechazo antes de mutar el cursor: no adopta el protocolo de red ni la política de descartar paquetes de Godot. No se incorpora una biblioteca, cola, registro de cuerpos o modelo de movimiento adicional.

## Implementación

El bridge añade `pendingFarmArrivalRequests` al baseline sólo para peticiones nativas vinculadas vigentes. Un evento de estado6 añade `farmArrivalRequest` únicamente cuando coincide su secuencia nativa exacta. La declaración sin cuerpo continúa sin permiso físico; el primer vínculo publica una petición con secuencia nueva. Si Task ya sustituyó la llegada antes de drenar el log, el evento antiguo no recibe la referencia de la petición actual.

El sender existente ya transporta los campos del baseline y de sus eventos. El Host entrega explícitamente la nueva lista al control y rechaza valores malformados, incluido `null`, en vez de descartarlos. El control copia y congela pose y objetivo en el slot existente; valida época, sesión, actor, cuerpo, secuencia, tiempo y exclusión de otros propietarios. Rechaza duplicados y alias entre fuentes estacionarias pendientes conocidas. No expone la petición hasta recibir su watermark causal y deja de devolverla al ser sustituida o cerrar el control.

Una petición de llegada no crea un registro de ruta ni una admisión ejecutable. Los cambios directos a ruta, acción, Idle o Home siguen cerrados hasta conectar sus relevos preparados. Una petición Task genuina sí puede sustituirla con el mecanismo ya implementado; un sobre que invente una revocación de ruta se rechaza antes de cambiar el propietario o el cursor. La retención física sigue perteneciendo a Wild Engine, y el Task peer continúa avanzando en el mismo Game.

## Validación y límites

Pasan **1652 pruebas en 147 archivos**, con 1 omisiones opcionales, sin fallos ni cancelaciones. La selección dirigida pasa **50/50**, incluidas en esa regresión y no sumadas otra vez; el build termina correctamente en 1m 46s. Los 340 inputs congelados permanecen exactos durante las validaciones.

La [evidencia de validación](performance/native-farm-arrival-control-validation-20261117.json) registra resultados finales, selección, hashes y preservación. Se añaden 16 pruebas dirigidas a baseline/evento, los cuatro perfiles, standalone/pthread, nacimiento sin cuerpo, primer vínculo, reloj retrasado, sustitución por Task, fuente supersedida, identidad alterada, alias, exclusión de propietarios y cierre. El Host y el sender de producción ejercitan sus canales existentes con transporte y GPU deterministas explícitos; se comprueba el ACK de bootstrap y un fence posterior sin enviar comandos gráficos ficticios.

Un control negativo elimina temporalmente sólo el reenvío de la lista nueva en el Host. La prueba de rechazo de baseline falla por ausencia del rechazo esperado; el archivo se restaura byte a byte antes de las validaciones finales. La regresión preliminar interrumpida para endurecer el sobre Task no cuenta como resultado final.

No se modifica código nativo, roster, Surface ni preparación de recursos. Los 63 inputs y artefactos nativos permanecen exactos: no procede reconstruir los WASM. No se repite hardware ni se atribuyen a esta petición las métricas GPU anteriores. Las pruebas del control no demuestran todavía presentación, picking, asignaciones o continuidad gráfica de la llegada. La recuperación incremental integral de los 3.123 recursos, los recursos tardíos de pisadas y los picos de frame documentados siguen pendientes.

El siguiente punto es preparar y revalidar el corredor nativo de llegada sobre este mismo cuerpo y su punto de servicio real, usando el slot de propuesta y las pruebas físicas existentes. Después se conectarán su recibo, los recursos y el consumidor gráfico originales antes de activar el productor ordinario de esta clase. No se cambia la disponibilidad de guardado ni el rechazo actual de su restauración en la autoridad ordinaria.
