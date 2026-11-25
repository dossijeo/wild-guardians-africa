# Escrituras de texturas entre publicaciones — 2026-11-21

Continuación de aislamiento de recursos en A5 del [plan integrado](integrated-gpu-migration-plan-20261104.md). La aceptación de A5/A6 y la cadencia de 60 FPS siguen abiertas.

## Fallo y corrección

La pasada de colocación individual `.cache/native-build-single-final4.log` llegó al rechazo final con una textura de 1×64 y buffers diferidos mientras había un paquete pendiente. `webgpu-pipeline-admission.flushUploads` pidió completar la cola y el Host rechazó correctamente una barrera que aún no cubría esas escrituras. El log no identifica el formato ni demuestra qué propietario creó esa textura.

El Host ya bifurcaba buffers publicados antes de escrituras CPU independientes del frame. Las texturas solo podían aprovechar la bifurcación en la recuperación de una preparación retenida; una escritura ordinaria a una textura compartida con el paquete activo o pendiente se acumulaba en `stagedOperations`, arrastrando los buffers posteriores.

La corrección conecta `writeTexture` independiente con `forkPublishedTexture`, conservando el fence estricto. Se copia únicamente la generación compartida con un paquete vivo. Las escrituras CPU del paquete pendiente se superponen a la copia antes de aplicar la escritura posterior. Las vistas y bindings nuevos apuntan a la nueva generación; los paquetes anteriores conservan sus objetos originales. Las siguientes escrituras sobre la generación todavía no publicada la reutilizan.

La bifurcación admite texturas 2D copiables de una muestra y formato de color sin comprimir. Se rechazan texturas con uso storage, destinos de escrituras GPU de paquetes activos o pendientes, y texturas con escrituras pendientes de otro tipo. El Host decide por el uso efectivo de la vista en los comandos, de modo que una textura con permiso de render attachment sigue siendo elegible cuando el paquete solo la lee. La retirada usa los pins, dependencias y fences existentes.

## Patrón consultado

La revisión `67a5ceb26d828f46155b6ea2fa9afc510c5aa8b3` de Skia aporta tres referencias.

