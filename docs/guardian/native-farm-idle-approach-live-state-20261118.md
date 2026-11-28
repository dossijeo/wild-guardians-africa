# Transporte vivo de la aproximación Idle

Continúa el [actor Farm → aproximación22](native-farm-idle-approach-graphics-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). La publicación confirmada del estado vivo reconoce la aproximación ya adquirida. La restauración fría de aproximaciones sigue pendiente. A6/A/B/C abiertos; D no iniciado.

## Problema y decisión

El ensayo real Farm23 → aproximación22 alcanzó la adquisición nativa y gráfica, pero falló al publicar Game: `serializeConfirmedState` utiliza `validateSnapshot(...,{livePhysics:true})`, que llamaba al lector de restauración local WALK. Este rechaza correctamente el destino ancla y el descanso conservado de la aproximación; ese rechazo no corresponde a una proyección viva.

Se lee el código real de [`SceneReplicationInterface` de Godot4.4](https://github.com/godotengine/godot/blob/4.4-stable/modules/multiplayer/scene_replication_interface.cpp#L855): `on_sync_receive` busca un sincronizador existente, comprueba autoridad y antigüedad y aplica sus propiedades; `on_spawn_receive` tiene una ruta separada de creación e instanciación. Se adapta la distinción entre sincronizar un propietario existente y declarar uno nuevo, mediante los validadores ya existentes de Wild Guardians. No se copia su protocolo ni se añade dependencia.

`livePhysics` selecciona `nativeIdleStrollLiveState` únicamente para el marcador adquirido `native-idle-stroll`. El marcador pendiente sigue usando `nativeIdleStrollSavedState`. El guardado, la carga y la normalización nativa fría siguen rechazando una aproximación que intentara hacerse pasar por un paseo local. No cambia el formato, el ABI, el propietario, el reloj ni la admisión gráfica.

## Validación y límites

Pasan siete pruebas nuevas: los cuatro perfiles conservan exactamente trabajador, descanso de nacimiento, RNG privado y destino ancla en JSON y transporte confirmado antes, durante y al final físico de22. Guardado/carga fríos siguen rechazándose y `confirmedStateSaveAvailable` sigue siendo falso. Tres casos malformados (descanso, destino y marcador pendiente) rechazan sin cambiar cuerpo ni asociación nativa.

El control anterior al cambio falla en los cuatro perfiles por el lector frío. Un primer ensayo dirigido posterior encontró que el compañero Task de la fixture ya había llegado sin migrar su propia acción; la fixture del transporte se reduce al actor de interés y conserva los cuatro perfiles. Los logs iniciales no se sobrescriben. La regresión de257 archivos termina con2901/2902 aprobadas, cero fallos/cancelaciones y una comparación opcional omitida; build correcto. Los424 inputs probados y64 inputs/artefactos nativos permanecen idénticos al congelado; no se reconstruye WASM. Se preservan16 archivos ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales.

El ensayo Surface en preparación también detectó un ancla mal situada dentro del edificio; con ancla exterior alcanzó22 y expuso este fallo de publicación. Sus módulos permanecen en un incremento separado. La adquisición parcial no acredita el recorrido completo, fases, picking, retiro ni cadencia GPU. No hay medición GPU aceptada nueva. Los [resultados y hashes](performance/native-farm-idle-approach-live-state-validation-20261118.json) delimitan la evidencia. Siguen Surface/GPU de aproximación, restauración, reintentos sin camino, productor/cohort, recuperación incremental de3.123 recursos y aceptación global de cadencia/plataforma.
