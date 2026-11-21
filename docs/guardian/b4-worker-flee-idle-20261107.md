# Pose Idle durante la huida de trabajadores

El perfil WebGPU reproduce el clip `Idle` precocinado que ya selecciona la presentación original cuando un trabajador huye con `running === false`. Para un tramo con desplazamiento se instalan conjuntamente las muestras de trayectoria y fase confirmadas; un cambio de estado, carrera, puerta o física mantiene el respaldo anterior. La navegación y las colisiones no se modifican.

Las pruebas dirigidas incluyen la roster y la autoridad WASM, y comparan los cuatro rigs con un proxy del muestreo del shader. No prueban la apariencia en partida ni el coste en GPU física.

## Inicio de incursión con Farm nativo

Una partida guardada con un plan diurno pendiente hizo aparecer un facóquero al alcanzar el instante 100,8. Game emitió un solo RaidSpawned y cambió al trabajador de Farm a Flee. Con Farm23 adquirido, el cuerpo 1 se encontraba en movimiento y el avance inmediatamente posterior falló con `Native task game cohort contains an unsupported mover`. Con Farm pendiente de recursos, el mismo inicio produjo `Native game execution still requires projection for this intention class`. Se comprobó con la autoridad de producción, WASM y Host determinista. [Recibo del inicio](performance/native-daytime-flee-baseline-20261121.json).

Aquí debe conservarse al actor mientras cambia el destino a la entrada del poblado. DetourCrowd sobrescribe la petición y su referencia de camino sobre el mismo agente. Godot conserva el agente al sustituir el destino y solicita una nueva ruta. Wild Guardians mantiene la necesidad de preparar y confirmar la transferencia antes de dar permiso al nuevo dueño. [DetourCrowd](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L574-L591), [Godot NavigationAgent3D](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L584-L592).
