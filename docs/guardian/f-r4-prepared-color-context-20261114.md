# f-R4: admitir color con el contexto efectivo de escena

14 de noviembre de 2026. Continúa los [bindings de sombras](f-r4-prepared-shadow-bindings-20261114.md).
**f-R4, e-R3/e-R4 y los once padres A6 siguen abiertos.** Se prepara el pase de
color de geometría nueva antes del efecto nativo, sobre los propietarios comunes.
No es aceptación de locomoción autónoma ni de ausencia de tirones de toda la partida.

## Investigación e implementación

Se leyeron las fuentes fijadas de Three r180, también locales en 0.180.0:

- [RenderObject.getDynamicCacheKey](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObject.js): escena y nodo de luces participan en la clave del pase de color.
- [Nodes.getCacheKey/updateEnvironment/updateFog](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/nodes/Nodes.js): la clave se memoriza por escena/nodo de luces e `info.calls`; los nodos de niebla/entorno tienen sus propias claves y las variaciones de uniforms conservan su programa.
- [Renderer.compileAsync](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js): preparar no avanza `info.calls`, aunque sí el identificador interno del render de nodos. Dos preparaciones entre renders pueden leer la clave anterior.

Se reutiliza el adaptador existente de identidad de escena/luces y su restauración
síncrona. Se invalida exclusivamente la entrada `[escena, nodo de luces]` de la
`ChainMap` real de Three antes del setup; no se adelanta el reloj ni se vacía la
caché de objetos, materiales o pipelines. Se mantienen las guardas reentrantes
y el fallback de contextos incompatibles/raíces con luces propias.

El ticket existente incluye ahora los nodos y claves reales de entorno/niebla,
textura del entorno y layout, override material y lista efectiva de luces visibles
para las capas de cámara. Una modificación estructural mientras compila exige
otra preparación; después de ready invalida el ticket. Los valores ordinarios de
uniforms (niebla, intensidad/color/posición de luces y rotación/intensidad del
entorno) pueden cambiar sin exigir otro pipeline. Esto no convierte en mutaciones
soportadas todos los cambios internos posibles de una textura o nodo de usuario.

El servicio y `WorldSurface` activan el adaptador común por defecto; se conserva
`VITE_WEBGPU_ADMISSION_SHARED_LIGHTS=false` como salida explícita. No hay nuevas
dependencias, renderer, caché propia o mecanismos de publicación. Siguen siendo
APIs privadas fijadas a Three r180 y deben revisarse al actualizarlo.

## Regresión gráfica verificable

El [control negativo](performance/native-prepared-color-before-20261114.json)
encuadra los nueve chunks: readmitir `-1,-1` con el pase de color anterior crea
**64 recursos después del efecto físico**, incluidos shaders y pipelines síncronos.
La cámara anterior podía ocultar esta brecha. El gate permanece estricto.

El [recibo nativo por defecto](performance/native-prepared-color-20261114.json)
y su [captura](performance/native-prepared-color-20261114.png) pasan las seis
mutaciones de retirada/readmisión, prop y alturas, con:

- Cero factories durante el primer render y cero mensajes de creación hasta su ACK.
- Geometría readmitida y alturas cambiadas dentro del frustum, con muestras NDC en el recibo; dos movimientos posteriores de cámara sin factories.
- Mismo dispositivo, renderer, escena y raíz del trabajador; recursos de terreno, props y los nueve meshes de aldea intactos conservados.
- Copias internas de uniforms/bind groups contabilizadas por separado, terminadas antes de solicitar quiescencia; el preparador bloqueado mantiene los dibujos anteriores.
- Cero errores GPU y cierre/drenaje comprobados.

La [matriz GPU](performance/admission-color-matrix-20261114.json), con
[captura de las doce variantes](performance/admission-color-matrix-20261114.png),
compara píxel a píxel dibujo directo y admitido de mallas rígidas, instanciadas
y morph, en la misma escena. Niebla ausente/lineal/exp2, entorno ausente/cubemap
y luces de día/noche: **cero canales distintos y cero factories** en cada primer
dibujo preparado. Veinte comparaciones adicionales exigen que cambiar cada eje
produzca diferencias visibles. El cubemap usa caras de 32 px: el
[PMREMGenerator de Three](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/extras/PMREMGenerator.js)
fija el LOD mínimo en 4; las caras iniciales de 4 px no acreditaban el efecto de
entorno y se sustituyeron antes de aceptar esta prueba. La matriz prepara objetos
nuevos con el contexto ya efectivo; no acredita cambiar globalmente una escena
viva sin readmitir también sus otros consumidores afectados.

La [regresión de superficies de producto](performance/admission-color-biomes-20261114.json)
pasa en los seis biomas, día y noche, conserva cobertura en tres publicaciones
equivalentes y restaura el checkpoint de manglar. Son controles funcionales de
admisión y propiedad. Se respeta la suspensión de campañas de benchmarks/incursiones
del plan integrado; no se atribuye una mejora global de frame time a esta promoción.

## Validación y continuación

Catorce pruebas nuevas cubren invalidación estructural antes/después de ready,
valores uniformes estables y la caché real de `Nodes` sin avanzar `info.calls`.
La prueba de restauración asíncrona ejercita ahora el valor por defecto; se
conservan las variantes explícitas activada/desactivada en el pase de sombras.
[Regresión amplia](performance/admission-color-validation-20261114.json): **1113 pruebas / 93 archivos**, concurrencia 2, cero fallos/skips; comprobación dirigida final: **119 pruebas**. Build WebGPU/remote aprobado en **46,32 s**, opción de luces sin definir, con las advertencias habituales de chunks/imports mixtos. Registros locales: `.cache/native-color-{regression,directed}.tap` y `.cache/native-color-build.log`.

La [regresión con Workers reales](performance/native-prepared-color-frames-20261114.json)
regraba dos frames obsoletos con el mismo dispositivo, 93 buffers de vértices
conservados por paso, cero reemplazos y errores, y drenaje final comprobado.

Reproducción: Vite sin la opción de luces, `QA_BASE_URL=http://127.0.0.1:5181`,
`QA_NATIVE_COLOR=true` y `tools/experiments/audit_webgpu_temporal_ground.mjs` para
el delta nativo; sin esa opción QA para los doce biomas/luces.
`tools/experiments/audit_webgpu_admission_color.mjs` ejecuta la matriz exacta.
Se usa Node 20 y Playwright con Edge/WebGPU real, sin permitir WebGL.

Siguiente punto: consumidores cuyo apoyo sí cambia, demás familias/streams de
f-R4 y conexión con la autoridad ordinaria, personajes e intenciones; aceptación
A–F/B/C. No se retiran protecciones ni se cambia el recuento de cierres A6.
