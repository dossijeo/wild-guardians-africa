# Origen Idle nativo desde la liquidación adquirida

Continúa A2/A4/e-R3/f-R4 tras [la segunda tarea ordinaria](native-post-settlement-next-task-20261120.md). El siguiente hueco era el nacimiento del Idle autónomo desde17: Game proyectaba la liquidación y conservaba el cuerpo, pero no declaraba un ciclo21 ni un acercamiento22. Este incremento completa su componente nativo; todavía no habilita su producción ordinaria ni acredita aceptación gráfica. A6/A/B/C siguen abiertos, D no iniciado y f-R3 solo seguro.

## Referencias y decisión

Se releyó el código real de [Godot4.4 NavigationAgent3D._transition_to_navigation_finished](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp): conserva el RID y separa finalización y llegada. Su modificación directa de velocidad no se copia fuera de nuestra frontera preparada. [DetourCrowd1.6 requestMoveTarget/resetMoveTarget/updateMoveRequest](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp) cambia intención/corredor sobre el mismo m_agents[idx]. Se adapta esa retención mediante los21/22 y la prueba de reserva existentes. Fuentes y hashes archivados; ninguna dependencia, registro, cola, temporizador o autoridad nueva.

## Implementación y límites

C++ lee la pose, cuerpo, banderas, perfil físico, sesión, secuencia y tiempo reales de17. El ancla, la semilla privada y el perfil de animación se declaran desde Game como en el nacimiento Idle existente; Worker nativo no almacena ese perfil de animación. El descriptor acotado de26 valores mantiene el discriminador17 y no embebe un árbol de permisos. No suplanta un20 inicial ni una llegada23.

Dentro del ancla prepara el ciclo21 con REST de nacimiento original. Fuera prepara22 hacia el ancla directamente, sin adquirir antes un REST ficticio. Reutiliza prepareRouteTiming y proveGateRouteAdmission con stationaryFrom; no hay otro planificador. El xorshift32 privado, la semilla y las duraciones siguen idle.js; preparar no consume el RNG de Game ni instala semántica. Al commit se retira la intención17 con releaseIntent sin notificación intermedia, limpiando también byTarget, y se instala el sucesor sobre el mismo cuerpo. Cancelar mantiene17; revalidar tras una espera conserva origen y programa, con nueva frontera temporal.

Se añaden cuatro exports optativos al script canónico: snapshot de origen17, stage21, stage22 y snapshot del origen17 de22. Standalone 745→749; pthread 766→770 exports WASM, estos últimos minificados. Los nombres públicos los resuelve su módulo JS canónico, también recompilado. No se eliminan exports ni se cambia el ancho26 del descriptor;22 añade sourceSettlement como metadato opcional acotado. Los entrypoints antiguos conservan sus contratos.

El productor ordinario, el control de admisión y el roster gráfico no se amplían aquí. No pueden aceptarse estos nuevos orígenes como permisos GPU por el mero hecho de decodificarlos. El siguiente incremento debe correlacionarlos con la liquidación realmente adquirida, conservar rig/bancos/IDs/fase y cubrir cancelación, tareas y Home antes de habilitar el productor.

Un diagnóstico con baseline17 adquirido confirma que `admitIdleCycle` y `admitStroll` rechazan todavía ambos orígenes y mantienen vigente17. El primer intento del diagnóstico utilizó un nombre de método incorrecto; se corrigió antes de registrar el resultado válido. Ambos intentos se conservan, sin atribuir el error de invocación al producto ni presentar el diagnóstico como evidencia GPU.

## Validación

- 30 casos nuevos: standalone/pthread conservan cuerpo y compañero durante preparación; cancelación y revalidación; adquisición tardía; cuatro perfiles y paridad con idle.js; acercamiento, llegada real22 y relevo a21; destino ocupado; identidad/semántica inválidas; retirada física y espejos Game incompatibles.
- 95/95 dirigidos con las regresiones de Farm. Suite nueva 4969/4970, 1 omisión opcional,0 fallos/0 cancelaciones en373 archivos (736.566s); build de aplicación nuevo (118.149s); 6 comprobaciones de sintaxis.
- Standalone y pthread canónicos compilados en 63.548s y 68.047s. La primera compilación falló por una firma releaseIntent incorrecta y se corrigió antes del build válido. Logs de ambas archivados.
- Los cuatro casos iniciales reproducían unsupported con el código/binario anterior. El primer fixture de acercamiento apuntaba a un destino ocupado por una tarea del compañero: devolvió conflict correctamente. El escenario de continuidad autoriza otro cultivo antes de crear la autoridad, sin mover cuerpos vivos; una prueba separada conserva explícitamente el rechazo por destino ocupado. No se atribuye ese conflicto a un fallo del algoritmo.
- Otra comprobación usa el fixture final y la autoridad standalone real del padre: los dos ingresos seleccionados fallan unsupported, con28 casos filtrados. Su checkpoint semántico previo se genera con los mecanismos actuales de tarea/acción; no acredita un binario padre pthread. Loader, comandos, hashes y resultado están en el recibo.
- 707 entradas probadas,998 fuentes de ejecución,64 entradas nativas,16 archivos ajenos y38 A5 externos verificados por SHA. Los historiales de los cuatro documentos principales se conservan por bytes detrás de esta cabecera.

No hay nueva medición GPU ni aceptación de cadencia, picking, fase visual o del caso global3.123. La suite/build concurrentes son validación funcional y no medidas de rendimiento. Se conserva el rechazo de una reconstrucción gráfica global como solución de continuidad.

[Recibo y mapas verificables](performance/native-post-settlement-idle-source-20261120-validation.json).
