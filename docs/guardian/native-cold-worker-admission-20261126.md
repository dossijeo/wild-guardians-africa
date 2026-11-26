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

La pasada acelerada continua agotó el plazo a 123,08 s. La segunda preparación de Idle22, ticket 14 a 116,38 s, esperaba que Surface aplicara la publicación 1946. Al empezar la espera tenía aplicada la 1829 y recibida la 1861. Al abortar había recibido hasta la 1958 y aplicado hasta la 1926. La preparación nunca llegó al rig, al portón ni a la captura de su paquete.

El arnés adelantaba el tiempo de Hosted con pulsos de hasta 0,50 s y dejaba el reloj directo de Draw a velocidad normal. En 12 de 13 paquetes ordinarios observados, Draw rechazó 21 oportunidades porque la hora del paquete aún era futura para su reloj causal. El paquete 269 requería 105,48 s. En su primera oportunidad, el reloj permitía 104,7889 s y WASM ya había ejecutado hasta 116,58 s. La mediana entre admisión y primer dibujo fue 717,9 ms, con espera de recursos cero. Se conservaron la guarda causal y el plazo de preparación. [Corte de publicaciones y dibujo en NVIDIA](performance/native-savanna-continuous-publication-nvidia-20261126.json).

Una pasada de la misma semilla con el reloj normal de Hosted superó ese corte y adquirió seis marchas Idle22. El recibo conserva cuatro dibujos de marchas posteriores a 100 s. Home18 adquirió el ticket 55 a 250,48 s y su dibujo se verificó a 250,84 s. Home19 adquirió el ticket 57 a 291,12 s y Game dejó a `worker-6` en (60, 0). A 291,24 s el preparador informó `Prepared clock coverage precedes the presented frame`. La pasada termina ahí, con el dibujo de retirada y el drenaje aún sin acreditar en el turno continuo. El diagnóstico de este segundo corte sigue separado del plazo de Idle22.

La recarga corta desde 250 s con el mismo reloj normal presentó la ausencia en el paquete 446. Con el mismo mundo, Draw rechazó el paquete siguiente 447. La cobertura del intervalo histórico 1924 terminaba a 290,70 s y Draw ya había presentado 290,74 s. En esa recarga el arnés observó el dibujo de ausencia y cerró antes de que se registrase el rechazo en Surface.

Al exigir que la recarga continuase después del dibujo de ausencia, el intervalo 1925 terminó a 290,74 s y el dibujo anterior ya había presentado 290,80 s. Surface recibió el rechazo con los recursos retenidos, las fronteras aplicada y requerida iguales al ticket 4, y ninguna mutación pendiente. La recaptura ordinaria rechazó el paquete porque todavía llevaba el token histórico 1. El control de CPU reproduce el mismo orden y conserva la guarda que impide volver a dibujar el intervalo vencido. Queda por confirmar el avance ordinario de su publicación y el primer dibujo de reemplazo.

Pasaron las 149 pruebas dirigidas de ciclo de trabajador, Idle, Home y barrido continuo. El build web de producción terminó en 46,56 s e incluyó ambos WASM con las mismas importaciones y exportaciones que la preimagen.

## Parada de Farm23 ya adquirido para la primera tarea

El orden en que Farm23 empieza a caminar antes de la primera tarea producía una diferencia de un ULP en la hora de la pose. En la semilla 712, el límite de Stop24 era `8.049999999999908` y la muestra devolvía `8.049999999999907` al reconstruir el tiempo desde la distancia. La posición y las fases coincidían con el cuerpo nativo. El receptor rechazaba esa fila antes de preparar el dibujo.

La proyección nativa de parada conserva la pose comprobada y la fecha en el límite exacto de autoridad. Se mantiene la igualdad estricta del receptor. Con READY retenido, Farm23 sigue avanzando. La revalidación emite un ticket posterior, congela la muestra de ese instante y permite a Task14 adquirir el mismo cuerpo. El control llega a un único `WaterSatisfied` y se reproduce con `node --test --test-name-pattern="stops acquired Farm23" tests/native-production-lifecycle.test.js`.

NVIDIA Turing adquirió Farm23 al contratar. Retuvo READY de Stop24 desde 0,04 s y presentó la parada en el dibujo 26 a 1,24 s. El cuerpo 1 y su asignación conservaron los valores acreditados de posición y fase. El dibujo 27 presentó Task14 en el mismo cuerpo con destino `plant-3`. El recorrido gráfico usó avance controlado y terminó con un único cargo de contratación y drenaje. [Recibo de NVIDIA](performance/native-savanna-acquired-farm-stop-nvidia-20261126.json).

Pasaron 186 pruebas de ciclo de trabajador, paradas, mutaciones del mundo y rutas de animales. El build de producción terminó en 49,78 s e incluyó ambos WASM con la misma interfaz de importación y exportación.
