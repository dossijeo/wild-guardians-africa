# Task llega mientras se prepara su parada

Si una Task14 alcanza su destino después del fin de turno mientras READY25 sigue pendiente, el productor cancela la preparación de parada. La autoridad transfiere la pose final del mismo cuerpo a Home18 y libera la tarea. Home19 retira el cuerpo al llegar a la vivienda. El recorrido ordinario que sigue en movimiento al aplicar el retorno conserva su parada25. [Plan integrado](integrated-gpu-migration-plan-20261104.md) · [Retorno con parada](native-task-return-adapter-20261121.md) · [Reproducción anterior](performance/native-task-stop-home-graphics-20261120/ordinary-shift-arrival-during-stop.json).

El export `nav_intent_completed_task_home_request` comprueba la sesión, asignación, generación, reserva, tarea y cuerpo. Exige que la ejecución física haya llegado con velocidad cero y que la salida no interfiera con otro cuerpo. Si la preparación anterior aún posee la frontera, espera a que el productor la cancele. Home reutiliza el cuerpo y la solicitud nativa existente.

El control y el Host conservan la pose final de Task ante la revocación causal de esa asignación hacia Home. El roster verifica la fila terminal, identidad, contrato, pose y fases. Reutiliza el actor, el rig, la geometría, los atributos y sus bancos. La retirada diferida libera la tabla de movimiento anterior al adquirir Home. Cancelar la candidata conserva el propietario previo.

OpenRA distingue la llegada de una cancelación segura en `Move.Tick`. Godot 4.4 fija la velocidad y emite la transición de navegación al alcanzar el destino. Three r180 conserva el tiempo final de su clip si la acción permanece activa con `clampWhenFinished`. Wild Guardians adapta la distinción de llegada y conserva su propia prueba de propietario al retener la pose. [OpenRA Move](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Mods.Common/Activities/Move/Move.cs#L130-L157) · [Godot NavigationAgent3D](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L843-L854) · [Three AnimationAction](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js#L702-L727).

## Pruebas dirigidas

```powershell
.cache/tooling/node20.exe --test tests/native-task-arrival.test.js tests/native-task-arrival-graphics.test.js tests/native-task-route-stop-graphics.test.js tests/native-task-start-graphics.test.js tests/native-route-control.test.js tests/native-home-route-control.test.js
```

La autoridad cubre la llegada en el mismo tick del fin de turno para los cuatro perfiles. También retiene READY25 en el preparador y en el transporte. Reenvía la respuesta antigua después de adquirir Home18 y comprueba que el cultivo y el cuerpo conservan sus identidades. Los controles rechazan un cuerpo, sesión, pose, contrato o revocación incompatibles. El roster usa los modelos y bancos originales con dobles de renderer y testigos de frame. Standalone y pthread completan el relevo. El ABI añade un export a las dos variantes y conserva las interfaces previas. [Pruebas de autoridad](../../tests/native-task-arrival.test.js) · [Pruebas de roster](../../tests/native-task-arrival-graphics.test.js).

En el checkout integrado pasaron 1.074 pruebas seleccionadas y la compilación Vite de producción. Los binarios instalados se compilaron con la receta canónica. El factory pthread instancia el binario correspondiente y su sidecar coincide byte a byte con el anterior.

El control anterior falla al llegar en el tick límite con `Expired Task lost its executed moving source`. La implementación intermedia declara Home al llegar, pero su roster aún devuelve `Native motion has no matching source worker`. La prueba física reprodujo ese rechazo antes de la adaptación del roster.

## GPU física

En Edge con NVIDIA Turing, la prueba espera una publicación visual confirmada antes de conectar el preparador para aislar el arranque Idle20. Retiene la respuesta READY25 mientras la Task avanza. La autoridad aborta esa solicitud al llegar, Home18 adquiere el mismo cuerpo sobre la pose terminal y se reenvía la respuesta antigua después de adquirir Home. La tarea queda liberada, el cultivo sigue vivo y no se crea una caja.

`olderFemale`, `youngFemale` y la segunda ejecución de `olderMale` completaron el dibujo de la retirada y confirmaron el drenaje. Cada cuerpo mantuvo su raíz y los mismos propietarios de geometría hasta Home. En otras ejecuciones de `olderMale` y `youngMale`, la autoridad adquirió Home19 y Game llegó al estado `home`. Draw rechazó después un paquete con un reloj 50 ms anterior al ya presentado. Una prueba dirigida reprodujo el mismo rechazo desde la cadena anterior Harvest → Carry → Home, sin pasar por una Task que llega durante READY25. El ajuste posterior retira la grabación cuya cobertura quedó vencida. [Continuidad de dibujo después de Home19](native-post-home-clock-handoff-20261121.md). El arranque Idle20 y C4 siguen abiertos. [Recibos GPU](performance/native-task-stop-home-graphics-20261120/ordinary-shift-completed-task-home.json).
