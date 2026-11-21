# Continuaciones gráficas de contratados nativos

Continúa las [altas ordinarias Worker/Surface](native-farm-birth-worker-surface-20261120.md). El lote de dos contratados encontró un fallo después de la primera llegada: el roster rechazaba su siguiente movimiento con `Native motion has no matching source worker`. La fuente nativa era válida; faltaban dos campos de caché JS que el contratado nunca había utilizado.

## Fuente y decisión

Se revisó código real de [DetourCrowd v1.6.0, updateMoveRequest](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp): conserva las peticiones en cada agente y contrasta el resultado con su corredor actual, porque este puede haber cambiado durante la espera. Se mantiene ese criterio de identidad de la fuente viva mediante nuestros comprobantes nativos existentes. No se copia su cola, temporizador o algoritmo de evitación ni se crea otra autoridad.

Se inspeccionaron también [FileLoader](https://github.com/mrdoob/three.js/blob/r180/src/loaders/FileLoader.js) y [LoadingManager](https://github.com/mrdoob/three.js/blob/r180/src/loaders/LoadingManager.js) de Three r180: deduplicación de solicitudes por URL, caché y terminación de ítems compartida. Se conserva la infraestructura de carga/roster/bancos existente. No hay un gestor de carga por nacimiento ni una dependencia nueva. Esta corrección no cambia la gestión de geometrías o pipelines ya [investigada y comprobada](native-farm-birth-worker-surface-20261120.md).

## Corrección

Los cuatro caminos desde Farm23 terminada —Idle21, Stroll22, Home18 y Task14— aceptan ahora que `taskApproach` y `pathVersion` estén ausentes. Si están presentes, una aproximación de tarea activa o una revisión no finita sigue rechazándose. Esos campos describen caché de navegación JS; su ausencia no reemplaza una prueba física ni obliga a fabricar historia legacy en un trabajador nativo.

Continúan verificándose el mismo actor y cuerpo, época/sesión, generación y secuencia, política del trabajador, fuente instalada, extremo terminal inmutable, pose/fases y vigencia del movimiento. No se eliminan las guardas de tarea, destino, centro, contrato o retirada. El cambio de producto es un predicado puro y cuatro usos dentro del roster; no cambia Game, ABI, relojes, preparación de recursos ni mecánicas.

## Lotes y diagnóstico

Los dos casos ordinarios nuevos retienen un paquete READY auténtico con un lote de dos altas en una entrada. Mientras esperan, conservan ambas poses y avanza el compañero. Al liberar el paquete, ambos contratados adquieren una Farm23 propia, una sola vez, con cuerpos2/3 y la misma autoridad. Se cubren dos youngFemale y un lote youngFemale/olderMale con autoridad, productor y puertos reales; la cola GPU de estos dos casos es un doble determinista.

El primer escenario dirigía el lote al centro del compañero, que ocupaba su ancla Idle. La traza mostró el alta física3, pero las siguientes rutas chocaban con cuerpos/corredores retenidos; ampliar la ventana no proporcionó aceptación completa. No se cambió la admisión ni se retiraron esas guardas para forzar un pase. Los casos positivos usan un segundo centro y cultivo reales, fuera del destino ocupado. Por tanto no cierran tráfico general, cesiones ni ausencia de inanición del escenario original.

La primera ejecución de ese lote en hardware superó el alta y movimiento inicial, pero falló en la continuación gráfica del primer contratado. Su snapshot carecía de los dos campos JS mencionados. Los dobles del productor no ejercitaban esa validación del roster; las nuevas pruebas con modelos/bancos/terreno y fuentes nativas reales sí la reproducen.

Hay24 casos gráficos nuevos:16 positivos (cuatro perfiles por cuatro sucesores) y8 negativos que siguen rechazando metadatos conflictivos. El primer conjunto de tres familias dio6 pases/12 fallos; al incluir Idle hubo16 rechazos funcionales y dos expectativas de mensaje demasiado estrechas, corregidas para aceptar el mensaje real de rechazo de Idle. La selección final de ocho archivos pasa **196/196**, sin omisiones, en49.656s; seis sintaxis pasan. Se conservan los fallos y las fuentes diagnósticas, separados de la aceptación final.

## Worker/Surface y hardware

Pasan tres ejecuciones NVIDIA/Turing: dos lotes visuales y un control de alta individual sin capturas. El mismo harness usa autoridad Worker, comando pagado, ambos puertos, Surface/roster y modelos originales. Ambos contratados adquieren cuerpos2/3 y su propio comprobante23; al terminar la observación el primero ya reproduce22 y el segundo23. La autoridad anterior mantiene su identidad y llega también a22. Picking reconoce los tres trabajadores y el cierre confirma el drenaje GPU antes de retirar la autoridad.

| Caso | Preparados para la primera adquisición | Después del primer READY | Total observado hasta adquirir al segundo | Buffers de geometría nuevos vivos |
| --- | ---: | ---: | ---: | ---: |
| youngFemale×2 | 214 | 0 | 898 | 0; ambos reutilizan los26 del compañero |
| olderMale×2 | 303 | 2 | 976 | 18 en conjunto, compartidos por ambos |
| youngFemale individual, sin capturas | 546 | 6 | No hay segundo | 0; reutiliza26 |

Los **575 IDs invariantes comprobados permanecen** durante todo el lote: geometría previa no transitoria y texturas vivas salvo programas de movimiento/muestras de huellas identificados. No se duplica un módulo WGSL idéntico ni se sustituye Surface. Los contadores y trazas completos conservan también versiones/forks internos; mantener un ID no demuestra que todo backing o binding sea gratuito.

Cada lote supera dos bloqueos del preparador de3.6s con108 dibujos por ventana. El compañero avanza2.31/2.27 unidades durante la primera y el paquete adquirido avanza más de0.5s durante la segunda. El control individual conserva dos ventanas de1.8s/54 dibujos. Los máximos entre dibujos en estas ventanas están entre33.43 y33.72ms, sin huecos superiores a50ms; no se acepta cadencia general ni60fps. Se revisaron cuatro capturas de modelos y sombras en vistas limitadas; el control de tiempo no hace readback.

Los898/976 recursos son fábricas acumuladas de todo el intervalo, que contiene sucesores, bindings y VFX concurrentes. No son una medida causal del coste mínimo del lote ni recursos anteriores reconstruidos. Los6 recursos tardíos del control individual son muestras/bindings de huellas. Los2 del lote olderMale son un sampler y una textura4096×2048 sin dueño atribuido en esa instrumentación; se conserva la pila y no se etiquetan como huellas o atlas únicamente por sus dimensiones. Admisión VFX, atribución y coste mínimo siguen pendientes.

Los intentos intermedios detectaron además un defecto del harness: publicaba resultados con telemetría de autoridad que la cola conserva como no coalescibles. Llegó a saturarse; con backpressure activo dejó de avanzar el reloj finito y las guardas rechazaron la prueba. No se cuentan esos intentos como aceptación ni se amplía la capacidad. La versión final usa el transporte incremental y `blocked()` existentes, drena la publicación inicial antes de medir y desactiva únicamente esa telemetría no utilizada del Worker. Conserva eventos y comprobantes completos. Las tres pasadas coalescen487/553/329 publicaciones silenciosas, con cola máxima de una, y mantienen los umbrales de movimiento y adquisición. Los bloqueos más largos del lote no constituyen una aceptación de rendimiento del pump de pasos fijos.

Regresión seleccionada final: **4833/4834 casos**,364 archivos, una omisión opcional de comparación WASM, cero fallos/cancelaciones,691.012s. Build WebGPU/Worker remoto termina con código0 en124.459s y el aviso de tamaño de chunks existente. Se ejecutó junto a pruebas CPU, después de terminar toda la GPU; no es una comparativa de velocidad de build. Los686 inputs finales,64 inputs nativos,16 archivos ajenos y38 A5 permanecen exactos. No se recompilan binarios nativos porque el ABI y sus fuentes no cambian.

[Recibo y hashes](performance/native-farm-newborn-continuations-validation-20261120.json), [capturas finales, fuentes propias y logs comprimidos](performance/native-farm-newborn-continuations-20261120/).

## Límites y continuación

Una adquisición de lote no demuestra coste mínimo, cero asignaciones VFX, todas las cancelaciones o recuperación. Las ventanas de dibujo durante bloqueo del preparador no bloquean el Worker de autoridad ni aceptan cadencia general. El caso histórico de recuperación de3.123 recursos permanece abierto y debe reutilizar los recursos invariantes.

Quedan tráfico del destino ocupado, fallo/cancelación de lotes y cierre durante preparación en GPU real, guardado/recuperación, autonomía/admisión de huellas y demás pendientes del plan. No se activa el backend para partidas legacy ni se abren incursiones/puertas/cohorts excluidos. A6/A, B1–B7 y C abiertos; D no iniciado; f-R3 mantiene su cierre de seguridad y las tres exclusiones históricas permanecen.
