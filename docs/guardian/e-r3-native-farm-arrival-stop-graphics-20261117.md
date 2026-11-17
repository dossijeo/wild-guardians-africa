# Farm24 en el actor y roster originales

Continúa el [cliente y Host Farm24](e-r3-native-farm-arrival-stop-remote-20261117.md), siguiendo el [plan principal](integrated-gpu-migration-plan-20261104.md). El roster prepara la parada sobre el Farm23 admitido y conserva actor, raíz, geometrías, índices y datos de movimiento. Surface, anuncio de capacidades en el draw Worker y hardware24 siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Código consultado y decisión

Antes de implementar se inspeccionan las implementaciones de Three r180: [`Mesh.copy`](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L112) comparte la geometría y [`SkeletonUtils.clone`](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/SkeletonUtils.js#L388) remapea huesos sobre la jerarquía clonada y conserva referencias a geometrías y materiales. Las copias locales consultadas y sus hashes figuran en la evidencia. Se aprovecha la separación entre recursos compartidos y estado de instancia del actor residente, sin volver a adquirir el GLB, clonar otro rig o introducir dependencias.

Se adapta el ciclo existente de parada Idle12: preparación de variante/enlace, captura, aceptación del recibo final, activación, attach, finalización y retiro diferido del enlace anterior. Farm24 conserva su familia explícita; no se crea otro roster ni un controlador de cuerpos paralelo.

## Implementación

`prepareNativeTerrainStops` acepta la plantilla Farm24 por su campo propio y rechaza familias simultáneas. La fuente seleccionada debe coincidir con el Farm23 admitido en el mismo registro. Los selectores de los afectados llevan la familia de la operación de parada, sin convertir un dependiente en otra fuente Farm.

El preparador de movimiento detenido conserva la tabla/textura de la ruta y prepara los materiales sobre el actor original. La aceptación exige asociación24, referencia preparada exacta, propietario retenido y proyección final. El soporte final se vuelve a comprobar. La procedencia Farm retenida se construye con el codec existente antes de modificar el estado final del candidato; usa cuerpo, asignación, slot/generación, instante y pose del recibo adquirido.

Mientras se prepara, los campos físicos pueden avanzar mediante la proyección nativa original. El estado semántico restante permanece fijado. Al proyectar la parada en Game sólo se normalizan el marcador `native-farm-arrival-held` y los indicadores de ejecución: exige la pose final exacta y `running/gateWaiting` falsos. El trabajador sigue `arriving`, con `idleState` nulo. El clip Idle visual usa el reloj detenido ya implementado; no fabrica una intención Idle, Task o Home.

Cambiar centro, contrato, tarea, estado o propietario del modelo revoca la preparación. Esto no excluye al trabajador de la selección original de Task: los relevos preparados Farm→Task/Home siguen pendientes y no se ocultan retrasando la asignación de tareas. Cancelar o revertir el candidato restaura materiales y conserva el enlace móvil anterior; retirar ese enlace tras adoptar conserva la tabla compartida mientras el detenido la utiliza.

## Validación y límites

La [evidencia de validación](performance/native-farm-arrival-stop-graphics-validation-20261117.json) registra 17 casos nuevos: cuatro perfiles con y sin urgencia (Walk/Run según perfil y presupuesto), revalidación tardía con Task14 independiente, entidades confirmadas actuales/desacopladas/modificadas in situ, rechazo de pose final inventada, familias y recibos ajenos, cancelación/rollback, cambios semánticos, picking original y pthread.

Se usan fuente nativa Farm23→24, Game, GLB, bancos de clips y terreno reales. Se comprueba una adquisición del modelo, las mismas identidades de actor/raíz/geometrías/índices y el mismo registro de movimiento durante preparación y adopción. La compilación TSL real de color y sombra conserva los selectores24; compara además las referencias de texturas entre el material móvil y detenido, sus arrays y versiones. El picking original continúa encontrando el cuerpo retenido al avanzar el reloj visual.

Renderer, admisión y testigo de picking presentado son dobles. El commit de la fuente usa ABI de confianza; este fixture no constituye un recibo GPU ni una prueba de Surface/Host integrado. No hay medición hardware nueva, ni presupuesto de creación de pipelines/materiales de la escena completa. La estabilidad de estas identidades no acredita cero asignaciones gráficas globales.

La primera ejecución falla en ocho casos por consultar el cuerpo inexistente2 del fixture; el Task concurrente genuino es el cuerpo3. Se corrige esa consulta y se añade la comparación física de texturas; no se relajan las comprobaciones de producto. El control negativo elimina sólo la exigencia de pose Farm final exacta mediante un loader de lectura. La prueba entonces detecta que una pose inventada conserva indebidamente la validez. Se separa ese fallo intencionado de las validaciones verdes.

Se conservan los 64 inputs/artefactos nativos sin recompilar, los archivos locales ajenos y el worker pthread sin seguimiento. No se anuncia capacidad24 desde el draw Worker antes de integrar Surface. Siguen abiertos los huecos históricos de Farm23 (172,74 ms globales en un run; 158,18 ms globales y 61,20 ms durante el bloqueo en el run con traza), la continuidad integral y la recuperación incremental de los 3.123 recursos. No se declara ausencia de tirones ni cierre de A6.
