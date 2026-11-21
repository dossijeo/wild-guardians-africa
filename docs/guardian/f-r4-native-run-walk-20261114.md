# f-R4 parcial: transición nativa Run → Walk en el mismo personaje GPU

14 de noviembre de 2026. Base `bb3494b54`, rama `codex/guardian-3d-animation`.
Continúa los [propietarios normales del trabajador](f-r4-native-worker-owners-20261114.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md), con la
[corrección de A6](intent-route-architecture-correction-20261108.md) prevalente.
No cierra e-R3/e-R4/f-R4 ni activa autonomía ordinaria para todas las intenciones.

## Requisito e investigación aplicada

El roster rechazaba cualquier ruta con intervalos Run. Conectarlo directamente
a asignaciones ordinarias habría descartado el trabajo urgente o lo habría
representado con un clip incorrecto. La preparación debe cubrir la ruta completa
y conservar los cambios de velocidad/fase ya calculados por C++.

Antes de diseñar el selector se consultaron implementaciones reales:

- [Babylon.js 8.0.0, BakedVertexAnimationManager](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/BakedVertexAnimation/bakedVertexAnimationManager.ts)
  separa textura compartida y parámetros de reproducción de la malla.
  Su [shader bakedVertexAnimation](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Shaders/ShadersInclude/bakedVertexAnimation.fx)
  elige frames y lee las matrices de huesos en GPU. Se adapta esa selección
  dentro del grafo existente; los bancos Walk/Run siguen siendo los propietarios
  de sus texturas. No se copia su escritura periódica de tiempo desde JS.
