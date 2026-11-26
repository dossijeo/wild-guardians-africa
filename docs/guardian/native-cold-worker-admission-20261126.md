# Primera contratación con autoridad nativa desde un roster vacío

La restauración de trabajadores ya creaba el registro de cuerpos y el reloj de control al encontrar un marcador nativo en el guardado. Una partida que llegaba sin trabajadores quedaba fuera de ese flujo aunque se conectaran el control directo y la preparación gráfica. El primer contrato creaba por ello un trabajador sin declaración nativa de llegada.

El perfil explícito `nativeWorkerLifecycle` permite arrancar el mismo dueño en Desierto con un roster vacío. Hosted, el cliente y el Worker de autoridad conservan la opción también con `DEV=false`. El reloj se publica en la primera conexión de Draw. La orden pagada existente crea el trabajador, declara Farm23 y admite su cuerpo mediante el registro existente. Un perfil que pide este arranque con un roster incompatible falla antes de abrir la autoridad.

El control usa una partida de Desierto con centro y cultivo colocados y sin trabajadores, rutas ni marcadores. Ejecuta `openInitialHiring` y `hire` por Hosted. Con el cultivo regado, Game avanza mientras READY queda retenido y el trabajador conserva la pose del portal. Tras GO, el cuerpo 1 avanza mediante Farm23. Si el cultivo necesita el primer riego, el planificador conserva la prioridad de esa tarea, cancela la preparación de Farm23 y adquiere Task14 sobre el mismo cuerpo. En ambos casos se comprueban un cobro y un `HiringConfirmed` incluso al repetir el comando.

El control se reproduce con `node --test --test-name-pattern="the first paid hire" tests/native-production-lifecycle.test.js`. Carga los módulos de Hosted y del Worker de autoridad compilados para producción y usa WASM, ambos puertos y un Host con cola GPU determinista.

NVIDIA Turing confirmó ambos recorridos con Hosted, el Worker de autoridad, Preparer y Draw. En ambos casos el READY 1 nació a t=0 y Game avanzó a 0,20 s durante su retención. Con el cultivo regado, GO 2 adquirió Farm23 y el cuerpo 1 avanzó desde z=11,8 hasta z=11,2816. Con la tarea inicial, el aborto descartó ese READY y GO 3 adquirió Task14. El mismo cuerpo avanzó hasta z=11,2384. El dibujo 20 de cada pasada presentó su binding adquirido. Los dos recorridos registraron un `HiringConfirmed` y drenaron. [Recibo de NVIDIA](performance/native-cold-worker-admission-nvidia-20261126.json).

Los dos casos fallan con la autoridad de `5917a6f84` porque la conexión inicial carece de reloj nativo. La selección amplia pasó 100 de 101 pruebas. El único fallo reproduce en la preimagen el bloqueo del corredor norte de la incursión de Desierto. El productor devuelve `blocked` para el corredor del animal antes de pedir sus recursos gráficos. El build web local terminó en 47,56 s.

La selección del perfil desde el arranque ordinario, las partidas con una cohorte antigua ya en marcha y la continuidad integrada de todas las incursiones siguen pendientes. Los criterios de A6/A7 y C4 conservan su alcance.
