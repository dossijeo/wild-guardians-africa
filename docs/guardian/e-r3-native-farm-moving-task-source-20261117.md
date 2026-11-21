# Farm retenido → solicitud Task y TaskStart nativos

Continúa [Farm24 en Surface](e-r3-native-farm-arrival-stop-surface-20261117.md), siguiendo el [plan principal](integrated-gpu-migration-plan-20261104.md). La fuente y Game pueden reclamar una tarea genuina desde el cuerpo Farm23 detenido por24 y conservar su pose/fases/presupuesto hasta TaskStart14. El control directo, la admisión y el relevo gráfico Farm→Task todavía necesitan su integración. Home y los finales de llegada siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Código consultado y decisión

Antes de implementar se inspecciona DetourCrowd v1.6.0: [`requestMoveTarget` y `requestMoveTargetReplan`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L580) actualizan la petición sobre el agente existente; [`updateMoveRequest`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L677) procesa ese estado y puede aprovechar el corredor anterior al replantear. En Godot4.4-stable, [`set_target_position`](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L643) solicita replanteo y [`_request_repath`](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L839) restablece el resultado y los indicadores sin crear otro agente. Los hashes del código consultado constan en la evidencia.

Se adapta la separación entre propietario físico y nueva petición. Wild Guardians conserva el cuerpo y usa el descriptor inmutable de pose que TaskStart ya utiliza para otras fuentes retenidas y Farm pendiente. No se incorpora el crowd de Detour, otro planificador, una segunda tabla de trayectorias o dependencias. El corredor de Task lo calcula el planificador nativo ordinario y queda pendiente de adquisición; la ruta Farm anterior no concede movimiento al nuevo objetivo.

## Fuente física y petición

El commit del lote de tareas valida la fuente Farm completa antes de modificar las asignaciones: sólo acepta el modo pendiente de recursos, el perfil actual y el cuerpo Farm realmente retenido, con su slot/generación, registro de suspensión, pose y propietario coherentes. Farm móvil o llegado sigue rechazando el reemplazo inmediato; el planificador continúa eligiéndolo como candidato `arriving`, de modo que no se oculta la prioridad de Task excluyéndolo de la selección.

La captura compartida toma de la ejecución retenida posición, yaw, fases Run/Walk/Carry, radio, flags, presupuesto y secuencia de asignación. El nuevo intent conserva esa pose en `heldIdleTaskSource`, contenedor existente que ya admite solicitudes Farm pendientes pese a su nombre histórico. Libera el corredor anterior sin emitir la cancelación de su procedencia gráfica y publica solamente el cambio hacia la solicitud6. No crea un cuerpo, historia Idle, Home o asignación ejecutable ficticia.

TaskStart reutiliza sus pruebas existentes de cuerpo, reservas, terreno, tiempo y fases. Cambiar el presupuesto o cualquier fase deja de poder preparar la ruta. Revalidar o cancelar el candidato no mueve el cuerpo retenido; sólo el commit preparado14 adquiere el nuevo movimiento. Los callbacks de eliminación y los controles de escritura del cuerpo usan la misma pose retenida existente.

## Game y prioridad de tareas

El cohort nativo reconoce ahora el Farm físicamente detenido mediante el predicado estricto de su fuente. Game verifica su proyección actual antes del avance y conserva la pose en el bucle de trabajadores, sin invocar pathfinding ni movimiento JS. Los otros cuerpos del cohort siguen avanzando. El Farm móvil no entra por esta excepción.

La selección ordinaria puede reclamar un harvest ya encolado o uno que aparece al madurar un cultivo dentro del mismo `tick`. El trabajador pasa directamente de `arriving` retenido a `waiting-task/pending-resources`, sobre el mismo cuerpo y con `idleState` nulo. No se pospone la elegibilidad ni la maduración para facilitar la preparación. Mientras TaskStart espera recursos, el cuerpo permanece quieto; el commit preparado permite avanzar con el ejecutor Task ya existente.

Los cruces de contrato o retorno que todavía requieren Home se rechazan antes de avanzar el tiempo o los cuerpos. El baseline de un consumidor gráfico nuevo para Farm retenido y su guardado UI siguen requiriendo la integración pendiente. Reconocer el cohort físico en Game no constituye por sí solo una lease del draw Worker ni completa el productor ordinario.

## Validación y límites

La [evidencia](performance/native-farm-moving-task-source-validation-20261117.json) recoge16 casos nuevos con cuatro perfiles en standalone/pthread, reclamación ordinaria, fases y presupuesto exactos, cancelación/revalidación tardía, rechazo del reemplazo inmediato, escrituras físicas, eliminación del cuerpo, avance de Game y maduración dentro del tick. También verifica que alterar la pose viva o cruzar una frontera Home no implementada rechaza antes de avanzar. Son commits ABI de confianza; no son recibos gráficos ni una prueba de relevo Farm→Task en GPU.

La prueba previa, ejecutada sobre el estado anterior, detecta que la reclamación descartaba la procedencia gráfica del Farm retenido. El control negativo compila en `.cache` una variante standalone que elimina únicamente su captura de pose, manteniendo intactos el árbol y los WASM de producto: vuelve a detectar esa pérdida. El segundo control elimina por loader la rama que conserva Farm quieto en Game; el test intenta entonces entrar en el mover JS prohibido y falla.

El primer intento de ejecutar el control WASM sólo fijó variables de entorno; el fixture carga un módulo por URL y siguió usando el binario de producto. Ese resultado no se cuenta como evidencia negativa. La ejecución válida redirige explícitamente esa URL mediante un loader de lectura. Se conserva tanto el intento inicial como el fallo intencionado correcto.

Una ejecución de desarrollo arrancó antes de terminar pthread y ocho casos leyeron el módulo anterior. Se conserva ese fallo de orden; la ejecución definitiva espera ambas compilaciones y pasa65 casos. La validación final dirigida pasa189. La regresión seleccionada usa231 archivos y el build de producto pasa. Los siete fallos históricos fuera de esta selección no se declaran corregidos.

Se recompilan ambos módulos y se congelan64 inputs/artefactos nativos: cambian dos fuentes y dos WASM, sin exportaciones nuevas; el runtime `.mjs` y el worker pthread conservan sus bytes. Se verifican377 entradas de validación y los16 archivos locales ajenos. No se repite hardware con estos nuevos binarios: las mediciones641 IDs/0 recursos tardíos del commit anterior son históricas, no una aceptación de Task14 con esta fuente.

Quedan el control/admisión/puertos/actor/Surface del relevo Farm→Task, Home, finales, cohort y productor completos, guardado/recuperación y continuidad. Permanecen abiertos los intervalos gráficos medidos y la recuperación incremental de los3.123 recursos. Se mantiene A/A6 → B1–B7 → C antes de D.