- [Three r180, ConditionalNode](https://github.com/mrdoob/three.js/blob/r180/src/nodes/math/ConditionalNode.js)
  genera las ramas y conserva sus ámbitos de caché; las ramas de nuestro `If`
  asignan resultados sin devolver nodos de asignación.
  [NodeMaterial](https://github.com/mrdoob/three.js/blob/r180/src/materials/nodes/NodeMaterial.js)
  compone posición y normal. Se mantienen ambas deformaciones en el mismo
  propietario y su admisión existente, incluidas sombras.

No se introduce una dependencia, atlas nuevo, rig adicional ni publicación
periódica de animación. Se usan las dos bibliotecas de matrices ya presentes.

## Cambio conectado

`prepareNativeRoute` examina los intervalos nativos para pedir Run únicamente
cuando se necesita o cuando el personaje ya usa ese bake. Reutiliza los bancos
normales y espera las admisiones de arranque existentes. Walk/Run deben tener el
mismo perfil, fuente, canales, inversas de huesos y attachments compatibles;
una discrepancia rechaza la preparación antes de sustituir los materiales.

El grafo de la misma malla selecciona Run o Walk mediante `runningNode` de la
tabla nativa. Cada rama usa su propio número de frames, duración y fase nativa;
no interpreta las matrices Run con los tiempos Walk del mesh retenido. La
posición y normal se deforman con la misma elección. Se conserva el cambio de
clip discreto del propietario baked actual, sin añadir reglas de mezcla.

La raíz, huesos, materiales y visibilidad no cambian al cruzar el límite. Si el
personaje ya tenía una presentación Run activa, ésta sirve de base estática y
puede mostrar Walk desde el mismo grafo. El picking elige la misma biblioteca y
fase al preparar su proxy para una entrada, usando el tiempo congelado del
consumidor. No añade un sampler por frame.

La sustitución, cancelación, restauración y liberación usan los propietarios y
fences del incremento anterior. Los intervalos detenidos, puertas/Idle/acción y
Carry siguen rechazados hasta disponer de sus variantes correspondientes.

## Cierre del consumidor de producto

La comprobación adicional de teardown encontró que `WorldClient` terminaba el
Worker de dibujo al recibir `disposed` del preparador, mientras el fence de la
cola real aún podía estar pendiente. No había un recibo que ordenase ambos
cierres; el ensayo previo no comprobaba ese drenaje.

La [corrección del cierre](f-r3-product-consumer-close-20261114.md), publicada
en `bb3494b54`, reutiliza el protocolo existente.
Se consultó [Three r180, WebGPUBackend.waitForGPU](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/WebGPUBackend.js#L1349),
que espera `queue.onSubmittedWorkDone`, y se reutilizó el fence y certificado de
retirada ligados a la conexión que ya posee nuestro host. La petición `dispose`
del RPC de recursos responde después de parar el replay, drenar la cola,
notificar la retirada por el canal nativo y liberar el dispositivo. La
superficie espera ese recibo antes de confirmar `disposed` al cliente.

El error de un fence rechaza el RPC; no fabrica una confirmación de cierre. Un
cierre ya iniciado puede responder aunque el dispositivo se pierda mientras se
tramita. La retirada directa conserva su token y su propietario; este cambio no
crea otro permiso ni redefine los fallos de canal como drenajes certificados.
La prueba real espera ahora el certificado antes de liberar la autoridad WASM.

## Evidencia

[Recibo WebGPU](performance/native-worker-world-owner-run-walk-20261114.json),
[pose inicial Run](performance/native-worker-world-owner-run-walk-20261114-start.png)
y [pose posterior Walk](performance/native-worker-world-owner-run-walk-20261114-moved.png).
Ensayo sobre WorldClient → WorldWorker → WorldSurface → roster → draw Worker
normales, con C++/WASM real y adaptador NVIDIA Turing:

- El presupuesto inicial de carrera se agota en C++ en `10,416666…` s: la
  muestra anterior sigue en Run y la posterior en Walk, con sus fases distintas.
- Bloqueo real de preparación de 500 ms: 15 dibujos, antes y después del límite,
  sin una nueva publicación de posición o cambio de clip del preparador durante el bloqueo.
- Primer render inicial y del relevo: cero creaciones entre las once fábricas
  instrumentadas de recursos GPU. La admisión ocurre antes del dibujo.
- Reutilizar la misma asignación conserva los recursos sin creación adicional.
  El total de arranque figura en el recibo y no es un presupuesto fijo.
- Relevo a otra ruta y retirada conservan la generación de superficie; cero
  errores GPU, JS, consola o HTTP. El cierre confirma el drenaje del consumidor
  antes de liberar la autoridad WASM.

Las pruebas usan GLB/bakes originales, una ruta C++ con límite Run/Walk y el
builder WGSL real. Verifican ambas texturas dentro de los bindings del mesh
baked visible, compatibilidad de los cuatro perfiles, fases de picking,
identidad de geometría/material y huesos CPU inmóviles. Se corrigió la selección
del mesh en la prueba de shader anterior: ahora exige el mesh baked visible y
no puede pasar eligiendo un prop bajo un padre oculto.

Los resultados reproducibles de pruebas, comparación con base y build figuran
en [validación](performance/native-run-walk-validation-20261114.json).
78 pruebas dirigidas aprobadas. La regresión de 36 archivos tiene 510 casos:
508 aprobados y dos fallos, sin omisiones. Ambos fallos se reproducen en las
fuentes de `bb3494b54` sin cambiar el checkout: admisión tardía de carry y
horizonte histórico de harvest, con 52 aprobados y dos fallos en 54 casos.
Las 120 pruebas dirigidas de control/cierre también pasan sin omisiones.
Build aprobado en 42,71 s, con el aviso habitual de tamaño de chunks de Vite.

Las capturas documentan el personaje; no son una comparación píxel a píxel de todas
las poses ni aceptación visual integrada de una partida.

## Siguiente trabajo

Carry requiere su dato de modo nativo y los attachments de la caja, que no son
compatibles con el layout Walk/Run sin prepararlos. También faltan los intervalos
Idle/puerta/acción. Después debe completarse la alimentación automática desde la
autoridad ordinaria y su ejecución común: el recorrido de código sigue mostrando
movimiento JS y asignaciones sin horario nativo completo. No se pueden publicar
como autorización GPU ni retirar sus guardas por tener esta API disponible.

Continúan pendientes AttackCrops y todas las intenciones, mutaciones con
personajes en movimiento/efectos, tráfico, puertas, entrada, recuperación,
guardado/device loss y aceptación A–F/B/C. El recuento de cierres no cambia.