- `aboutToDraw` comprueba si la superficie sigue compartida con un snapshot antes de bifurcarla. [SkSurface_Base](https://github.com/google/skia/blob/67a5ceb26d828f46155b6ea2fa9afc510c5aa8b3/src/image/SkSurface_Base.cpp).
- `onCopyOnWrite` sustituye el almacenamiento compartido con la imagen retenida. [SkSurface_Ganesh](https://github.com/google/skia/blob/67a5ceb26d828f46155b6ea2fa9afc510c5aa8b3/src/gpu/ganesh/surface/SkSurface_Ganesh.cpp).
- `writePixels` distingue escrituras completas y parciales para decidir si conserva contenido. [SkSurface](https://github.com/google/skia/blob/67a5ceb26d828f46155b6ea2fa9afc510c5aa8b3/src/image/SkSurface.cpp).

Wild Guardians adopta el aislamiento por identidad compartida. La cola remota conserva el orden del productor al aplicar las escrituras del paquete pendiente sobre la copia. Se copian todos los mips y capas para conservar los texels previos. La implementación reutiliza el Host existente.

## Evidencia y coste

Los catorce controles añadidos reutilizan el transporte y el Host de `remote-webgpu.test.js` con un doble de GPU que registra bytes, objetos y fences. Cubren actualizaciones parciales sobre mips y capas, orden de escrituras pendientes, identidad de los bindings anteriores, reutilización de la copia, rechazo de los casos inseguros y retirada diferida.

En el caso controlado de 1×64 `rgba8unorm` y un mip, se crea **una textura de 256 bytes de texels** con una copia GPU de 1×64×1, una vista y un binding dependiente. La textura vecina y los IDs del productor conservan sus identidades. La textura antigua sobrevive al reemplazo hasta que se desanclan sus paquetes y finaliza el fence nativo. El total de 256 bytes mide contenido de la textura. El formato de `Texture:724` quedó indeterminado en la captura negativa original.

Una textura mayor exige copiar todos sus mips y capas. La duración de esas copias, los intervalos de 49 y 93 ms, la microtarea de 19,65 ms y la latencia del gesto siguen pendientes en C4.

## Validación y ejecución

Antes de corregir, los positivos de publicación activa y pendiente reproducen el rechazo del fence. Después pasan las 337 pruebas relacionadas y el build de producto.

```powershell
.cache/tooling/node20.exe --test tests/remote-webgpu.test.js tests/remote-webgpu-resource-timing.test.js tests/webgpu-pipeline-admission.test.js tests/webgpu-world-client.test.js tests/native-build-active-farm.test.js
```

En Edge con NVIDIA Turing, un Worker de dibujo con el Host de producto y canvas WebGPU presentó la secuencia 1 y admitió la 2 sin dibujarla. Con el Host de `fbbf623dd`, la escritura de textura y el buffer posterior quedaron diferidos y el fence devolvió el rechazo observado durante la colocación. Con el cambio y la misma intercalación, el fence terminó con las dos secuencias en el mismo estado y cero operaciones diferidas. El Host conservó 12 IDs lógicos y el cliente conservó sus seis altas. Hubo una textura física adicional, una vista y un binding para el recurso escrito. La lectura física comprobó las 64 filas de la textura vecina y el contenido exacto de la textura escrita antes y después de presentar el paquete pendiente. La secuencia 3 se presentó sin errores WebGPU. [Antes](performance/native-standalone-texture-upload-20261121/physical-before.json) · [Después](performance/native-standalone-texture-upload-20261121/physical-after.json).

Para repetir el contraste, `tools/experiments/audit_native_texture_upload.mjs` usa Edge y la URL de Vite indicada por `QA_BASE_URL`. `PLAYWRIGHT_MODULE` permite señalar una instalación de Playwright. `QA_BASELINE_HOST` apunta opcionalmente a un archivo con el blob de `src/rendering/remote-webgpu-host.js` de `fbbf623dd` y exige el rechazo original. El escenario controla el orden de presentación y conserva el Host, el transporte y la cola de WebGPU.

La colocación individual desde la UI en NVIDIA Turing confirmó un nuevo centro y un módulo de muro, rechazó ambos duplicados y retiró sus dos previsualizaciones. El Host registró una bifurcación de `Texture:713` de 1×64 `rgba32float` con un mip, equivalente a 1.024 bytes de texels, y cero errores WebGPU. El contador de 64 recreaciones de vistas o bindings corresponde a la sesión completa. La muestra acumulada requiere atribución por operación y carece de una medición de cadencia. [Recibo de la UI](performance/native-standalone-texture-upload-20261121/build-ui.json).

## Revisión del recorrido y formatos comprimidos

La clasificación de salidas de textura se integra en el recorrido de comandos que ya clasifica destinos de buffers. Consulta las vistas de color, resolve y profundidad y los destinos de `copyTextureToTexture` y `copyBufferToTexture`. El descriptor descarta storage antes de bifurcar. Así se aprovecha la inspección existente sin un recorrido adicional de dependencias por cada submit.

Los formatos BC, ETC2, EAC y ASTC permanecen fuera de esta bifurcación. `ValidateTextureCopyRange` de Dawn valida el rango contra la extensión física del mip y exige que origen y tamaño sean múltiplos de bloque. El bucle de copia actual calcula dimensiones lógicas. Siete controles adicionales cubren las cuatro familias comprimidas y los destinos resolve, depth y copy de buffer. [Código de Dawn](https://dawn.googlesource.com/dawn/+/5eb3619d3e59cd829da5a5da3381cc76713868bc/src/dawn/native/CommandValidation.cpp#316) · [Regla de WebGPU](https://www.w3.org/TR/2026/CRD-webgpu-20261116/#validating-texture-copy-range).

## Mipmaps entre dos épocas de mundo

Al adquirir el primer Idle22 en NVIDIA, un envío independiente de Three quedó en espera y el Host lo rechazó por pertenecer a la época anterior. El recibo identifica once pases de mipmaps sobre una textura. Three prepara vistas consecutivas de la misma textura y las envía en un buffer de comandos. El Host ya comprobaba esa estructura. [Implementación de Three r180](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/utils/WebGPUTexturePassUtils.js#L297-L383).

El Host permite que ese envío siga en su orden original cuando todos sus comandos son de mipmaps y valida que la textura, sus vistas y sus grupos siguen apuntando a una generación privada. Recuerda si un paquete llegó a fijar la generación, incluso si aquel paquete fue descartado. La ruta conserva las escrituras anteriores y la espera de un segundo hold. Rechaza texturas que pertenecieron a un frame, vistas de otra generación, dependencias en trabajo de destino pendiente y lotes mezclados con dibujo de mundo.

Ocho controles dirigidos ejercitan el orden y sus rechazos usando el Host y una cola GPU determinista. El caso de once pases envía una sola vez al terminar el hold. Las 183 pruebas de transporte y recursos pasaron sobre el cambio aislado. La prueba de navegador con el candidato completó el arranque sin reproducir el cruce. La aceptación física de esa intercalación sigue pendiente.
