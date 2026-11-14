# f-R4 parcial: admitir solo los materiales de la variante nativa utilizada

14 de noviembre de 2026. Base `cbb06155f`, rama `codex/guardian-3d-animation`.
Continúa [Carry](f-r4-native-carry-20261114.md) y el
[plan integrado](integrated-gpu-migration-plan-20261104.md), con la corrección de A6
prevalente. No cambia los cierres de A6, e-R3/e-R4/f-R4 ni la aceptación A/B/C.

## Investigación aplicada y cambio

En [Three r180, RenderObjects.get](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObjects.js)
la clave conserva objeto, material, contexto y luces. Cambiar materiales de
fuentes CPU y clips ocultos obliga a crear render objects/bindings aunque no
vayan a usarse. [Pipelines](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js#L142)
reutiliza el programa por código exacto y lo retira cuando desaparece su último
usuario. La captura real de WGSL localizó seis compilaciones de skinning con
nombres de buffers distintos y seis sombras idénticas en la preparación previa.

Se aplica la identidad del propietario existente: el binder admite una lista
explícita de meshes y prepara únicamente los materiales de la variante nativa
seleccionada. La API previa que recorre todo el actor se conserva para sus
usuarios existentes. La lista debe ser única, estar dentro del root y excluir
los proxies CPU; se valida el conjunto completo y se revierte al fallar.
Las sustituciones conservan una copia del conjunto y pueden seleccionar otro
clip. Materiales originales, raycasts y actualizaciones de texturas mantienen
sus propietarios y las mismas comprobaciones de admisión.

Al publicar, la nueva variante y su binding se activan antes de separar el
binding anterior. Separar restaura solamente meshes todavía controlados por el
anterior, por lo que no deshace el nuevo binding. Sus recursos siguen vivos
hasta el fence de retirada existente. Las fuentes CPU quedan disponibles para
cargar otros bakes sin extender el reloj nativo actual a un clip oculto; esto
solo se permite cuando el actor posee una variante nativa activa y acotada.
El relevo de ese clip tendrá su propia preparación y admisión antes de mostrarse.

No se añade otra caché, dependencia ni rig, ni se parchea Three en este incremento.

## Evidencia

[Carry en GPU real](performance/native-worker-world-owner-carry-scoped-20261114.json)
y [Run → Walk en GPU real](performance/native-worker-world-owner-run-walk-scoped-20261114.json)
usan los dos Workers de producto, C++/WASM y el personaje original, en NVIDIA
Turing. Se conservan el dispositivo, los meshes y geometrías de caja/cuerpo,
rig CPU inmóvil y la reutilización exacta de la misma asignación. Siguen los
15 dibujos durante el bloqueo de 500 ms, cero creaciones en el primer render
inicial y del relevo, cero errores GPU y drenaje antes de liberar la autoridad.

Coste de preparar el relevo Carry, separado del render:

| Fábrica | Antes (parámetros uniformes) | Selección acotada |
| --- | ---: | ---: |
| Buffer | 213 | 90 |
| Textura / sampler | 1 / 1 | 1 / 1 |
| Bind group / layout | 108 / 108 | 48 / 48 |
| Shader / pipeline asíncrono | 12 / 12 | 3 / 3 |

Los contadores completos, pruebas y build se registran en
[validación](performance/native-selected-materials-validation-20261114.json).
40 dirigidas aprobadas, sin omisiones. La regresión de 36 archivos tiene 518
casos: 516 aprobados y los mismos dos fallos heredados de Carry/Harvest, sin
omisiones; su reproducción de base figura en la validación anterior. Build
aprobado en 43,55 s, con el aviso de chunks grandes existente.
Las pruebas cubren sustitución desde un binding completo o acotado, retirada
posterior al fence, rollback de scopes inválidos, conservación de fuentes CPU,
transiciones Walk/Carry, cancelación, visibilidad, picking y perfiles Walk/Run.

## Coste que sigue pendiente y siguiente mecanismo

Tres módulos vertex de sombra se vuelven a crear con código exactamente igual;
no se declaran resueltos. Se consultó además
[RenderObjects de Three en 253fa7ad](https://github.com/mrdoob/three.js/blob/253fa7ad003181df28015efdb541c2916895a816/src/renderers/common/RenderObjects.js#L94)
y su [Renderer](https://github.com/mrdoob/three.js/blob/253fa7ad003181df28015efdb541c2916895a816/src/renderers/common/Renderer.js):
la variante de override incluye el material fuente como quinto componente de
clave y controla su versión. Esto permite que la sombra antigua y candidata
coexistan con sus bindings, en vez de destruir el único render object del mismo
mesh/override al cambiar el grafo. Es el patrón contrastado a evaluar en el
parche reproducible r180 existente; requiere comprobar liberación, errores,
picking y sombras reales antes de incorporarlo. No se actualiza la dependencia
entera ni se conservan pipelines indefinidamente para ocultar recompilaciones.

Incluso eliminar esas tres compilaciones no cerraría los presupuestos de todos
los recursos: queda el delta de buffers/bindings de los materiales sustituidos.
También siguen Idle/puerta/acción, fases persistentes, alimentación y ejecución
ordinarias, consecuencias, todas las intenciones y aceptación integrada A–F/B/C.
