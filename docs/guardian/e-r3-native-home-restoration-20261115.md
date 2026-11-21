# Home guardado: petición nueva y admisión sobre el actor residente

Continúa la [restauración de Home ya inactivo](e-r3-native-home-inactive-restoration-20261115.md) y el [consumidor del corredor Home](e-r3-native-home-route-consumer-20261115.md). Un guardado de un trabajador todavía regresando conserva destino, posición, orientación, fases y presupuesto; la autoridad nueva declara una petición Home sin tarea y calcula su corredor completo. No restaura handles, permisos o resultados económicos del guardado.

## Referencia aplicada

Se consultaron las implementaciones de [`dtCrowd::addAgent`, `removeAgent` y `requestMoveTarget`, Detour v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L482-L592). La inicialización reinicia corredor y objetivo; una petición posterior solicita movimiento sobre el agente registrado. Se adapta esa separación entre declaración, cuerpo actual y ruta ejecutable. Se mantienen Wild Engine, su planificador y su protocolo de admisión; no se introduce una dependencia, cola o controlador. Tampoco se adopta el ajuste de posición al navmesh: el origen guardado permanece exacto.

## Propiedad y secuencia

La prevalidación semántica de restauración, común con las acciones, exige un mundo físico vacío antes de cerrar o reiniciar una autoridad existente. Comprueba la entrada original de la aldea, posición y fases finitas, estado `returning`, ausencia de tarea, caja, recuperación, caída y espera de puerta. La clase Home actual camina: conserva el presupuesto de carrera sin gastarlo. Un guardado no obtiene otra política por modificar el flag `running`.

La carga cambia el marcador a `pending-home-resources` y declara un `NativeHomeResourceRequest` en el mismo `ActiveIntent/AwaitingResources`. No crea un cuerpo, ruta, tarea, liquidación o suspensión ficticia. La restauración de tareas asignadas inicializa primero el índice vacío; el punto existente de restauración de Home incorpora después estas declaraciones, en orden de identidad, antes de vincular cuerpos.

La suscripción de control puede preceder a la inicialización física. La declaración sin cuerpo no publica una referencia utilizable. La primera vinculación real completa identidad, radio y flags, y emite la secuencia nueva de petición. El registro existente protege ese cuerpo contra desplazamientos y revinculaciones; retirarlo cancela la petición. El control directo copia la referencia actual, valida sesión y nacimiento y conserva su identidad al emitir la asignación. Una plantilla enviada por el productor no sustituye esa prueba.

El corredor Home acepta dos orígenes explícitos: la liquidación nativa anterior o esta petición nueva. Una vista semántica común alimenta el mismo planificador, propuesta, reservas, puertas y ejecución. La referencia gráfica conserva el tipo real de origen; una restauración no fabrica historial Carry ni una liquidación Home. La llegada preparada existente también acepta ese origen genuino y mantiene la retirada física condicionada al drenaje gráfico.

`Game.tick` mantiene la pose y el presupuesto mientras espera recursos. Esa espera también se aplica antes del primer reloj causal, para impedir que el trabajador entre en el mover heredado durante la inicialización. Tras el commit nativo se establece la ejecución si es el primer corredor de la cohorte y se proyecta el estado confirmado. Los demás actores pueden continuar durante la preparación.

Surface y el roster reutilizan su preparación común. La carga prepara Home sobre la raíz original sin propietario estacionario previo. Cancelar restaura sus materiales; presentar la ruta admite el movimiento sobre los mismos huesos y geometrías. La retención, revalidación temporal, puertos, asociación directa y retirada siguen usando los propietarios existentes.

## Validación

La [evidencia reproducible](performance/native-home-restoration-validation-20261115.json) contiene los comandos, resultados y límites. Cubre la espera antes de vincular cuerpos o admitir reloj, referencias alteradas, cancelación, origen tardío, fallo de preparación/liberación, protección física, presupuesto positivo no consumido, primer corredor threaded y llegada con retirada por el protocolo real. La cola GPU de las pruebas de protocolo es un doble determinista.

Pasan **690/690 pruebas en 65 archivos**, sin omisiones, en 203,421 s; incluyen los 17 casos nuevos. Ambos módulos nativos compilan. El producto compila en **49,38 s**, con los avisos existentes, y los 16 archivos originales protegidos conservan sus hashes después de compilar. El control de sólo lectura con `Game` de `b29429ae9` y el resto actual reproduce un fallo con 16 casos fuera de selección: la lógica antigua intenta mover Home antes de tener reloj y acaba generando un estado de recursos inválido. No es una comparación integral del padre.

La [pasada de hardware](performance/native-home-restoration-gpu-20261115.json), con NVIDIA/Turing, desierto mínimo, calidad `muy_baja` y recursos originales, valida **100 creaciones al preparar, cero después de READY y 53 dibujos durante bloqueo real de 1,8 s**. Ambas raíces, huesos, geometrías y lotes del mundo permanecen residentes; los dos actores continúan y la selección identifica a ambos. El cierre confirma drenaje y cero errores GPU, página, consola o red. Las capturas [antes](performance/native-home-restoration-before-20261115.png) y [después](performance/native-home-restoration-after-20261115.png) fueron revisadas.

Es una carga semántica en una autoridad nueva, creada antes del mundo gráfico, seguida de admisión incremental sobre sus actores residentes. El guardado procede de una cadena nativa realmente ejecutada mediante ABI de preparación de la fixture, sin GPU anterior. La fuente sigue en la página y el compañero B es la fixture independiente explícita. No certifica sustitución de una partida gráfica viva, productor ordinario, puertas ni recuperación incremental integral de los 3.123 recursos. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.
