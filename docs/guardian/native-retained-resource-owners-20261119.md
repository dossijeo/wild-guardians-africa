# Propiedad de recursos durante la recuperación retenida — 2026-11-19

Continuación A4/A5/e-R3/f-R4 del [plan integrado](integrated-gpu-migration-plan-20261104.md), tras el [contraejemplo de escritores futuros](native-uniform-writer-isolation-20261119.md). Cambian tres archivos de QA; no cambia el producto, el protocolo, la autoridad ni el kernel. No se añaden dependencias, propietarios, colas o relojes.

## Reutilización comprobada

Dos ensayos finales NVIDIA/Turing, con el mismo código congelado, completan la recuperación retenida pausada y en movimiento sobre WALK restaurado, un trabajador youngMale, desierto sin incursión y puerta intacta. Utilizan la autoridad C++ y los Workers/host/Surface/consumidor reales, con causalInputs y presentationInputs habilitados. Cada uno conserva una autoridad, un snapshot inicial, los seis propietarios gráficos y el inventario de actores, geometrías y materiales. Pasan checkpoint/ACK, nueva generación, selección, imagen y drenaje gráfico real mientras la autoridad sigue activa. Las dos imágenes se inspeccionaron.

| Control | Pausa | Movimiento |
| --- | ---: | ---: |
| Datos vinculados al frame conservados | 1355 | 1355 |
| Bindings vinculados conservados | 259 | 259 |
| Versiones físicas de uniformes / bindings derivados | 8 / 8 | 8 / 8 |
| Bytes nativos distintos por versión | 0 | 4 |
| Fábricas del productor atribuidas / observadas | 1 / 1 | 101 / 101 |
| Fábricas sin propietario | 0 | 0 |

Las ocho versiones de estado se cualifican por identidad exacta de la entrada retenida por el frame activo, secuencia válida, pin vivo, presentación visible, ausencia de bloqueo de mutación y escritor nativo vigente cuyo rango se solapa con la escritura del productor. La igualdad de bytes actual no basta para compartir esa vida: el contraejemplo anterior demuestra contaminación posterior del snapshot del productor. Se conserva el aislamiento de producción y todas las cantidades siguen visibles. Esta cualificación no demuestra que ocho sea el mínimo posible ni acepta su coste.

En pausa, el productor crea cero buffers, texturas, samplers, shaders y pipelines, y un bind group de un objeto/geometría/material ya observados en otro contexto. No se encontró un descriptor vivo duplicado con dependencias inalteradas, según el guarda existente. Esto atribuye el binding; no demuestra optimalidad global de la caché.

En movimiento se atribuyen 42 buffers, 3 texturas, 3 samplers, 25 bind groups, 10 layouts de bindings, 5 layouts de pipeline, 8 shaders y 5 pipelines asíncronos. Son 101 llamadas: 2 del atlas VFX, 60 de la huella real y sus datos, 38 de proxies del nuevo paso de profundidad y 1 del contexto existente. La huella se identifica por el ID del efecto y el dueño existente de sus texturas; los proxies, por fuente/geometría residentes, dueño y textura del target realmente solicitado por VFX. Sus buffers nuevos son uniformes: no se acepta reconstruir los vértices del terreno prestado. El número depende de la demanda que llega durante la ventana; no se convierte en una cuota permitida por estar en movimiento.

El criterio de recursos ahora distingue identidad de assets residentes, versiones de estado con escritores vivos y demanda nueva atribuida. Conserva los demás rechazos, incluida falta de cobertura nativa, cambio de datos residentes o bindings duplicados. El ensayo final acepta esa atribución, no cero asignaciones ni ausencia de tirones. La primera huella todavía genera trabajo y cpu-vfx mantiene el bloqueo de autonomía observado. Cadencia y coste de preparación quedan abiertos para B6/C4; no se cambia una medida de rendimiento por una etiqueta de propietario.

## Código consolidado y decisión

Se leyeron implementaciones reales de Three r180: [Renderer](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js), en particular initTexture, _createObjectPipeline, _renderObjectDirect y compileAsync; [NodeLibrary](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/nodes/NodeLibrary.js), fromMaterial; y las clases [RenderTarget](https://github.com/mrdoob/three.js/blob/r180/src/core/RenderTarget.js) y [Texture](https://github.com/mrdoob/three.js/blob/r180/src/textures/Texture.js). Los tres métodos observados coinciden con el oficial tras normalizar espacios; el archivo Renderer instalado completo difiere y ambos hashes se conservan. fromMaterial puede crear/copiar un material: no se invoca para inspeccionar, solo se registran sus llamadas reales. Las fábricas suceden en la parte síncrona de esos métodos; los wrappers devuelven la promesa original sin prolongar el scope hasta su resolución. Se usa el UUID existente de la textura del target: RenderTarget no proporciona uno propio.

La separación entre contenido y vida por frame se apoya también en la investigación previa del [UniformBuffer de Babylon](https://github.com/BabylonJS/Babylon.js/blob/048566f71dfce0f62d993fd3a7bcadc844407315/packages/dev/core/src/Materials/uniformBuffer.ts). Se adapta observación sobre los dueños existentes; no se introduce un asignador o caché propios. El testigo de bytes sigue delegando writeBuffer original y no hace readback GPU ni sustituye valores.

## Validación y pendientes

Tres sintaxis pasan. Dos ensayos GPU finales pasan funcionalidad y atribución; 18 controles del clasificador incluyen un positivo real y 17 rechazos de evidencia adulterada: identidad ausente, escritor obsoleto/sin permiso, rangos ajenos, frame oculto/bloqueado, bytes desconocidos, registros ausentes/duplicados, dueño o efecto ajenos, dos targets sin identidad, target distinto, demanda ausente y reemplazo de vértices prestados. Se fijan 623 inputs: 620 entradas previas intactas, una QA previa modificada y dos entradas añadidas al mapa; 64 nativos y 16 archivos ajenos exactos.

Se conservan los pilotos y sus fallos. moving3 falló por una llamada status inexistente en la fachada del observador, con el consumidor sano; se corrigió el observador. moving4 y el primer final-paused usan una versión anterior del criterio y no acreditan la identidad del target. La revisión detectó coincidencia de dos valores ausentes en RenderTarget; el final verificado usa la textura real y añade un negativo explícito. Los controles iniciales que no detectaban ese defecto se conservan sin presentarlos como aceptación final. Solo verified-paused y verified-moving constituyen los dos casos finales.

Los 938 casos dirigidos, 4441 de 4442 seleccionados con una omisión y build de 57.081 s se heredan expresamente de 29bb3950a; el contraejemplo 6/6 y su oráculo 5/1 esperado se heredan de 4f92971de. No se repiten esas suites por QA sin cambios de producto. Las tres exclusiones históricas de host/timeline permanecen abiertas, sin repetirlas ni declararlas reparadas.

[Recibo y evidencia reproducible](performance/native-retained-resource-owners-validation-20261119.json). Quedan recursos ordinarios en main, consumidor/cohort fallido, pérdida de dispositivo, coste de pausa/publicación, todas las cohortes, cadencia y plataformas. A6/A/B/C continúan abiertos, D no iniciado y f-R3 conserva su cierre de seguridad. El siguiente punto es la conexión ordinaria de recursos/productor y sus guardas; no volver a reconstruir o revalidar como pendiente la recuperación funcional de este fixture.
