# Fase de acción sobre el actor residente

Continúa el [reloj gráfico de acción](e-r3-native-action-draw-clock-20261115.md).
El roster existente ya puede preparar su fase, vincularla al cuerpo original,
restaurar el vínculo anterior y recuperar una acción emitida en un consumidor
nuevo. No se activa todavía la acción en la partida ordinaria. e-R3/e-R4/f-R4,
los once puntos principales de A6 y la aceptación integrada A/B/C siguen abiertos.

## Implementación y propiedad

`confirmed-terrain-support` añade una entrada tipada de acción al mismo núcleo
geométrico usado por rutas y cuerpos detenidos. Retiene el triángulo del pie
actual y sus versiones; no prepara otra trayectoria ni otro terreno. Un cambio
de las posiciones del triángulo invalida el soporte. Su validez geométrica no
autoriza a ejecutar la acción.

La presentación de acción usa el reloj relativo tipado existente. El shader
selecciona el clip y sus matrices residentes. Conserva la secuencia Plant/Water
y sus tiempos de autoría; Water, Harvest y la recogida usan el avance de trabajo
normalizado a la duración del clip. La reparación mantiene su duración nativa
cero y una pose Idle inicial, sin inventar un intervalo de trabajo. La duración
se toma de la declaración nativa, no de una resta de tiempos absolutos.

El transform fijo de posición/orientación usa `gpuActorLocalTransform` y el
mismo vínculo de materiales del actor. El root y el rig CPU conservan su
propietario. La acción no crea una textura de trayectoria, un rig, geometrías
del cuerpo, un temporizador JS ni una simulación. Las muestras CPU solo se usan
para selección y reciben la edad `float32` enviada por el dibujante; el render
evalúa el grafo TSL.

El roster carga únicamente los clips necesarios de sus bancos existentes y
prepara un reemplazo de materiales sobre las mallas actualmente activas de
Walk/Run/Idle. Reutilizar esa presentación activa evita cambiar de cuerpo al
entrar en una acción. Las herramientas Water usan las variantes y geometrías
compartidas ya implementadas. El candidato puede activarse para capturar el
paquete y volver al vínculo anterior si se cancela.

El finalizador exige una asociación nativa que cubra la referencia preparada.
Conserva su inicio real y retira el recurso de ruta con el fence existente.
La recuperación desde una asociación ya emitida utiliza el mismo preparador
sin fabricar una ruta nueva. Retirar el actor durante una activación todavía
no publicada cancela el candidato y libera también el propietario anterior.
Una retirada antigua de ruta o una asociación de acción diferente no libera
la acción actual.

La revalidación que solo cambia la frontera temporal conserva el grafo, el
nodo de reloj y los datos fijos. Se retagan los uniforms conocidos; no se crea
otra textura ni otro material. Si cambia el soporte de altura, se exige otra
preparación en lugar de reutilizar datos incompatibles.

## Referencias de código fuente

Se consultaron nuevamente las implementaciones de Babylon.js 8.0.0:
[`BakedVertexAnimationManager.bind`, 125–138](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/BakedVertexAnimation/bakedVertexAnimationManager.ts)
y [`bakedVertexAnimation.fx`, 8–25](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Shaders/ShadersInclude/bakedVertexAnimation.fx).
Separan textura residente, parámetros de reproducción y selección de matrices.
Se adapta ese patrón a nuestros bancos, clips y reloj causal, sin incorporar
Babylon ni su reloj global. El orden y los tiempos siguen `workerPose` del juego.

También se contrastó la prueba de sombras con el código instalado de Three.js
0.180.0: `Renderer.renderObject` propaga `positionNode` al material de override
y `NodeMaterial.setupPosition` aplica ese nodo a la posición local. Se ejercita
esa ruta real con los parches existentes de
[`patch-three-webgpu-pipeline.mjs`](../../tools/patch-three-webgpu-pipeline.mjs),
sin crear un pase alternativo de sombras.

## Validación y alcance pendiente

La [evidencia final](performance/native-action-actor-phase-validation-20261115.json)
registra hashes y resultados. Diecinueve casos nuevos comprueban entrada exacta
y diferida desde una llegada real de `Game.tick`, cancelación, recuperación,
retirada, rechazo de otra asociación, soporte geométrico y revalidación sin
reconstrucción. La entrada nativa se llama explícitamente como componente; no
se presenta como una admisión ordinaria con recibo GPU.

Los cuatro perfiles comparan muestras de vértices del cuerpo y herramientas Plant/Water
contra el rig original, con error inferior a 0,02 unidades. Las declaraciones
de las cinco clases prueban su matemática gráfica; no acreditan ejecución de
esas cinco clases en la partida. El constructor real de Three genera WGSL para
la nueva acción Harvest y para el pase de sombra con el mismo `positionNode`.
Eso acredita construcción del programa, no ejecución de una nueva acción en
el controlador GPU. Las regresiones GPU mantienen sus escenarios anteriores.

Quedan conectar esta preparación al Surface y al canal de recursos existentes,
retener el paquete, obtener su drenaje directo y publicar la asociación nativa
antes de reproducirlo. El consumidor todavía rechaza relojes de candidatos
pendientes. Después deben conectarse proyección, efectos y restauración en
Game, productor ordinario y las demás intenciones. No se retiran esos guardas.
Este incremento tampoco cierra el caso de reconstrucción de 3.123 recursos ni
la validación de costes de las publicaciones ordinarias.
