# Parada explícita del paseo en la transacción nativa existente

Continúa [Home desde la pose suspendida](e-r3-native-idle-moving-home-source-20261116.md). La revisión de su consumidor identifica una dependencia pendiente: la suspensión nativa existía y las transacciones del mundo preparaban paradas como consecuencia de mutaciones físicas, pero faltaba un disparador preparado explícito para cancelar un paseo sin introducir un obstáculo ficticio. Se añade ese disparador al mismo preflight, propuesta, efectos y commit del mundo. La integración tipada y gráfica sigue pendiente; A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Implementaciones consultadas

Se leyó [`dtCrowd::resetMoveTarget`, DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp): borra el objetivo solicitado, la velocidad deseada y el estado de petición sobre el mismo agente. Se adapta la conservación del propietario al dejar de caminar; Wild Guardians añade su suspensión y cierre analítico de reservas ya existentes, necesarios para no invalidar silenciosamente a otros consumidores.

Se consultó también [`Arena::get`, Rapier v0.22.0](https://github.com/dimforge/rapier/blob/v0.22.0/src/data/arena.rs). La consulta exige una entrada ocupada con la generación correspondiente. Nuestro selector conserva sesión, actor, slot, generación y asignación exactos, sin añadir otro registro o contador. No se introduce motor, dependencia, algoritmo de colisiones o planificador.

## Propuesta y frontera exactas

La familia **12** de `spatial_world_proposal_stage[_resources]` representa la parada explícita de un paseo 22. Usa cero floats y ocho palabras `int32`: sesión y actor en pares low/high, slot y generación `uint32`, y asignación en otro par low/high. Así mantiene los identificadores seguros de 53 bits y las generaciones completas de 32 bits, sin convertirlos en floats de geometría.

El preflight exige el paseo activo realmente adquirido y su cuerpo ejecutado. Sólo añade ese actor como semilla al cierre existente `projectWorldRouteStops`: éste calcula las mismas paradas dependientes de cuerpos y puertas y publica las filas de 26 y 3 valores que ya usa el protocolo del mundo. La captura conserva la ruta y el cuerpo; tampoco consume RNG ni emite una secuencia de control. Cancelar tampoco altera su estado físico.

El commit ligado a frontera usa `suspendRoute`, notifica la revocación y drena el cierre existente de reservas detenidas. Conserva el cuerpo y el slot suspendido; no añade ni elimina chunks, props, obstáculos o cuerpos. La publicación canónica tiene **cero cambios de geometría y cero IDs nuevos del mundo**, con las revisiones de terreno, overlays y residencia conservadas. Ese propietario suspendido puede suministrar después la petición Home del incremento anterior.

Una frontera que cambió de tiempo, cuerpo, intención o revisión invalida el candidato antiguo. En particular, no aplica en el tiempo nuevo la pose de parada capturada antes. Una sesión, asignación, actor, slot o generación ajenos tampoco pueden detener al paseo; una ruta de tarea no se interpreta como 22.

## Validación y continuación

**1468/1468 pruebas en 129 archivos**, 759035.7646 ms. Ambos módulos nativos recompilados y build de producto correcto en **47.77 s**. Se registran 57 fuentes nativas y sus artefactos (61 entradas); los 16 archivos locales protegidos y el helper pthread original permanecen exactos. [Comandos, conjunto e inputs/artefactos](performance/native-idle-stroll-stop-source-validation-20261116.json).

Los 10 casos nuevos recorren los cuatro perfiles en standalone/pthread, captura sin efectos anticipados, cancelación, commit y pose retenida, misma cantidad e identidad de cuerpos, avance del compañero no afectado, invariancia del mundo y siguiente adquisición Home. Incluyen frontera temporal obsoleta y selectores ajenos, con palabras altas de identificadores y bits altos de slot/generación para detectar truncamientos. Se incluyen también las nueve pruebas compartidas de efectos de parada: cuerpos dependientes, motores/puertas, terreno, animales y expiración de propuestas. No se fabrican tareas asignadas ni recibos gráficos.

El cambio añade una familia de entrada al propietario nativo existente; aún faltan su aceptación en el codec/control/puertos, el batch gráfico de cuerpos y motores sin cambios de terreno, y el relevo completo a Home en Game/roster/Surface. Al avanzar el reloj, el candidato antiguo se rechaza: la revalidación/adaptación del paquete gráfico retenido durante preparación móvil sigue siendo parte de esa integración. La ruta ordinaria no anuncia la nueva capacidad ni utiliza un fallback histórico.

No se mide GPU en este incremento ni se atribuyen resultados gráficos anteriores a sus binarios nuevos. Tarea durante paseo móvil, restauración móvil, aproximación/anclas/bloqueos, productor/cohorte ordinarios, otras clases/finales/puertas y recuperación incremental integral de los 3123 recursos siguen pendientes. No se inicia D ni se declara eliminada la posibilidad global de tirones.
