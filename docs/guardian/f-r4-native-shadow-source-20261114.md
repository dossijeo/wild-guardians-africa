# f-R4 parcial: reutilizar sombras por material fuente

14 de noviembre de 2026. Base `f2e519e7d`, rama `codex/guardian-3d-animation`.
Continúa la [admisión de materiales seleccionados](f-r4-native-selected-materials-20261114.md),
el [plan integrado](integrated-gpu-migration-plan-20261104.md) y la corrección de A6.
A6/e-R3/e-R4/f-R4 y la aceptación A/B/C permanecen abiertos.

## Investigación integrada en la corrección

La preparación Carry todavía recreaba tres programas vertex de sombras con
WGSL exactamente igual. La inspección de fuentes localizó el ciclo:
[RenderObjects r180](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObjects.js)
identifica la sombra por mesh, override, contexto y luces. Cambiar el grafo del
material fuente invalida ese único render object; su disposición puede retirar
el último usuario del programa antes de admitir el reemplazo.

Antes de diseñar un mecanismo propio se consultaron estos archivos del código
real de Three, fijados al commit `253fa7ad003181df28015efdb541c2916895a816`:

- [Renderer](https://github.com/mrdoob/three.js/blob/253fa7ad003181df28015efdb541c2916895a816/src/renderers/common/Renderer.js)
  conserva el material fuente durante el pase de override.
- [RenderObjects](https://github.com/mrdoob/three.js/blob/253fa7ad003181df28015efdb541c2916895a816/src/renderers/common/RenderObjects.js#L94)
  añade ese material como quinto componente de clave y valida su versión.
- [RenderObject](https://github.com/mrdoob/three.js/blob/253fa7ad003181df28015efdb541c2916895a816/src/renderers/common/RenderObject.js)
  guarda el propietario, su versión y listener de disposición; incluye el
  quinto componente al borrar su entrada y retira el listener al terminar.
- [ChainMap](https://github.com/mrdoob/three.js/blob/253fa7ad003181df28015efdb541c2916895a816/src/renderers/common/ChainMap.js)
  separa WeakMaps por longitud. Es necesario para que claves de cuatro y cinco
  componentes con el mismo prefijo coexistan sin confundir un valor con un mapa.

Se adapta ese conjunto al parche reproducible existente de Three r180. No se
actualiza la dependencia, añade una caché alternativa ni se retienen programas
sin propietario. La licencia MIT y atribución se conservan en el módulo del
backport. El beneficio técnico se comprueba con contadores del dispositivo real.

## Implementación y ciclo de vida

`patch-three-source-material.mjs` modifica las cuatro clases en sus fuentes y
en ambos bundles WebGPU. `patchInstalledThree` sigue exigiendo 0.180.0 y valida
todos los archivos antes de escribir. Repetir postinstall no cambia el resultado;
un código desconocido rechaza el parche. Se mantiene el scratch array de r180
para la clave y su validación de grafos de sombras ya existente.

La variante antigua y la candidata tienen render objects/bindings separados;
sus programas/pipelines idénticos pueden compartir la caché normal de Three.
El material del binding antiguo se dispone después del fence ya establecido,
lo que borra sus entradas sin afectar a las nuevas. Al disponer el material
fuente se elimina también su listener del override. La versión del material
fuente sigue disparando validación; no se ignoran cambios reales de grafo.

La restauración del contexto fuente y de los nodos temporales del override usa
`finally`, incluidos errores de dibujo. Los pases anidados restauran el dueño
exterior. Los listeners/WeakMaps conservan las variantes mientras vive su
material, incluidas las de fallback: esta retención tiene coste de memoria y
no equivale a una caché gratuita o a que el arranque cree cero recursos.

## Evidencia y alcance

[Carry real](performance/native-worker-world-owner-carry-shadow-source-20261114.json)
y [Run/Walk real](performance/native-worker-world-owner-run-walk-shadow-source-20261114.json)
usando C++/WASM, los dos Workers de producto, GLB/bakes originales y NVIDIA Turing.
La prueba Carry exige ahora igualdad de contadores de shader y pipeline antes y
después del relevo; el primer render conserva su comprobación independiente.

| Preparación del relevo Carry | Antes | Con material fuente |
| --- | ---: | ---: |
| Shader modules / pipelines asíncronos | 3 / 3 | 0 / 0 |
| Pipeline layouts | 3 | 0 |
| Buffers | 90 | 90 |
| Bind groups / layouts | 48 / 48 | 48 / 48 |
| Textura / sampler de la ruta | 1 / 1 | 1 / 1 |

Conserva las nueve geometrías/meshes, rig CPU inmóvil, reutilización exacta de la
misma asignación, 15 dibujos durante 500 ms de bloqueo, cero fábricas en el primer
render, cero errores y drenaje antes de liberar WASM. El incremento acumulado
anterior fue 22 → 12 → 3 → 0 pipelines en este fixture, no una medición de todos
los cambios del juego ni de la reconstrucción histórica de 3.123 recursos.

Las pruebas ejercitan clases reales de Three con un backend de prueba para
identidad, versiones, listeners y claves; comprueban restauración ante excepción,
pases anidados, convivencia de candidatas y borrado al disponer cada fuente.
La regresión y build se registran en
[validación](performance/native-shadow-source-validation-20261114.json).
12 pruebas dirigidas aprobadas. Regresión de 125 archivos con concurrencia 2:
1.392 casos, 1.390 aprobados y los mismos dos fallos heredados Carry/Harvest,
sin omisiones. Build aprobado en 42,82 s y sintaxis de navegador aprobada.
La evidencia de base de esos fallos se conserva en las validaciones anteriores.
Al reiniciar Vite con `--force`, dos intentos se interrumpieron por la recarga de
optimización de dependencias; el recibo válido procede del servidor ya preparado.
No se trató una recarga del entorno de pruebas como una medición de producto.

Queda reducir el delta de buffers/bindings cuando sea realmente reutilizable y
validar presupuestos de memoria/latencia integrados. Siguen Idle/puerta/acción,
fases persistentes y productor/ejecutor ordinarios con consecuencias, todas las
intenciones y aceptación A–F/B/C. No se acredita ausencia completa de tirones.
