# f-R4: conservar el terreno al cambiar props

Estado: incremento parcial de f-R4; e-R3/e-R4/f-R4 y los once padres A6 abiertos.
Continúa la [preparación del delta](f-r4-prepared-terrain-delta-20261113.md) y la
[continuación del frame](f-r4-frame-continuation-20261113.md). No activa la
autoridad nativa en la partida normal.

## Referencias de código y decisión

Antes de implementar se consultaron estas implementaciones reales:

- [Three r180, Attributes.update](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Attributes.js):
  creación inicial y actualizaciones determinadas por identidad/versión del
  atributo. Una revisión de publicación no obliga a cambiar esos atributos.
- [Godot 4.5, MeshStorage](https://github.com/godotengine/godot/blob/4.5/servers/rendering/renderer_rd/storage_rd/mesh_storage.cpp):
  `mesh_surface_update_vertex_region`, `mesh_surface_update_attribute_region` y
  `mesh_surface_update_index_region` actualizan sus buffers existentes por
  separado; `_multimesh_mark_dirty` limita la invalidez a los datos afectados.
  Se adopta la separación entre publicación, contenido geométrico e instancias.
- [Three r180, WebGPUAttributeUtils.createAttribute](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/utils/WebGPUAttributeUtils.js):
  promociona índices Uint16 a Uint32 al crear su buffer. La comparación entre
  payload canónico y residencia debe reconocer esa representación equivalente.
  La primera ejecución GPU detectó este caso; quedó cubierto antes del cierre
  del incremento. Los registros fallidos locales se conservan.

No se añade una dependencia ni otro propietario de terreno. Se adaptan estos
patrones al coordinador terreno/bioma y a sus tickets existentes.

## Cambio implementado

El adaptador temporal intenta conservar el subárbol de terreno antes de crear
geometría/materiales o ejecutar el preparador de barro. Exige la misma época,
residencia visible y coincidencia exacta de posiciones, colores, valores de
índices, agua, máscara y barro registrado. Los factories de suelo de producto
Savanna/Desert/Volcanic/Mangrove se revisaron en código: sus entradas por chunk
son las coordenadas y la máscara canónica; su iluminación, contactos y recursos
compartidos conservan sus propietarios. Los factories personalizados requieren
declarar ese contrato; por defecto siguen preparando un reemplazo completo.

Un participante de retención actualiza la identidad de publicación del dueño
existente, sin separar/reinsertar el grupo ni retirar sus leases. La revisión
lógica cambia dentro de la misma transacción que los props. El rollback restaura
revisión, metadatos de agua e identidad anterior. Abortarlo no dispone recursos
visibles. La jubilación definitiva del chunk sigue pasando por el dueño original,
una sola vez, con su drenaje diferido habitual.

Se conservan las referencias de los atributos y del muestreador canónico:
instalar una copia idéntica de posiciones habría roto su certificado por identidad.
Los tickets de pipelines admiten un subárbol que ya estaba unido y cuyo padre
permanece idéntico; materiales, descendientes, pases y cambios de padre siguen
invalidando el ticket. El conjunto sigue preparando su admisión real.

Una altura, color, índice, máscara, agua, barro o época diferente conserva la ruta
de reemplazo. No se ha implementado aún la reutilización de cada stream dentro
de un terreno parcialmente cambiado. Las instancias del chunk revisado todavía
se preparan mediante su dueño de bioma; no se afirma mínima asignación global.

## Evidencia reproducible

[Recibo WebGPU](performance/native-terrain-retention-20261113.json) y
[captura](performance/native-terrain-retention-20261113.png), NVIDIA Turing:

- WASM nativo, bridge/cohorte reales, propuesta previa por el canal de terreno y
  surface de producto con el draw Worker real, un solo dispositivo/renderer.
- Retirada/readmisión de un chunk y eliminación/restauración de un prop canónico.
  Eliminación afecta un chunk y restauración dos; todos conservan mesh, geometría,
  material, los cuatro IDs de buffers y su textura de máscara. El recibo registra
  los IDs anteriores y posteriores. Otro chunk conserva sus IDs en los cuatro pasos.
- Cero errores GPU, cero forks de buffers/bindings, nueve chunks finales. Se
  comprueban los cambios reales de presencia del prop en los payloads nativos.
  Cierre del surface y drenaje de la conexión verificados antes de terminar Workers.
- El bloqueo previo de readmisión de aproximadamente 500 ms sigue dejando dibujos
  del mundo anterior, sin hold ni efecto físico anticipado. No prueba locomoción.
- El commit/proyección de props tras drenaje aún tarda aproximadamente 14–18 ms;
  la preparación canónica de esas familias aún debe instalarse sin regeneración.
  Los contadores globales incluyen preparación de props y actualizaciones normales:
  no equivalen a recursos de terreno reconstruidos ni prueban ausencia de tirones.

Reproducción: `tools/experiments/audit_webgpu_temporal_ground.mjs`,
`QA_NATIVE_DELTA=true`, `QA_NATIVE_OBSOLETE=false`, `QA_BASE_URL` y
`PLAYWRIGHT_MODULE` configurados; ejecutar con `.cache/tooling/node20.exe`.
La captura inspeccionada mantiene trabajador texturado y sombra sobre el suelo;
el prop está fuera de cámara. Es un fixture a tiempo nativo 10 s, con personaje
estacionario. No sustituye A–F, gameplay normal ni la aceptación integrada C.

Las pruebas nuevas cubren publicación, rollback tardío de props, aborto durante
admisión bloqueada, protección de recursos visibles, streams/épocas diferentes,
factory desconocido, payload alterado, agua/barro conservados sin regeneración,
promoción real del formato de índices y tickets para terreno ya adjunto.

Selección de 924 pruebas en 80 archivos aprobada, sin skips/fallos, con
`--test-concurrency=2`: `.cache/native-terrain-retention-selection.json` y
`.cache/native-terrain-retention-regression.tap`. La primera pasada con cuatro
procesos falló en la prueba de orden de mensajes con esperas fijas de 20 ms,
ya intermitente antes de este incremento; sus 15 casos pasan aislados. Se conserva
esa pasada en `.cache/native-terrain-retention-order-timing-failure.tap`, sin
cambiar test ni criterios. Sus imports y el handler extraído no usan el mecanismo
de retención de terreno modificado aquí.
Build WebGPU/remote draw aprobado en 46,78 s, con las advertencias habituales de
tamaño de chunks: `.cache/native-terrain-retention-build.log`. Sintaxis del
harness y de los módulos modificados comprobada.
La regresión de continuación de frames con los Workers de producto también pasa:
dos rechazos, cero reemplazos de dispositivo, cero errores GPU, 93 buffers de
vértices conservados y drenaje verificado. Registro independiente en
`.cache/native-terrain-retention-frame-regression.json`; no se sobrescribe el
recibo del incremento anterior.

## Siguiente dependencia

Continuar f-R4 con preparación/instalación canónica de las familias de props y
terreno pendientes y retención de otros recursos sin cambios, investigando antes
el código de soluciones consolidadas. Conectar luego la autoridad ordinaria y
las intenciones/personajes a los propietarios comunes: e-R3/e-R4 y aceptación
A–F siguen pendientes. No retirar la protección histórica como sustituto.
