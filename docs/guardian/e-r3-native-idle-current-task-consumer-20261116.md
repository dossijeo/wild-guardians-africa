# TaskStart desde el ciclo actual en el consumidor original

Continúa [la fuente TaskStart posterior al paseo](e-r3-native-idle-current-task-source-20261116.md). La secuencia inicial 20 → ciclo 21 → paseo 22 → descanso 21 → TaskStart 14 atraviesa los puertos, control directo, roster, Surface y Host originales sobre el mismo actor. Se ejercitan los APIs reales de tarea y proyección de Game con un pump controlado; el productor ordinario y A6/e-R3/e-R4/f-R4/A/B/C siguen abiertos.

## Referencias y decisión

Se consultó la implementación real de [`Pipelines::getForRender`, Three r180](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js). Sus mapas de programas usan el código de vertex/fragment shader y su caché de pipelines usa la clave estructural del render object. El consumidor actual ya separa los datos de ruta de esa estructura. La prueba exige reutilizar esas identidades y rechaza compilar otra vez una fuente WGSL idéntica.

No se modifica el código de producto, el motor ni la arquitectura, ni se añade dependencia o caché. Se reutilizan la unión de cuerpo actual 20/22, la comprobación `cycleStartCurrent`, el preparador TaskStart y sus reservas/adquisición existentes, junto con los dos conjuntos de materiales retirados que conserva el actor. La referencia de Rapier y la conservación del cuerpo siguen documentadas en el incremento nativo.

## Adquisición y proyección

Los dos puertos preparan una vez, drenan, revalidan el mismo borrador nativo y publican su adquisición exacta. La fase anterior permanece instalada mientras TaskStart sólo es intención. El recibo exige el fotograma preparado y la frontera correspondiente; un recibo con secuencia de fotograma inválida o una cancelación no adquiere la ruta. El binding se consulta a la fuente y se instala con `nativeStartedRoutes`.

El API de TaskStart devuelve la ruta adquirida; Game la proyecta mediante `reconcileWorkerRoutes` y `projectNativeTaskExecution`. No se escribe manualmente una fase ejecutada para satisfacer el consumidor. El roster exige la tarea genuina, la pose/fases del ciclo y el marcador pendiente, prepara sobre el actor y las geometrías existentes y restaura materiales/visibilidad al cancelar. El commit revoca el ciclo anterior; una liberación vieja no retira su sucesor.

## Hardware y recursos

En **NVIDIA/Turing**, TaskStart conserva **582 IDs únicos** de recursos residentes: **555 buffers y 27 texturas**, además de las identidades de actor, geometrías e instancias. La preparación crea **cero shaders, pipelines y pipeline layouts**; no aparecen fuentes WGSL duplicadas. El regreso previo 22 → 21 también reutiliza sus programas y retira su textura de ruta obsoleta después del fence.

Preparar TaskStart crea **70 recursos de protocolo**: 36 buffers de uniformes, 16 bind groups, 16 layouts de bind group, una textura de datos de ruta y un sampler. Se contabilizan por separado las copias internas del Host: **20 uniformes / 5.536 bytes y 20 bindings**, con cero copias de buffers estáticos o texturas. Estas asignaciones de preparación permanecen; no se afirma coste cero.

Después de READY hay **cero recursos nuevos y cero copias internas adicionales**. Se registran 54 dibujos durante el bloqueo anterior a preparar y **53 durante los 1,8 s de bloqueo posteriores al commit**; el compañero continúa su ruta. Ambas selecciones usan el tiempo del fotograma realmente enviado. Surface adopta la publicación 7 → 8 y vuelve a `ready`; no hay errores GPU, de consola, red o autoridad y el cierre obtiene su recibo de drenaje.

El escenario deja residentes desde el arranque un ancla Idle y un cultivo maduro separado para la tarea. Así no confunde crear un cultivo nuevo durante el relevo con reemplazar recursos sin cambios, ni coloca un cultivo maduro encima del trabajador durante las pruebas de selección. Las comprobaciones de identidad, ausencia de compilaciones duplicadas, dibujo y selección permanecen activas.

## Validación y continuación

**180/180 pruebas en 15 archivos**, 92402.8067 ms, incluyendo los 13 casos nuevos. La regresión nativa previa del commit base pasó 1426/1426 pruebas en 124 archivos y su build de producto terminó en 47,70 s. Los inputs de producto/nativos, los 16 archivos locales protegidos y el helper pthread original permanecen exactos.

Los 13 casos nuevos cubren cuatro perfiles por ambos puertos, cancelación/recibo inválido, GLB y roster reales, revalidación, rollback, retirada y rechazo de fases o marcador Game sustituidos. El renderer de esas pruebas es simulado; la evidencia de hardware procede del escenario separado anterior. Se conserva la regresión nativa y build del commit base sin atribuirles ejecución de estos tests nuevos. [Comandos, hashes, conjuntos y resultados](performance/native-idle-current-task-consumer-validation-20261116.json), [recibo GPU](performance/native-idle-current-task-consumer-gpu-20261116.json).

Se inspeccionan [el descanso posterior al paseo](performance/native-idle-current-task-consumer-rest-20261116.png) y [TaskStart adquirido](performance/native-idle-current-task-consumer-task-20261116.png). Esta prueba no demuestra ausencia global de tirones ni recuperación incremental integral de los 3123 recursos. Siguen pendientes tarea/Home durante paseo móvil, restauración móvil, aproximación/anclas/bloqueos, productor/cohorte ordinarios, restantes clases/finales/puertas e integración A/B/C. No se inicia D.
