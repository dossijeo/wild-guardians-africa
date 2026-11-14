# f-R4 parcial: selección con el reloj presentado de cada asignación

Fecha: 2026-11-14. Base: `2aed5c05c`. Rama: `codex/guardian-3d-animation`.
Continúa el [plan integrado](integrated-gpu-migration-plan-20261104.md), la
[corrección A6](intent-route-architecture-correction-20261108.md) y el
[incremento Idle](f-r4-native-idle-20261114.md). No cambia ningún cierre.

## Problema y cambio

Antes de conectar el dibujo de las hojas de puerta al movimiento nativo se
encontró una incoherencia en su dependencia de entrada: el consumidor congela
cada asignación revocada en su propio `safeUntil`, pero WorldSurface tomaba el
`clockElapsed` global del último frame para consultar la pose seleccionable.
Una ruta detenida en 10,25 s podía seleccionarse usando 11 s si otra seguía activa.

RemoteWebGpuHost conserva ahora, exclusivamente después de enviar correctamente
los comandos del frame, el tiempo float32 escrito en cada uniform nativo, su
semántica/origen y su referencia completa de asignación. Para uniforms relativos
reconstruye el tiempo absoluto sumando el origen al valor realmente enviado.
Guarda solo el último frame, sin otra historia temporal ni recursos GPU.
El muestreo conserva el margen float32 del sampler de ruta existente.
Una preparación pendiente y un envío fallido no publican otro testigo de entrada.
La inspección devuelve una copia y el consumidor fallido rechaza la consulta.

WorldSurface captura esos tiempos antes de la selección. Cada callback del
trabajador consulta su propia referencia, origen y semántica; las fases baked y
el proxy geométrico comparten ese callback existente. Una asignación nueva sin
frame presentado no hereda el tiempo de la anterior. Se mantienen los límites
nativos, la preparación común, los recursos residentes y el reloj causal único.

## Fuente consultada y decisión

Se leyó código real de Three r180, la revisión de la dependencia utilizada:

- [ModelNode.js](https://github.com/mrdoob/three.js/blob/r180/src/nodes/accessors/ModelNode.js):
  `update(frame)` toma `frame.object`; los uniforms de transformación se actualizan
  por objeto. Se conserva la asociación entre el dato y su objeto consumidor.
- [Bindings.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js):
  `getForRender` obtiene los bindings del render object y `_update` distingue la
  actualización del uniform buffer de la reconstrucción de bindings. Se reutilizan
  los uniforms ya admitidos y sus referencias físicas; esta corrección no recompila.

Estas fuentes resuelven identidad y actualización por objeto, no nuestro protocolo
de revocación C++ entre Workers. La extensión mínima se hace en el consumidor que
ya escribe esos uniforms y envía la cola. No se añade dependencia, planificador,
reloj de entrada ni una segunda autoridad de movimiento.

## Validación

Las pruebas dirigidas ejercitan dos actores, revocación durante un FIFO bloqueado,
semánticas absoluta/relativa y precisión float32 distinta del límite sin cuantizar.
También cubren identidad completa, origen, copias, rechazo de datos incompatibles,
asignación todavía sin dibujo y fallo de `queue.submit` después de escribir el uniform.
Los resultados y la regresión ampliada se registran en
[validación](performance/native-input-clock-validation-20261114.json).
Pasan 92 pruebas dirigidas. La regresión final de 131 archivos incluye esos casos:
1.460 pruebas, 1.458 aprobadas, dos fallos heredados Carry/Harvest y ninguna omitida.
Sus reproducciones previas están enlazadas en el registro de validación. Compilación
aprobada en 47,38 s; comprobación de sintaxis de 308 scripts aprobada.

Tres comprobaciones con WASM, WorldClient/Worker/Surface/roster normales y NVIDIA
Turing usan `client.pick` para seleccionar al personaje en su pose presentada:
[espera Idle](performance/native-worker-pick-gate-20261114.json),
[Run/Walk](performance/native-worker-pick-run-walk-20261114.json) y
[Carry](performance/native-worker-pick-carry-20261114.json).
Cada una mantiene 15 dibujos durante un bloqueo de 500 ms, la misma asignación
reutiliza todos sus recursos y el relevo equivalente conserva shaders/pipelines.
El primer render preparado crea cero recursos GPU y el cierre espera el drenaje.
El caso de dos tiempos divergentes se verifica en el consumidor instrumentado;
las tres pruebas GPU comprueban la integración de entrada, no esa divergencia.

## Siguiente pendiente

Conectar el estado nativo de las hojas de puerta al propietario gráfico de muros,
incluyendo admisión y selección. La puerta de la prueba Idle sigue siendo autoridad
C++ sin hoja gráfica animada. Continúan pendientes fases persistentes, acciones y
consecuencias, productor/ejecutor ordinarios, todas las intenciones y aceptación
A–F/B/C. e-R3/e-R4/f-R4 y los once padres A6 permanecen abiertos. Esta comprobación
no acredita autonomía de producto ni ausencia completa de tirones.
