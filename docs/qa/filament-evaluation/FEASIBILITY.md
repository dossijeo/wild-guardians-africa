# Viabilidad de Filament en navegador

## Dependencia e inicialización verificadas

La dependencia evaluada es **Filament v1.78.0**, commit
`c1dc4e444784850d6dc891a1fb38747c30b85463`. El archivo oficial web y su SHA256
están fijados en `tools/filament-evaluation/dependency.json`. No se ha creado un
fork ni modificado el motor. La selección de esta versión no implica que su
backend WebGPU haya alcanzado la misma madurez que sus otros backends.

La distribución oficial incluye WebGPU: el
[script oficial de distribución web](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/build/web/build.sh#L16)
invoca `-W -y none -p wasm`. El
[script general](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/build.sh#L370)
genera `emdawnwebgpu_pkg` desde Dawn incluido y entrega su puerto local a
Emscripten. Evita depender de un puerto remoto cuyos encabezados puedan estar
atrasados respecto a Dawn. La instrucción `-p webgl` de `BUILDING.md` está
desactualizada; el script vigente acepta `-p wasm`.

Ruta de compilación desde una máquina Linux/macOS con las herramientas nativas
y Emscripten preparados:

```sh
export EMSDK=/ruta/al/emsdk
./build.sh -W -y none -p wasm release filament-js
```

**Esta evaluación ejecutó el WASM oficial; no recompiló Filament WASM.** Por
tanto, la compatibilidad completa de una compilación local queda descrita por
el código oficial, no demostrada mediante una compilación propia. El script de
obtención de Emscripten referencia el instalador 5.0.4, pero instala `latest`:
para reproducibilidad estricta hay que fijar también la versión real del SDK.
En el entorno disponible existe Emscripten 6.0.12 en `/opt/emsdk`; no se utilizó
el `emcc` antiguo del sistema para compilar el motor.

La API
[`initWebGPU`](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/web/filament-js/utilities.js#L21)
solicita adaptador y dispositivo en JavaScript. Hay que hacerlo antes de
`Filament.init`, porque
[`wasmloader.js`](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/web/filament-js/wasmloader.js#L69)
transfiere `preinitializedWebGPUDevice` al crear el módulo. Después se usa
`Engine.create(canvas, {backend: Filament.Backend.WEBGPU})` y
`engine.createSwapChain()`. Deben solicitarse las capacidades opcionales
necesarias: omitir `rg11b10ufloat-renderable` produjo errores reales que
desaparecieron al reproducir la configuración oficial.

La prueba mínima ejecutada consta en `official-web/result.json` y
`official-web/browser.png`: adaptador físico Intel, backend efectivo 4,
GLB original de Kofi, animación, plano, luz direccional, cámara móvil y 120
fotogramas sin errores. No es una inferencia basada en `navigator.gpu`:
[`PlatformFactory`](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/filament/backend/src/PlatformFactory.cpp#L138)
resuelve WebGPU a `WebGPUPlatformWasm`; si no está compilado devuelve nulo.
No sustituye silenciosamente esa selección por WebGL. `engine.getBackend()`
y los envíos reales a la cola completan la comprobación.

## Cobertura de API y materiales

Los [bindings oficiales](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/web/filament-js/jsbindings.cpp)
exponen escenas, cámaras, transformaciones, luces, renderables, texturas,
materiales y liberación de recursos. `gltfio` carga GLB/glTF, recursos y
activos instanciados; `Animator.applyAnimation`, `updateBoneMatrices` y
`applyCrossFade` cubren animación y skinning. La prueba mínima ejecuta el
animador nativo. No se ha validado toda la colección de modelos del juego.

Hay instancing de renderables mediante `RenderableManager.Builder.instances`
y `setInstanceCount`, además de instancias de activos glTF; son mecanismos
distintos. La prueba de hierba emplea instancing nativo, `instanced: true`,
índice de instancia y una textura de datos persistente. La captura residente
de Sabana se ejecutó con 10.741 instancias y dos draw calls de cobertura.
Esto no demuestra todavía streaming o culling CPU equivalentes al juego.

Los materiales se compilan anticipadamente con `matc`, a partir del lenguaje
de materiales y fragmentos GLSL de Filament. El backend consume los shaders
generados para WebGPU. Un `ShaderMaterial` de Three.js no se puede transferir
como una cadena GLSL arbitraria: hay que adaptar entradas, atributos,
parámetros, dominios de vértice y funciones a la interfaz de Filament. Los
paquetes deben incluir `-a webgpu`; para fallback pueden incluir también
`-a opengl`. En navegador corresponde el perfil **mobile**. Tanto
`grass.mat` como `grass-instanced.mat` se compilaron con ese perfil y se
ejecutaron en el prototipo. `compile-materials.sh` reproduce la generación
con un `matc` oficial instalado o un wrapper equivalente.

La [documentación de materiales](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/docs_src/src_markdeep/Materials.md.html)
describe materiales `unlit`, entradas de normales, oclusión, emisión,
`postLightingColor`, parámetros, texturas y modificación de vértices.
Estas piezas permiten expresar paletas, rampas estilizadas, viento, relieve
y controles de día/noche. El prototipo de hierba adapta matemáticas reales
del laboratorio con esos mecanismos. **No se ha recreado AfricanToon completo**
ni demostrado fidelidad de sus seis biomas: la posibilidad de escribir las
operaciones no sustituye la validación artística y visual.

Las luces direccionales y sombras son nativas. En un material `unlit`,
`shadowMultiplier` permite recibir el factor de sombra de luces direccionales;
debe evaluarse si reproduce la interacción artística requerida. Transparencia,
mezcla aditiva, normales, roughness y refracción permiten plantear agua,
superficies húmedas y efectos. La documentación advierte que sus modos de
transparencia no resuelven exactamente geometría cóncava. No se han validado
agua, partículas, destrucción ni todos los pases específicos de Wild Guardians.

## Limitaciones medidas y alcance de los contadores

El [backend WebGPU](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/filament/backend/src/webgpu/WebGPUDriver.cpp)
declara temporización propia de fotogramas no disponible:
`getTimerQueryValue` devuelve `ERROR` y begin/end de esas consultas están
vacíos. La instrumentación externa del experimento introduce timestamps en
cada render pass. Su intervalo va del primer inicio al último final de pase;
no equivale a medir todas las transferencias o comandos fuera de ese intervalo.
Las pruebas RAF se ejecutan sin timestamps y tienen prioridad para la decisión.

El mismo backend declara sin soporte framebuffer fetch, swapchain sRGB,
swapchain MSAA, stereo y resolución de profundidad/stencil. Esto no significa
que todo antialiasing fuera de pantalla o toda sombra esté ausente. Las APIs
ordinarias de buffers y actualizaciones parciales existen; varias variantes
asíncronas están pendientes y el modo asíncrono está desactivado. El límite
de UBO que devuelve el backend está fijado en 64 KiB.

`Filament.Buffer` hace una copia JavaScript y otra al heap WASM. Por ello,
reconstruir atributos completos por fotograma puede trasladar el cuello de
botella a CPU. La prueba usa recursos persistentes y uniformes para viento.
El binding web de `Texture.setImage` utilizado expone cargas de nivel completo:
en la variante de instancing una modificación parcial de entidades vuelve a
subir la textura de datos completa; ese coste forma parte de la medición.

La textura de pigmento utiliza una cadena de mipmaps construida en CPU y
cargada explícitamente en ambos motores. Este workaround evita depender de
la generación automática que falló en la prueba y mantiene iguales los
texeles y niveles de la comparación. No demuestra que todas las rutas de
generación GPU de mipmaps de Filament estén inutilizables. Su preparación se
incluye en costes de recursos/carga, no se oculta como trabajo gratuito.

La memoria GPU calculada por interceptación es una estimación de buffers y
texturas explícitos, sin alineación interna del controlador, swapchain ni
asignaciones no expuestas. Los triángulos se cuentan a partir de llamadas
reales de dibujo; se marca el resultado incompleto si aparecen dibujos
indirectos o render bundles no inspeccionados.

## Herramientas de materiales en Windows y WSL

Se ejecutó `matc` Linux oficial v1.78.0 en WSL Ubuntu 22.04. Inicialmente
falló porque necesita GLIBC 2.38 y el sistema tiene 2.35. No se sustituyó la
biblioteca del sistema: se extrajo libc 2.39 en un directorio aislado y se
invocó su cargador con `--library-path`. Así se compiló un material propio
y los materiales del experimento sin modificar Filament.

Fuentes exactas y SHA256:

| Archivo | SHA256 |
| --- | --- |
| [Herramientas Linux oficiales](https://github.com/google/filament/releases/download/v1.78.0/filament-v1.78.0-linux.tgz) | `6fde729259ef0aaca2b4c1a3768ba2c02ac9a808275bed5f8ae8c15a86c4f6fe` |
| [libc6 de Ubuntu](https://archive.ubuntu.com/ubuntu/pool/main/g/glibc/libc6_2.39-0ubuntu8.9_amd64.deb) | `ff5557d99b51f761c4b7c92368b9cc45565eda17df9bf9eb4b134d09825008be` |

Ejemplo genérico de wrapper para `MATC`, con rutas absolutas propias:

```sh
#!/bin/sh
exec /ruta/libc/usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 \
  --library-path /ruta/libc/usr/lib/x86_64-linux-gnu \
  /ruta/filament/bin/matc "$@"
```

La libc auxiliar es una herramienta local de compilación; no se distribuye
al navegador. El WASM y JavaScript oficiales son independientes de ella.

## Licencias y dependencias

La licencia principal de [Filament es Apache-2.0](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/LICENSE).
No debe aplicarse esa etiqueta de forma indiscriminada a todo `third_party`.
Se inspeccionaron los siguientes archivos del commit fijado:

| Dependencia | Evidencia y alcance |
| --- | --- |
| Dawn y Tint, incluido Emdawnwebgpu | [LICENSE](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/third_party/dawn/LICENSE): BSD de tres cláusulas para `Files: *`; excepciones Apache-2.0 para las rutas indicadas en el mismo archivo. Sus terceros tienen avisos propios. |
| glslang | [LICENSE.txt](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/third_party/glslang/LICENSE.txt): conjunto de licencias BSD de tres y dos cláusulas, MIT y Apache-2.0 según componente. No es una única licencia Apache. |
| SPIRV-Cross | [LICENSE](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/third_party/spirv-cross/LICENSE): Apache-2.0 principal; archivos particulares y recursos poseen avisos adicionales. |
| cgltf | [LICENSE](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/third_party/cgltf/LICENSE): MIT. |
| Draco | [LICENSE](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/third_party/draco/LICENSE): Apache-2.0. |
| Basis Universal | [LICENSE](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/third_party/basisu/LICENSE): Apache-2.0 principal; subcomponentes y carpeta `LICENSES` conservan otros avisos. |

Esta tabla identifica componentes relevantes; no es un inventario binario
exhaustivo de todos los objetos enlazados. Una distribución del juego debe
conservar los avisos aplicables del artefacto y dependencias incorporadas.
No se encontró una obligación de abrir el código del juego en las licencias
principales inspeccionadas. La elección de migrar sigue dependiendo del
benchmark, de la paridad visual y de la cobertura funcional documentados por
el informe de evaluación; esta comprobación de viabilidad no los sustituye.
