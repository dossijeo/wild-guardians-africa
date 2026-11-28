# Relevo desde la Task detenida hacia Home en Game

Game puede solicitar Home para un trabajador cuyo contrato ha terminado y cuya Task se detuvo con Task25. Comprueba la tarea y el poblado del trabajador. El puente coteja el recibo con la última publicación de autoridad, verifica la asignación en WASM y solicita Home con la generación retenida del mismo cuerpo.

Game libera su asignación después de que WASM acepte Home. Adopta la pose que devuelve la solicitud y publica el estado de retorno pendiente de recursos. Los demás trabajadores conservan sus tareas. El controlador de dibujo mantiene la pose detenida mientras llega la ruta Home y rechaza una solicitud que altere esa pose. WASM valida el radio, el perfil y los flags físicos al emitir la solicitud para el cuerpo retenido.

DetourCrowd cambia la meta en el mismo agente mediante `resetMoveTarget` y `requestMoveTarget`. Godot actualiza la meta y reinicia la consulta sobre el agente existente. El relevo de Wild Guardians utiliza el mismo cuerpo y encadena la espera de Home a la parada confirmada mediante el canal existente. [Código de DetourCrowd](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L607-L662) · [Código de Godot](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L643-L655).

El fixture impone el final del turno después de recibir la parada. Verifica el rechazo antes del fin de contrato y con una familia incorrecta. Con el recibo válido comprueba la liberación de la Task, el mismo cuerpo y pose, la adopción del evento en el controlador y la preparación nativa de Home18. Una copia del evento con la posición alterada se rechaza antes de aceptar el evento real.

Quedan el cambio de estado en el roster durante el relevo, el disparo desde la actualización ordinaria de Game, los motores de puerta y la prueba integral en GPU física. C4 sigue abierto.

La prueba dirigida fallaba antes del cambio porque faltaba la entrada de Game. La selección final pasó 537 pruebas en 46 archivos y la compilación de producto terminó correctamente. Se conservaron los módulos WASM. [Evidencia de validación](performance/native-task-stop-home-game-20261120/manifest.json).
