# Llegada pendiente tipada y retenida en Game

Continua la [fuente nativa de llegada a granja](e-r3-native-farm-arrival-request-20261117.md). El bridge publica lecturas tipadas de la declaracion y de la peticion vinculada; Game puede conservar esa llegada mientras otro trabajador nativo avanza. Una tarea genuina, incluso generada por un cultivo dentro de `tick`, puede reclamar el mismo cuerpo como pendiente de recursos. Este incremento no prepara todavia la ruta de llegada a la granja ni activa su productor grafico ordinario. A6/e-R3/e-R4/f-R4/A/B/C siguen abiertos; D no se inicia.

## Codigo de referencia y decisiones

Se consulta [Detour 1.6.0, `dtCrowd::requestMoveTarget` y `updateMoveRequest`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L607). La solicitud conserva el objetivo y cambia su estado sin sustituir la posicion del agente; el resultado asincrono se contrasta con la fuente actual antes de incorporarlo. Se adapta esa separacion al propietario existente: el marcador de Game no concede movimiento y la lectura valida pose/objetivo contra C++, sin enviar posiciones a otro ejecutor.

Se mantiene tambien el criterio de [Godot 4.4, `NavigationAgent3D::get_navigation_map`](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L520): consultar el propietario real. El nuevo getter nativo de objetivo/posicion reutiliza el buffer temporal existente. Permite rechazar un punto de servicio o pose de Game que aun no coincida con el estado nativo **antes de crear la peticion**. No se introduce una cache de centros, registro de cuerpos, cola, reloj o dependencia.

## Referencia y declaracion

Los codecs distinguen `native-farm-arrival-declaration-reference` de `native-farm-arrival-request-reference`. La declaracion carece de cuerpo, radio y flags. Ambas copian valores propios e inmutables y conservan centro, punto de servicio, tolerancia original de dos metros, perfil, pose y fases. Rechazan campos de permiso, historia Idle/Home, fronteras de ejecucion ficticias y mezclas de tipos. No contienen una polilinea ni permiten ejecutar una ruta.

La declaracion de Game exige un trabajador realmente `arriving`, con contrato y centro validos, sin tarea/caja, ruta, recuperacion o retorno de raid. Los acumuladores nunca utilizados pueden empezar en cero, como en el movimiento existente; la orientacion debe venir de Game o de su valor de presentacion real. No se inventa una orientacion sustitutiva. Antes del nacimiento se contrastan la posicion nativa y el punto de servicio con los valores semanticos. La notificacion ordinaria de planificacion conserva ahora el marcador de esta clase en su lista existente.

## Espera y Task en el mismo cuerpo

Game valida la declaracion antes de avanzar tiempo o cuerpos y evita su rama `walkTo`. Una fuente aun sin cuerpo espera sin transformarse en actor nativo ejecutable; al vincular el cuerpo real obtiene una secuencia nueva. Una peticion vinculada puede participar en el cohort causal cuando la proyeccion tipada demuestra su pose exacta. No hay upsert ni desplazamiento JS. Las demas clases sin proyeccion mantienen su rechazo; una llegada sin marcador semantico tampoco entra en el cohort de Game.

La prueba inicial del cultivo que madura durante `tick` detecto que el rechazo de una asignacion podia ocurrir despues del avance del intervalo. Se conecto el relevo verdadero hacia la reserva pendiente de Task. El lote nativo conserva la pose en `NativeWorkerPoseResourceRequest` mediante la transferencia ya existente, cuyo campo interno se llamaba `heldIdleTaskSource`. El dato es comun y no contiene estado Idle ni una asociacion20/21. El slot de Task pendiente es el propietario siguiente; no se crea otro registro ni un ejecutor alternativo.

La asignacion inmediata de una ruta legacy sigue rechazada. La asignacion pendiente puede cambiar el objetivo logico sin mover el cuerpo. TaskStart14 comprueba fases/presupuesto contra la pose retenida y solo adquiere la ruta preparada mediante el protocolo existente. Las pruebas cubren una orden ordinaria y una cosecha automatica nacida dentro del intervalo, con el companero avanzando y el cuerpo de llegada inmovil hasta la admision14.

## Restauracion y limites

El snapshot conserva unicamente los valores semanticos y el marcador pendiente. Una nueva autoridad crea una declaracion nueva y vuelve a vincular el cuerpo; no guarda ni restaura referencias, permisos o handles de la autoridad anterior. La disponibilidad de guardado de interfaz queda cerrada para esta clase hasta completar su consumidor grafico. La autoridad ordinaria informa `unsupported-cohort`, en lugar de presentarla como una partida legacy o activar parcialmente el productor.

El relevo Home al terminar contrato aun no esta implementado para esta fuente. Tanto la espera vinculada como la declaracion fria rechazan esa frontera antes de avanzar el tiempo; no se permite una excepcion despues de mover al companero. Siguen pendientes publicacion/control de la llegada, propuesta/revalidacion de su ruta propia, recursos y recibo GPU, llegada preparada y relevos posteriores, productor ordinario y recuperacion integral. La reserva Task y las admisiones nativas de estas pruebas de Game no sustituyen un recibo grafico de esa transicion.

La suite de 209 archivos termina con 2023 pruebas aprobadas, cero fallos y una comparacion opcional de cache nativa omitida expresamente. Un archivo adicional comprueba dos relevos Task antes del primer cuerpo, en standalone/pthread: el conjunto unico son 2025 pruebas aprobadas en 210 archivos y una omitida. Las 34 comprobaciones dirigidas tambien pasan. Los 63 inputs/artefactos nativos quedan congelados tras reconstruir ambos modulos y el build WebGPU pasa en 57,69 s. La ejecucion intermedia se descarto al incorporar el relevo Task detectado por la prueba roja, sin presentar su salida parcial como resultado final.

La regresion del productor restaurado pasa en NVIDIA/Turing con estos binarios: conserva 569 IDs residentes, picking y hash CPU del rig; dibuja 54 frames en cada bloqueo de 1800 ms y confirma el drenaje real. Prepara 300 recursos de protocolo y crea otros 30 de pisadas tras READY. Registra un maximo global de 95,13 ms y de 34,26 ms en el bloqueo de adopcion. No prueba corregidos los picos previos ni valida en GPU la llegada nueva.

[Evidencia, hashes y validaciones](performance/native-farm-arrival-game-validation-20261117.json). El recorrido nuevo es de fuente/Game; la regresion de hardware del productor anterior se identifica separadamente. No se declara ausencia de tirones ni cierre de la recuperacion incremental de 3123 recursos. Los siete fallos previos documentados siguen fuera de la seleccion y no se presentan como corregidos.
