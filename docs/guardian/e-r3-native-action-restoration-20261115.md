# Restauración de acciones con progreso y admisión nueva

Continúa la [proyección de acciones nativas en Game](e-r3-native-action-game-projection-20261115.md)
y utiliza la [transacción común de admisión](native-admission-vertical-20261115.md).
Una acción guardada puede volver al propietario nativo con su duración y progreso
originales. Necesita preparar sus recursos y recibir una autorización nueva antes
de continuar. e-R3/e-R4/f-R4, los once padres A6 y A/B/C siguen abiertos.

## Declaración dentro del propietario existente

El guardado conserva únicamente clase, duración, progreso, posición, orientación
y fases semánticas. No conserva handles, permisos ni tiempos del renderer.
Al cargar, el planificador valida esos datos antes de resetear el estado nativo.
El mismo `ActiveIntent` declara `AwaitingResources=6`, con una referencia tipada
`native-task-action-restore-reference`: actor, tarea, objetivo, época de autoridad,
sesión, secuencia de solicitud y momento de declaración. No crea una ruta vacía,
un regreso Home ni una llegada ficticia. No ocupa un `RouteSlot`.

La entidad queda en `pending-action-resources`, esperando y sin polilínea. Su
progreso permanece fijo. El cuerpo físico vinculado debe coincidir con su posición
y estar activo; mientras espera no puede cambiar de pose ni de identidad. Retirar
el cuerpo, cancelar la tarea o cambiar el objetivo invalida la declaración.

La propuesta usa la familia 15, el slot y la transacción existentes: preparar,
drenar realmente, revalidar la fuente nativa, confirmar sin suspensión, retener el
paquete y publicar/liberar ordenadamente. La identidad nueva participa en el mismo
registro de control causal y en los perfiles de admisión compartidos. No se añade
otro reloj, mundo, registro de cuerpos, planificador ni ejecutor.

El ABI conserva las formas de solicitudes, propuestas y asociaciones ordinarias.
Una extensión de ocho valores identifica la restauración, sin reinterpretar ceros
como un handle ejecutable. `nativeTaskActionRestoreVersion=1` es obligatorio para
los consumidores que preparan o dibujan esta clase; los anteriores rechazan la
operación antes del commit.

## Duración total, progreso guardado y tramo restante

La solicitud guarda `duration` e `initialElapsed`. Su nueva ventana de ejecución
mide `duration - initialElapsed`; el tiempo empleado preparando o drenando no
consume trabajo. La revalidación puede desplazar la ventana completa sin reiniciar
el progreso. El reloj común nativo sigue avanzando las otras intenciones.

El dibujo usa la edad relativa enviada por el host y calcula la fase como
`initialElapsed + edad`, limitada al intervalo total. Total, offset y tramo son
uniformes; sus valores no generan una estructura de shader distinta por cada
guardado. La entrada por picking usa la misma edad relativa float32 y el mismo
límite restante. Initial puede reanudarse directamente en Water; no vuelve a Plant.
Una acción ya terminada sigue necesitando admisión nueva, incluso con tramo cero.
No se inventa un intervalo pequeño para justificar el binding.

`Game.tick` continúa proyectando únicamente la asociación efectivamente emitida.
Al llegar al final conserva tarea y cuerpo. La protección de `completeTask` sigue
impidiendo efectos económicos, caja, cultivo o reparación sin consecuencia nativa
preparada. Cargar una acción terminada tampoco concede esos efectos.

## Referencias consultadas antes del diseño

- [Godot 4.4, AnimationPlayer](https://github.com/godotengine/godot/blob/4.4-stable/scene/animation/animation_player.cpp):
  lectura de `_process_playback_data` y `seek_internal`, incluido el clamp de la
  posición y las decisiones de actualización al buscar. Se adapta la separación
  entre posición semántica del clip y ejecución nueva. No se restaura un reloj o
  handle del renderer ni se disparan efectos por buscar una fase.
- [Flecs v4.0.4, stage.c](https://github.com/SanderMertens/flecs/blob/v4.0.4/src/stage.c):
  lectura de creación de comandos, defer y entrada a merge. Se conserva la fuente
  del comando hasta la sincronización y se vuelve a validar al confirmar. Aquí se
  reutilizan nuestras propuestas y transacción; no se incorpora Flecs ni un buffer
  de comandos paralelo.

Son referencias de código real fijadas a versiones, no una propuesta de sustituir
la arquitectura. No se añaden dependencias.

## Validación y límites

El [registro de evidencia](performance/native-action-restoration-validation-20261115.json)
identifica hashes, comandos, resultados y fallos previos. Las pruebas reutilizan el
contrato común de admisión, con WASM real y canales reales; su cola GPU determinista
es una simulación de prueba. Cubren progreso cero/final, segundo guardado, epoch
grande, espera larga, cancelación, cuerpo protegido y pthread. Water e Initial
proceden de guardados genuinos de acciones de componente, no de cambiar etiquetas
sobre una propuesta Harvest. La prueba de gráficos compila el actor original con
el offset de una declaración Initial realmente restaurada.

La selección dirigida final pasa 296/296; la regresión de 2.025 casos pasa 2.020,
con los mismos cinco fallos históricos y sin skips. Ambos grupos se solapan, no se
suman. Pasan las compilaciones standalone/pthread y de producto y el análisis de
sintaxis de las páginas de navegador.

El harness WebGPU existente incorpora `QA_NATIVE_ACTION_RESTORE=true`: cierra la
fuente antigua, carga el guardado en una sesión nueva y admite Harvest en el Surface
y workers de dibujo existentes. Comprueba bloqueo de preparación y de JS, progreso
guardado, B independiente, geometría conservada y recursos tras readiness. Es una
prueba de componente con autoridad en página; B mantiene su fixture Home. El origen
guardado usa el ABI confiado de prueba, no acredita una admisión GPU anterior.

En NVIDIA Turing, la restauración dibujó 54 frames durante el bloqueo de JS de
1.800 ms. Partió de 0,6/2,4 s y el frame leído mostró 2,26 s de progreso, con B
avanzando independientemente, rig CPU sin cambios y drenaje final confirmado.
Preparó 98 recursos antes de readiness y creó cero después. Esos 98 no se
interpretan como reutilización de una escena anterior ni coste cero de la carga.
Las regresiones GPU de primera tarea, acción y reanudación también pasan con el
mismo núcleo final, sin errores GPU/página/consola/HTTP, con drenaje confirmado y
cero recursos después de readiness. No son aceptación integrada de producto.

Este caso construye su mundo GPU una vez tras la carga. No prueba recuperación de
dispositivo en el mundo ordinario ni reutilización de toda una escena anterior.
No cierra la reconstrucción histórica de 3.123 recursos: siguen pendientes la
coherencia de publicaciones ordinarias, todas las clases/perfiles, el productor
ordinario, consecuencias preparadas y el ciclo completo hacia la siguiente tarea.
Repair cero tiene contrato de fase, no evidencia de reparación ordinaria completa.
La aceptación integrada conserva los cinco fallos históricos hasta resolverlos.

El siguiente punto del camino crítico es preparar y confirmar la consecuencia
nativa, con traspaso coherente del cuerpo, antes de habilitar `completeTask`.
