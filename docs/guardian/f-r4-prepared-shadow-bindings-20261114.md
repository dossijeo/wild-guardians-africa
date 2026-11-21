# f-R4: preparar los bindings del pase de sombras real

14 de noviembre de 2026. Continúa la [retención de aldeas](f-r4-retained-villages-20261114.md).
**f-R4, e-R3/e-R4 y los once padres A6 siguen abiertos.** El primer dibujo de
las seis mutaciones del harness ya no crea recursos GPU; su cámara permanece
sobre un trabajador estacionario y no cubre toda la admisión del producto.

## Investigación y decisión

Se consultaron las implementaciones reales de Three r180, también en la
dependencia local fijada a 0.180.0:

- [ShadowNode.renderShadow/updateShadow](https://github.com/mrdoob/three.js/blob/r180/src/nodes/lighting/ShadowNode.js): el pase real usa la escena efectiva y `shadow.camera`, con su override material y contexto de sombra.
- [RenderList](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderList.js): obtiene su nodo de luces a partir de la identidad de escena y cámara.
- [RenderObjects.get](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObjects.js): el nodo de luces forma parte de la clave del render object, junto a objeto, material y contexto. Un shader reutilizado no implica reutilizar los bindings de ese objeto.

La compilación de sombras ya usaba material, target, callback y cámara reales,
pero la lista del grupo candidato conservaba otro nodo de luces. El primer
pase efectivo obtenía otro render object y creaba sus buffers y bind group.
En la [ejecución anterior](performance/native-village-retention-20261114.json),
añadir/restaurar terreno creó respectivamente **6/15 buffers y 2/5 bind groups**
durante la grabación del primer frame, después del efecto físico.

Se aplica al pase de sombras el adaptador de identidad de escena/luces ya
existente, usando **la cámara de la sombra** como clave. La sustitución dura solo
el setup síncrono de `compileShadowAsync`; lista, luces y hook se restauran antes
de cualquier espera, incluso ante errores. Se conservan sus guardas de propiedad
y el fallback para contextos incompatibles o raíces con luces propias.
No hay nuevos meshes de calentamiento, renderer, dependencia o caché.

La confirmación de compilación podía preceder a las últimas escrituras en la
cola de recursos. La telemetría nativa separa ahora sus copias internas de las
factories del preparador: se observaron uniforms terminados 0,5–1 ms después de
solicitar el hold. Para terminar la preparación, el mismo servicio de admisión
expone `completePreparation`, que espera `queue.onSubmittedWorkDone` a través
del FIFO de recursos existente, antes de devolver ready a la propuesta nativa.
La espera respeta aborto, cierre y pérdida; si falla, se aborta el batch
reservado. No bloquea el scheduler de preparaciones ni el dibujo anterior.

Antes de diseñarlo se leyeron
[Dawn, Queue.cpp, 696f37e8bf5524763c44fa94e2513bb34112c5f6](https://github.com/google/dawn/blob/696f37e8bf5524763c44fa94e2513bb34112c5f6/src/dawn/native/Queue.cpp),
donde `APIOnSubmittedWorkDone` liga el evento al serial programado, y
[wgpu v26.0.1, backend WebGPU](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu/src/backend/webgpu.rs),
que delega esa finalización en la Promise de la cola. Se usa la misma frontera
de prefijo, solicitando el fence existente, sin introducir otro protocolo o ejecutor propio.

La [opción experimental del pase de color](webgpu-admission-scene-lighting-20261108.md)
sigue su contrato anterior; no se activa globalmente para conseguir este
resultado. La corrección usa la identidad del pase de sombras que ya ejecuta
producto, independientemente de esa opción. Las pruebas ejercitan color
compartido tanto habilitado como deshabilitado. Su promoción general y los
criterios de fog/environment, luces y equivalencia visual siguen pendientes.

## Evidencia real y alcance

[Recibo WASM/WebGPU](performance/native-shadow-bindings-20261114.json), mismo
harness, propietarios y NVIDIA Turing. Seis pasos: retirar/readmitir un chunk,
suprimir/restaurar un prop y añadir/restaurar terreno. La prueba exige:

- **Cero factories GPU** durante la grabación del primer dibujo de cada paso,
  y cero mensajes de creación pendientes enviados antes de su ACK.
- Los nueve meshes residentes de la aldea conservan todos sus IDs GPU y no
  empiezan otra compilación; terreno y slots intactos también conservados.
- Mismo dispositivo, renderer, escena y trabajador; alturas admitidas iguales
  al payload nativo, sin regenerar recetas durante el commit.
- Las copias internas de uniforms y bind groups terminan antes de empezar el
  hold; no se copian buffers de geometría. No se confunden estas asignaciones
  previas con cero asignaciones totales. Cero errores GPU y cierre/drenaje
  verificados. Bloquear el preparador
  500 ms mantiene 15 dibujos del mundo anterior sin efecto físico anticipado.

El PNG final coincide byte por byte con la
[captura estacionaria anterior](performance/native-prepared-terrain-20261114.png):
SHA-256 `2b37183648a9a4560cb6c8c78aa32b28dc368ce7f1578ab3683a85fcf1a46682`.
Se inspeccionó la captura del trabajador y su sombra; no es equivalencia visual
de todos los biomas, cámaras, personajes o condiciones de luz.

El consumidor registra 2/6/21/39 copias de uniforms (192/576/2048/3456 bytes)
y el mismo número de bind groups en los pasos de props/terreno. Son versiones
para conservar los frames anteriores; todas terminan antes de solicitar el hold.
Los timestamps se toman en el consumidor, sin un RPC diagnóstico previo que
fuerce esa finalización. El harness rechaza copias terminadas después de la
solicitud y exige timestamps presentes cuando hay copias. El recibo confirma
`sharedColorLighting:false`. Los pasos finales registran:

| Cambio | Drenaje → primer dibujo | Intervalo máximo nativo | Factories durante grabación |
| --- | ---: | ---: | ---: |
| Añadir explanación | 42 ms | 66,6 ms | 0 |
| Restaurar terreno | 70,3 ms | 99,9 ms | 0 |

Son observaciones de esta ejecución, con variación de entrega/pacing, no
percentiles ni latencia máxima. Eliminar estas creaciones tardías no acredita
ausencia de tirones.
El recibo no prueba mover la cámara hacia los chunks cambiados ni admitir los
bindings de color de todas las mallas recién visibles. Tampoco cubre la
preparación anterior al efecto de otros consumidores cuyo apoyo cambie.

## Validación y siguiente punto

Seis casos verifican también finalización por prefijo, progreso independiente
de otras preparaciones, aborto/cierre/pérdida y errores síncronos/asíncronos.
Otros seis casos nuevos verifican la cámara/nodo de sombras correcto y la restauración
antes de esperar ante éxito, rechazo asíncrono y excepción síncrona, con ambos
modos del pase de color. Se conservan los tests existentes de propiedad
reentrante, materiales alternativos, abortos y restauración del pase real.
**107 pruebas dirigidas** sin fallos/skips. Selección amplia: **1099 pruebas en 92 archivos**, concurrencia 2, sin fallos ni
skips, con el contexto de sombras y la finalización de recursos incorporados:
`.cache/native-shadow-bindings-regression.tap` y
`.cache/native-shadow-bindings-selection.json`. Sintaxis comprobada.

La regresión con Workers reales regraba dos frames obsoletos, comparte 93 buffers
de vértices por paso y conserva el dispositivo, sin errores y con drenaje:
`.cache/native-shadow-bindings-frames.json`.

Continuar la admisión de color al incorporar geometría al encuadre, su validación
visual pendiente y los consumidores cuyo apoyo sí cambia. Permanecen las otras
familias/streams de f-R4, autoridad normal, personajes/intenciones y aceptación
A–F/B/C. No se retiran protecciones ni se cambia el recuento de cierres.

Build WebGPU/remote draw aprobado en 41.84s, con el pase de color experimental
desactivado y las advertencias habituales de tamaño de chunks:
`.cache/native-shadow-bindings-build.log`.
