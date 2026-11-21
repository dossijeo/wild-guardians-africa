# Fuente tipada y petición Home desde el paseo suspendido

Continúa la [parada móvil adquirida sobre el actor original](e-r3-native-idle-stroll-stop-final-consumer-20261117.md). La fuente nativa retenida22 puede leerse sin reactivar su asociación de movimiento. Las APIs de proyección y petición usadas por Game consumen esa fuente actual y el control directo conserva la pose suspendida durante la petición Home. Falta la integración de este origen en roster/Surface y su aceptación gráfica; A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Implementación consultada y decisión

Se vuelve a leer el código real de [`dtCrowd::requestMoveTarget` y `dtCrowd::updateMoveRequest`, DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp): la petición conserva el agente, guarda destino/estado y después inicia la búsqueda desde `npos` y el corredor actual. Se adapta la separación entre el nuevo objetivo solicitado y su propietario físico retenido. La suspensión preparada de Wild Guardians sigue siendo necesaria antes de cambiar el futuro autorizado. No se sustituye Wild Engine ni se incorpora Detour como dependencia.

Se reutilizan el slot y las comprobaciones nativas `nativeHeldIdleStrollBodyCurrent` de la fuente Home ya implementada. No hay un cache JS de la última ruta válida, una fase REST inventada, otro cuerpo o una nueva historia de permisos.

## Lectura actual y petición

`nav_idle_stroll_held_source_snapshot` copia sólo la referencia real22 y su asignación desde el slot suspendido. No reconstruye una atestación gráfica ni inventa sus motores de puertas. `nav_idle_stroll_held_execution` comparte el escritor acotado42 con la lectura activa: devuelve pose ejecutada, generación suspendida, frontera actual y política privada. Edad y `approachRetry` quedan fijados en el instante de suspensión; no consumen tiempo durante la espera. Se mantienen las comprobaciones de actor, cuerpo físico, slot, flags, radio, centro y petición Home actual.

La lectura ejecutable anterior y su enumeración siguen excluyendo un paseo suspendido. La nueva vista tipada `native-idle-stroll-held-execution` distingue expresamente procedencia y permiso de movimiento. Sus campos y objetos se copian y congelan, sin registrar otra fuente mutable.

El bridge compara esa vista con la fuente nativa actual antes de llamar a la API Home existente. Acepta una captura anterior sólo si sigue siendo la misma fuente suspendida y todos sus valores fijos coinciden; su tiempo de observación puede ser anterior al actual. La API nativa vuelve a contrastar asignación, generación y cuerpo. La petición devuelta debe coincidir con la pose final, flags y perfil reales.

`projectNativeIdleStroll` puede proyectar la fuente retenida desde la posición lógica previamente conocida. `requestNativeIdleHome` admite este origen sólo con contrato terminado y los demás criterios existentes; proyecta la pose final, solicita Home y después cancela la intención Idle lógica. No cambia anticipadamente el cuerpo ni convierte un paseo todavía activo en una fuente Home. El tick ordinario y la capacidad de cohorte22 siguen pendientes; estas pruebas ejercitan las APIs reales de proyección/petición.

## Continuidad del permiso directo

Al recibir la petición Home directa, el control la contrasta una vez con la pose privada de la parada y la asociación22 revocada exacta. Conserva un único puntero a la petición actual dentro del registro existente. Mientras coinciden secuencia, cuerpo, generación y petición reconocida por el reloj, el permiso escalar del cuerpo detenido sigue vigente. No vuelve a calcular posiciones ni reconstruye una procedencia por frame.

La suspensión antigua conserva su criterio estricto de estado4 y pierde vigencia al pasar a espera de Home. El nuevo permiso de valores finales sí puede permanecer mientras se prepara o cancela un candidato Home. La adquisición de la ruta Home lo revoca y concede sólo el permiso Home correspondiente. Poses o procedencias alteradas se rechazan antes de modificar los propietarios del control; una secuencia aún no reconocida por el reloj no permite dibujar.

## Validación y continuación

Pasan **1.719 pruebas en 152 archivos, 230.324,419 ms** y el build de producto en **46,59 s**. Ambos módulos nativos se recompilan; se verifican los 149 inputs ensayados y los 61 inputs/artefactos nativos. Los 16 archivos locales protegidos y el helper pthread original sin seguimiento permanecen exactos.

Los diez casos nuevos usan la fuente nativa real, la parada12 revalidada, el control directo y las APIs reales de proyección/petición, en los cuatro perfiles y standalone/pthread. Verifican cuerpo y cantidad de cuerpos conservados, compañero que continúa, pose/fases/retry fijados, fuente activa ausente, petición idempotente, preparación/revalidación/cancelación y adquisición/llegada Home18. Incluyen sustitución de pose, asignación, generación y autoridad, barrera pendiente, retirada y petición directa alterada o sin reloj reconocido.

Instalar permisos de componentes en estas pruebas representa la adquisición gráfica; no ejecuta por sí mismo el roster/Surface de Home desde22 suspendido. Los resultados, comandos, entradas y alcance del ensayo de hardware del caso anterior sobre los binarios nuevos se registran en las [evidencias](performance/native-idle-moving-home-data-validation-20261117.json).

La parada móvil anterior se repite en NVIDIA/Turing sobre los binarios nuevos: **54 frames durante 1.800 ms**, **678 IDs de geometría/texturas conservados**, 68 recursos de protocolo y 120 copias de uniformes/bindings (13.664 bytes) durante preparación, cero asignaciones tras READY, cero errores y drenaje confirmado. No se presenta como evidencia de Home desde el cuerpo suspendido.

El siguiente punto es conectar este origen con la preparación Home del actor y Surface existentes, conservando pose/selección durante la espera. Siguen pendientes el relevo gráfico Home completo, tarea durante paseo, restauración móvil, otros finales/clases/puertas, productor/cohorte ordinarios y recuperación incremental integral de 3.123 recursos. No se inicia D ni se anuncia ausencia global de tirones.
