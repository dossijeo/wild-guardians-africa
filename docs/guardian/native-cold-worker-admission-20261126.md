# Primera contratación con autoridad nativa desde un roster vacío

La restauración de trabajadores ya creaba el registro de cuerpos y el reloj de control al encontrar un marcador nativo en el guardado. Una partida que llegaba sin trabajadores quedaba fuera de ese flujo aunque se conectaran el control directo y la preparación gráfica. El primer contrato creaba por ello un trabajador sin declaración nativa de llegada.

El perfil explícito `nativeWorkerLifecycle` permite arrancar el mismo dueño en Desierto con un roster vacío. Hosted, el cliente y el Worker de autoridad conservan la opción también con `DEV=false`. El reloj se publica en la primera conexión de Draw. La orden pagada existente crea el trabajador, declara Farm23 y admite su cuerpo mediante el registro existente. Un perfil que pide este arranque con un roster incompatible falla antes de abrir la autoridad.

El control usa una partida de Desierto con centro y cultivo colocados y sin trabajadores, rutas ni marcadores. Ejecuta `openInitialHiring` y `hire` por Hosted. Con el cultivo regado, Game avanza mientras READY queda retenido y el trabajador conserva la pose del portal. Tras GO, el cuerpo 1 avanza mediante Farm23. Si el cultivo necesita el primer riego, el planificador conserva la prioridad de esa tarea, cancela la preparación de Farm23 y adquiere Task14 sobre el mismo cuerpo. En ambos casos se comprueban un cobro y un `HiringConfirmed` incluso al repetir el comando.

El control se reproduce con `node --test --test-name-pattern="the first paid hire" tests/native-production-lifecycle.test.js`. Carga los módulos de Hosted y del Worker de autoridad compilados para producción y usa WASM, ambos puertos y un Host con cola GPU determinista.

NVIDIA Turing confirmó ambos recorridos con Hosted, el Worker de autoridad, Preparer y Draw. En ambos casos el READY 1 nació a t=0 y Game avanzó a 0,20 s durante su retención. Con el cultivo regado, GO 2 adquirió Farm23 y el cuerpo 1 avanzó desde z=11,8 hasta z=11,2816. Con la tarea inicial, el aborto descartó ese READY y GO 3 adquirió Task14. El mismo cuerpo avanzó hasta z=11,2384. El dibujo 20 de cada pasada presentó su binding adquirido. Los dos recorridos registraron un `HiringConfirmed` y drenaron. [Recibo de NVIDIA](performance/native-cold-worker-admission-nvidia-20261126.json).

Los dos casos fallan con la autoridad de `5917a6f84` porque la conexión inicial carece de reloj nativo. La selección amplia pasó 100 de 101 pruebas. El único fallo reproduce en la preimagen el bloqueo del corredor norte de la incursión de Desierto. El productor devuelve `blocked` para el corredor del animal antes de pedir sus recursos gráficos. El build web local terminó en 47,56 s.

La selección del perfil desde el arranque ordinario, las partidas con una cohorte antigua ya en marcha y la continuidad integrada de todas las incursiones siguen pendientes. Los criterios de A6/A7 y C4 conservan su alcance.

## Primera tarea en Sabana

El perfil explícito `nativeWorkerLifecycle` también abre el reloj antes de la primera contratación en Sabana. Farm23 usa la prueba continua de trabajador que ya existía para ese bioma. Task14 aplica esa misma prueba al corredor, conserva el tipo de prueba en la ruta y vuelve a comprobarlo si cambia la topología. El barrido exige terreno residente y seco y respeta los sólidos y el radio del trabajador. El recorrido acreditado se hace sin portón.

El control arranca en el centro que selecciona Wild Engine para la semilla 712 y planta un plátano por la operación pagada de Game. Hosted ejecuta el primer contrato. Mientras Farm23 espera READY, la primera tarea de riego gana la asignación y el trabajador conserva la pose inicial. Se aborta el paquete de Farm y Task14 adquiere el cuerpo 1. Action15 conserva ese cuerpo, presenta su propio binding y riega el cultivo una sola vez. Repetir el contrato conserva el saldo y el único trabajador.

