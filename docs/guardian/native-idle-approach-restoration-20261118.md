# Declaración y restauración de aproximaciones Idle

Continúa el [relevo Farm → aproximación → Idle](native-farm-idle-approach-surface-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). Se cargan los valores semánticos de una aproximación en una autoridad nueva y se prepara un22 nuevo antes de mover el cuerpo. Roster/Surface/GPU de esta restauración y la política nativa de fallo/reintento siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Referencias de código y decisión

Se consultan las implementaciones reales de [`dtCrowd::addAgent` y `requestMoveTarget` en DetourCrowd1.6](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L511): el alta del agente y la petición de destino son operaciones distintas; la petición conserva destino y reinicia su referencia de consulta. También [`NavigationAgent3D::set_target_position` y `_request_repath` de Godot4.4](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L643): se conserva el destino elegido y se reinicia el resultado derivado incluso al solicitar el mismo destino.

Se adapta ese patrón al registro WALK existente, sin motor, dependencia, registro de cuerpos, trayectoria o cola nuevos. Una solicitud explícita de aproximación conserva su objetivo original y no hereda un corredor o permiso viejo. No se transforma en un paseo local ni reevalúa el cultivo más cercano.

## Datos, ABI y adquisición

El guardado conserva los campos Game existentes: modo WALK, ID del ancla como destino, descanso de nacimiento, RNG, reintento, pose y fases. No guarda fuente Farm, handles, tickets ni asociaciones gráficas. El formato de save sigue siendo1; el indicador semántico de la solicitud nativa es `approach:true`, omitido en el paseo local. El control impide eliminarlo incluso si el actor ya está dentro del radio y el DTO sin él parece local.

El lector nativo pasa a versión2 y añade un campo0/1 al final de la fila, ahora de29 doubles. La entrada local mantiene sus17 argumentos y su restricción al radio. `nav_intent_restore_idle_approach` usa el mismo registro común y exige que el destino sea exactamente el ancla. La versión evita leer el campo añadido sobre binarios antiguos. Se recompilan los módulos normal y pthread desde las flags/exports canónicas; cambian siete inputs/artefactos nativos. El worker pthread sin seguimiento permanece idéntico.

La declaración no tiene cuerpo utilizable hasta su binding nuevo. La preparación22 retiene la pose y RNG mientras revalida su origen real; no crea20/21 ni vuelve a asociar la Farm anterior. La nueva22 conserva el nacimiento de la aproximación, su destino ancla y el RNG durante WALK. En la llegada, la plantilla original cancelWalk produce el mismo REST que antes de guardar, sin doble consumo. Contrato vencido declara Home nuevo en vez de reanudar WALK. El guardado desde la UI sigue sujeto al gate existente para todo Stroll; este cambio no lo habilita.

## Validación y límite sin camino

Pasan47 pruebas nuevas y138 dirigidas en9 archivos. Los cuatro perfiles prueban fuente nativa normal/pthread fuera del radio, dentro y en el destino; se conserva también la llegada sin desplazamiento. Game retiene la solicitud antes de adquirir, resalva sus valores, continúa con rutas válidas hasta REST y declara Home al vencer el contrato. El controlador existente exige metadatos, reloj e instalación reales; se prueba adquisición tardía, eliminación del tipo y relevo a21. La instalación gráfica de estas pruebas de control es simulada, sin recibo GPU nuevo de la aproximación fría.

La geometría recién generada de la fixture contiene un punto fraccionario guardado sin conector de inicio válido. La navegación original también devuelve null; la preparación nativa devuelve unknown. El ensayo exige conservar cuerpo, destino y RNG sin inventar una ruta, retarget o permiso. La transición nativa de fallo/reintento hacia REST aún no está migrada: ese caso NO se declara restauración completa. Las otras posiciones con ruta válida sí alcanzan el mismo blueprint REST. Las primeras sondas y fallos se conservan; se corrigen una fixture demasiado cerca del radio y expectativas que todavía exigían rechazar cualquier checkpoint de aproximación.

La regresión amplia de261 archivos aprueba2966/2967, cero fallos/cancelaciones y una comparación opcional omitida. El código frío anterior cargado de sólo lectura reproduce36 fallos esperados,11 casos filtrados y cero cancelaciones. Build correcto;431 inputs y64 nativos permanecen idénticos al congelado posterior a la compilación.

Las ejecuciones GPU nuevas son regresiones del relevo Farm vivo y de la restauración LOCAL ya existente, no acreditan aún esta aproximación fría. Sus cifras y límites de cadencia constan en los [resultados, referencias y hashes](performance/native-idle-approach-restoration-validation-20261118.json). La aceptación global de ausencia de tirones sigue abierta; tampoco se cierra Home264/147ms ni plataforma integrada.

Regresiones GPU: vivo conserva652 IDs,70/98 preparados y0 tardios; ventana1236 max157.495ms/3>50, global5>50. LOCAL conserva575 IDs,100 preparados/0 tardios; ventana max46.765ms/0>50, global4>50. Sin aceptacion de cadencia ni causa atribuida.

Se preservan16 archivos ajenos y los bytes anteriores de los cuatro documentos principales. Siguen roster/Surface/GPU de aproximación restaurada, salida nativa de fallo/reintento, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación global de cadencia/plataforma.
