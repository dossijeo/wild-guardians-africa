# Home desde una Task detenida

El propietario nativo convierte una Task detenida mediante la familia 25 en una solicitud de Home. Valida la asignación, la generación suspendida y el cuerpo en su pose ejecutada. Libera la asignación de la tarea y conserva sus datos para el siguiente trabajador elegible. La solicitud reutiliza Home18 y mantiene el cuerpo retenido hasta que se admite la ruta de retorno.

El cambio aplica el patrón de cambiar el destino sobre el mismo agente. Se contrastaron `requestMoveTarget` y `resetMoveTarget` en DetourCrowd 1.6.0, y `set_target_position` y `_request_repath` en Godot 4.4. Ambos renuevan el destino y su estado de navegación sobre el agente existente. Wild Guardians usa su propia prueba de cuerpo retenido y la frontera de publicación preparada. [DetourCrowd](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L607-L662) · [Godot](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L643-L651).

Las pruebas parten de una Task ejecutada en los módulos standalone y pthread. Rechazan la solicitud antes de la parada y con una generación incorrecta. Comprueban que reintentar la misma solicitud conserva su secuencia, que otro destino se rechaza y que la ruta Home adopta el mismo cuerpo. Entre la solicitud y la admisión, un trabajador independiente sigue avanzando y la pose retenida permanece fija. Los dos casos nuevos fallaron sobre el módulo anterior por ausencia de la entrada nativa y pasaron con la implementación. Los fixtures usan la frontera de pruebas del ABI.

Pasaron 20 pruebas directas y 293 pruebas en 18 archivos seleccionados de Task, parada y Home. La compilación de producto aprobó. La API añade `nav_intent_stopped_task_home_request` y conserva las firmas anteriores del módulo standalone y de la fábrica pública pthread. [Recibo y registros](performance/native-task-stopped-home-source-20261120/manifest.json).

Queda conectar el vencimiento en Game con los recibos del canal real, el control y el consumidor de la parada. La activación ordinaria y la comprobación de GPU de la transición completa siguen pendientes.