La preimagen rechaza el arranque de Sabana. Al aplicar solo el cambio de arranque y reutilizar el WASM previo, Farm llega a READY y la primera tarea queda pendiente antes de su adquisición. Con ambos cambios pasa `node --test --test-name-pattern="the first paid hire" tests/native-production-lifecycle.test.js`, incluidos los dos controles de Desierto.

NVIDIA Turing presentó Task14 en el dibujo 28, con el ticket 3 y el cuerpo 1. El dibujo 204 presentó Action15 en su frontera adquirida de 43,84 s, con el ticket 5 y el mismo cuerpo. Idle20 adquirió el ticket 7 a 51,64 s. El cultivo `plant-3` registró un `WaterSatisfied` del trabajador `worker-6`. El recorrido usó avance controlado. Los dos ensayos iniciales localizaron un campo erróneo de la sonda y un límite de observación que terminaba antes del GO de Idle20. La pasada final registró los dos dibujos y drenó sin errores. La continuación de Idle en Sabana, el turno completo y la cadencia siguen pendientes. [Recibo de NVIDIA](performance/native-savanna-first-task-nvidia-20261126.json).

Pasaron 97 pruebas de arranque, Farm, Task14, portones y barrido continuo. El build web de producción terminó en 49,42 s e incluyó los binarios comprobados. Standalone y pthread conservan las mismas importaciones y exportaciones que la preimagen. El módulo JavaScript de pthread coincide byte a byte.

## Marcha Idle y regreso al final del turno en Sabana

Con la semilla 714, la primera decisión de marcha de Idle usa la secuencia 8 y el RNG privado 2740067004. La preimagen rechaza ese corredor con `−2` y deja al trabajador en la pose anterior. La semilla 712 llega al final del turno a 250 s y deja al trabajador en `pending-home-resources`, con Home18 rechazado antes de preparar sus recursos. Ambos casos usan el centro y las operaciones de compra y contratación de Game.

Idle22 y Home18 aplican ahora el barrido continuo de trabajador de Sabana, que exige terreno residente y seco y respeta los sólidos. La ruta conserva el tipo de prueba para revalidar al cambiar la topología. El corredor de Home sin huida sigue usando marcha sin urgencia. Home19 retira el mismo cuerpo al alcanzar la entrada de la aldea.

El control de CPU conserva la decisión, el destino y la pose durante READY de Idle. Comprueba también el reloj del dibujo, mantiene la pose durante READY de Home y exige una sola retirada con la misma asignación. Se reproduce con `node --test --test-name-pattern="the paid Savanna shift" tests/native-production-lifecycle.test.js`.

En NVIDIA Turing, después de la primera contratación y el riego, el ticket 11 adquirió Idle22 a 84,08 s. El dibujo 253 presentó el cuerpo 1 con edad de 0,004 s y el destino de la decisión original. El recorrido corto drenó. Otra pasada cargó el checkpoint del final de ese mismo turno a 250 s. El dibujo 42 presentó Home18 con el cuerpo 1 y el dibujo 101 confirmó su ausencia al adquirir Home19 a 290,48 s. El mismo trabajador quedó en casa en (60, 0) y Draw drenó. Durante esta prueba se detuvo el avance del reloj al alcanzar la entrada para observar el GO de Home19. [Recibos de NVIDIA](performance/native-savanna-idle-home-nvidia-20261126.json).

En la pasada acelerada continua, una preparación posterior a la primera marcha agotó el plazo a 123,08 s. Quedan abiertas esa continuidad gráfica y la cadencia. También queda pendiente el orden en que Farm23 adquiere el cuerpo antes de la primera tarea. En ese orden, la fila de Stop24 reconstruye el tiempo de la pose con un ULP de diferencia respecto de la frontera exacta y el receptor la rechaza.

Pasaron las 149 pruebas dirigidas de ciclo de trabajador, Idle, Home y barrido continuo. El build web de producción terminó en 46,56 s e incluyó ambos WASM con las mismas importaciones y exportaciones que la preimagen.
