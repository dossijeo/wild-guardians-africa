# e-R3 parcial: primera tarea con recursos retenidos antes del efecto físico

Fecha: 2026-11-15. Base: `50321572c`. Continúa la
[asociación nativa de recursos](e-r3-native-task-start-binding-20261115.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Todos los padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

## Recorrido común

`startNativeTaskRouteAfterGpuQuiescence` recibe una solicitud real del lote
ordinario y su política declarada. Prepara un candidato nativo tipo 14 y entrega
su descripción al preparador existente. No inventa una intención Home, una
suspensión ni una secuencia de asignación. La primera tarea utiliza referencias
`nativeStart` propias; la reanudación conserva su contrato anterior.

El soporte de terreno, empaquetado, textura de datos, grafo TSL, variantes de
materiales y binding del rig original comparten los mecanismos existentes. El
roster acepta al trabajador pendiente de su tarea, prepara las alternativas y
conserva la posibilidad de revertir su activación. El material de locomoción
deshabilitado puede volver a su estado anterior al cancelar la captura. No se
reconstruyen el modelo, huesos o geometrías del personaje para iniciar la tarea.

Los clientes y Workers conservan un recibo `preparedTaskStartTemplate` del
paquete realmente retenido. El propietario gráfico permite preparar datos desde
la solicitud directa, pero no dibujarlos todavía. El canal directo solicita el
fence sobre ese paquete. Después del drenaje, la autoridad revalida la prueba
física en la frontera actual y confirma con el ticket preparado original.
Solo entonces publica la asignación real y la asociación leída del slot nativo.
El consumidor instala ambas pruebas y adopta el paquete sin esperar otro turno
del preparador.

Al preparar otra primera tarea, los relojes de tareas ya asignadas conservan su
prueba directa vigente. Solo las referencias todavía pendientes deben coincidir
con el nuevo template. Una prueba con tres cuerpos cubre dos tareas del mismo
lote iniciadas sucesivamente y B independiente, evitando que la nueva admisión
rechace recursos anteriores que siguen autorizados.

Los relojes relativos y la fase Idle usan el origen realmente confirmado; los
datos conservan su origen preparado. La selección normal convierte el tiempo
del recurso al tiempo ejecutado. La cobertura mantiene el horizonte de B y los
límites propios de cada recurso. Las puertas de la primera tarea solo reciben
un origen desplazado si la asociación nativa acredita sus IDs, también al
incorporar un consumidor de dibujo nuevo. Los campos de asociación privados del
host no se aceptan desde paquetes del productor.

Una confirmación de movimiento puede ser la primera frontera de recursos del
mundo. Se registra entonces un recibo sin cambios de chunks en la publicación
canónica existente, con las revisiones actuales de terreno, overlays y residencia.
Así la captura sigue rechazando mutaciones estructurales fuera de su frontera,
sin exigir una mutación de terreno artificial antes de iniciar una tarea.

## Precisión y reutilización

Las pruebas de terreno revelaron una inversión numérica: muestrear un tiempo
absoluto redondeado de esquina podía devolver una posición a una ulp del vértice
nativo. Eso fabricaba intervalos geométricos diminutos y diferencias Float32 al
desplazar el inicio. El muestreador común conserva ahora el vértice o el agotamiento
del presupuesto **solo cuando el tiempo coincide exactamente con su knot nativo**.
Los puntos interiores mantienen la interpolación anterior. No se añade una
tolerancia ni se relaja la prueba de colisiones o la comparación de recursos.

El caso 10 → 10,4 documentado en el incremento anterior ya puede conservar su
proyección tras esta corrección; se convierte en una prueba de regresión del
muestreo exacto. También deja de producirse la falsa diferencia de la reanudación
31,75 → 31,95 en su knot de velocidad. Las puertas sustituidas siguen requiriendo
datos nuevos y los tickets ajenos o antecesores no acreditados siguen rechazados.

Una actualización de un candidato no publicado reutiliza su textura, uniformes
y grafo si la capacidad y la identidad son compatibles. Si los datos empaquetados
no cambian, tampoco aumenta la versión de la textura. Un cambio de altura actualiza
solo esa textura existente. Una representación incompatible no recibe permiso
de ejecución: sigue pendiente completar su reintento ordinario sin detener B.

## Código fuente consultado

Se leyó [Three r180, `Textures.updateTexture`](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Textures.js)
(188–190, 244–289) y [`Bindings._update`](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js)
(225–254, 300–302). Distinguen versión de datos y generación del recurso. Se
adapta esa distinción a la textura y bindings existentes, evitando sustituciones
cuando basta con conservar o actualizar datos.

Se examinó [Detour v1.6.0, `findStraightPath` y `appendVertex`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/Detour/Source/DetourNavMeshQuery.cpp)
(1603–1623, 1818–1842): conserva los vértices del corredor al emitir sus esquinas.
Se mantiene ese principio al muestrear nuestros knots conocidos, con igualdad
exacta de tiempo. No se copia su planificación, tolerancia de vértices ni estructura
de navegación. Se mantiene también la validación de identidad de Jolt documentada
en el incremento anterior. No se añaden dependencias.

## Alcance de validación

La [evidencia final](performance/native-first-task-admission-validation-20261115.json)
registra hashes congelados durante pruebas, compilación y GPU. Pasan 1869 de
1874 casos en 173 archivos, manteniendo los cinco fallos anteriores documentados;
la selección dirigida contiene 352 casos y uno de esos fallos heredados. No hay
casos omitidos. Se reconstruyen standalone/pthread, compila el producto y pasan
las comprobaciones de sintaxis de los archivos propios. El HTML nuevo se ejecuta
en el escenario real de navegador, además de la revisión sintáctica existente.

El [escenario gráfico](performance/native-first-task-gpu-admission-20261115.json)
parte de una tarea de cosecha reclamada
por el planificador global y un trabajador B con una ruta independiente. El
temporizador avanza C++ y su reloj; no publica posiciones JS periódicas. Se bloquea
el preparador durante la preparación y otra vez tras `ready`, manteniendo el canal
directo y el propietario GPU. Se exige preparación única, reutilización posterior,
selección de ambos trabajadores y drenaje al finalizar.
La autoridad del escenario es un `SpatialGameSession` real ejecutado en la página;
preparación y dibujo usan los Workers de producto. Esto valida el contrato y los
propietarios gráficos comunes, no el coordinador ordinario del Worker de partida.
El escenario nuevo utiliza cosecha sin puertas; no acredita por sí solo todos
los cruces ni las clases del plan.

En NVIDIA Turing se prepara una sola vez y se producen 54 dibujos durante el
segundo bloqueo de 1,8 segundos. El render capturado no crea recursos GPU; después
de `ready` no aumentan las fábricas, los forks ni el contador de recursos. Ambos
trabajadores admiten selección normal y el consumidor confirma su drenaje. La
[regresión de reanudación](performance/native-first-task-resume-regression-20261115.json)
mantiene también 54 dibujos y cero recursos nuevos tras `ready`.
Se revisan las capturas del [inicio bloqueado](performance/native-first-task-issued-blocked-20261115.png)
y de la [imagen confirmada](performance/native-first-task-issued-confirmed-20261115.png).

Este componente no activa todavía el modo pendiente de recursos en el juego
ordinario. Quedan la integración del productor y ejecutor de todas las intenciones,
las transiciones a acciones y sus consecuencias, cancelación y políticas completas,
persistencia y recuperación de todas las clases y la aceptación integrada A/B/C.
