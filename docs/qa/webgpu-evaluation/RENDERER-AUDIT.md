# Auditoría del renderizador para evaluar WebGPU

Fecha: 2026-10-20. Código auditado: `719510cec`, base del experimento independiente `codex/webgpu-renderer-evaluation`. Auditoría estática; este documento no atribuye mejoras de rendimiento a WebGPU ni sustituye los benchmarks.

## Resultado de la inspección

Three.js está fijado a **0.180.0** (`package.json:26`). El renderer principal es `WebGLRenderer`, con shaders GLSL y numerosos puntos de integración específicos de ese renderer. Cambiar el constructor no conserva el comportamiento gráfico. Es necesario comprobar las capacidades de WebGPURenderer/TSL de esta versión mediante el prototipo independiente antes de decidir una actualización o una migración.

El alcance principal es la traducción de materiales, sombras, pasadas y carga de recursos. La representación de escenas, modelos, texturas y gran parte del streaming puede reutilizarse. La simulación y la navegación no necesitan migrarse.

Las referencias siguientes corresponden a la base auditada; algunos archivos contienen funciones GLSL extensas en una sola línea.

| Sistema | Evidencia en `src/rendering/` | Implicación |
| --- | --- | --- |
| Inicialización | `scene.js:96–101`: WebGLRenderer, SRGB, ACES, PCFSoft, native shadows y destrucción | Integración mucho más amplia que el constructor |
| AfricanToon | `african-toon.js:43–140`: hooks encadenados, ShaderChunk, variantes y cache keys | Portar fórmulas y composición, no sustituir por un material estándar visualmente distinto |
| Material del suelo | `biome-ground.js:10–70`: texturas clonadas, anisotropía 8, máscaras por chunk, uniformes y ownership | Datos reutilizables; mantener máscaras y liberación por propietario |
| Relieve del suelo | `biome-material-source.js:1`: `groundMaterial417`, `textureGrad`, POM de hasta ocho muestras, AO, roughness, normales, desgaste y variantes de bioma | Validar derivadas, coordenadas desplazadas y escala; no eliminar POM para obtener una ventaja artificial |
| Iluminación del suelo | `african-toon.js:77–104`: BRDF continuo propio en biomas `<4.5`; Desierto usa AfricanToon | MeshStandard por defecto no constituye paridad |
| Agua | `african-toon.js:145–197`, configuración en `scene.js:165` | Preservar profundidad/clip, transparencia, entorno, sombras y noche |
| Objetos | `asset-surface.js:19`, `asset-clip.js:26`, `obstruction.js:29` | Los hooks adicionales también forman parte del material efectivo |
| Cultivos | `crop-batch.js:46,145,283–306`: crecimiento, transición e instancing con dirty ranges | Ya hay batching y uploads parciales |
| Actores | `scene.js:480–502`: SkeletonUtils.clone, AnimationMixer y envolventes de skinning; precarga en `:199–225` | Reutilizar animación; validar skinning, normales y sombras |
| Sombras | `native-shadow.js:13–55`: profundidad de comparación y color packed para DEST; intercepta `shadowMap.render` y `renderBufferDirect` | Dependencia fuerte de WebGLRenderer; preservar ambos consumidores de profundidad |
| Integración de luz/sombra | `native-shadow.js:60–69`: sustitución del término de luz direccional de ShaderChunk | No basta activar las sombras estándar del renderer nuevo |
| Cache de sombras | `shadow-cache.js:5–110`: captura matrices, atributos activos, huesos y contratos de depth shaders | Política reutilizable; mecanismo e inputs requieren adaptación |
| Instancing/LOD | `asset-lod.js:10–24,37–58`: InstancedMesh por nivel, cámara cuantizada a 1,5 m, repacking condicionado al cambio de orden | La selección completa no ocurre todos los fotogramas |
| Streaming | `chunk-stream.js:7–70`: Worker, una petición activa, prioridades, epochs y descarte de respuestas; `scene.js:354–369`: región/horizonte | Mayoritariamente independiente de API gráfica |
| Registro de materiales | `material-registry.js:1–65`: descubrimiento por eventos y actualización de agua | Ya evita traversals redundantes del mundo |
| Precarga | `loading-programs.js:9–19`, `loading-textures.js:9–14`: getContext, renderer.properties, currentProgram y uniformes compilados | Necesita una ruta distinta para WebGPU |
| Vida del contexto | `gl-resource-epoch.js:3–26`: instrumentación create/delete GL y context loss; `scene.js:674`: liberación | Device loss de WebGPU requiere política equivalente, no copiar eventos WebGL |
| Destrucción y humo | `buildings.js:136–224`: targets, cache por cámara/daño y profundidad compartida; `building-effects.js:19,31` | Preservar orden de pasadas, buffers y composición |
| Otros shaders | `vfx.js:8`, `sky.js:31`, backdrop, loading mist/sparkles y ripples | Hay RawShaderMaterial/ShaderMaterial fuera del suelo |
| Frame completo | `scene.js:671–672`: rebase, DEST, preparación VFX, cielo, mundo, profundidad y humo/VFX | El benchmark GPU debe envolver todas las pasadas |

La búsqueda encuentra **18 archivos de `src/rendering`** con `onBeforeCompile`, `ShaderMaterial` o `RawShaderMaterial`. Es un inventario mínimo, no 18 shaders independientes: existen fuentes GLSL importadas, combinaciones de variantes y shaders experimentales fuera de esa carpeta.

## Límites de API frente a costes de implementación

### Capacidades específicas que merece la pena probar

- Compute y buffers de almacenamiento para seleccionar/compactar instancias de cobertura persistentes en GPU. La ventaja potencial es evitar selección y transferencias CPU→GPU; debe medirse incluyendo dispatch, sincronización y trabajo gráfico.
- Envío de trabajo mediante WebGPU en escenas con muchos materiales/draws. No se presupone una reducción de CPU: hay que medir el renderer y el backend concretos.
- TSL como composición explícita de operaciones reutilizables, frente a sustituciones de cadenas GLSL. Puede reducir fragilidad de mantenimiento, pero se debe demostrar conservando todas las operaciones relevantes.

WebGL2 no ofrece compute shaders generales equivalentes. Eso no implica que el renderer actual carezca de instancing, LOD, culling, Workers o actualizaciones parciales: ya los utiliza.

### Costes que no deben atribuirse a WebGL2

- **Snapshot de sombras:** `shadow-cache.js` construye arrays y recorre valores de instancias/huesos para verificar cambios. Medir su CPU por separado. Invalidación más específica también podría implementarse manteniendo WebGL2.
- **Generación serial de chunks:** un Worker recibe una petición a la vez. Cambiar API no elimina generación CPU/WASM, espera de assets ni adopción de resultados.
- **Contabilidad de LOD:** `updateAssetLods` recorre batches para estadísticas aunque la clave no cambie. Cachear agregados o separar instrumentación es una optimización de implementación.
- **Registro de materiales:** la ruta normal ya evita dos traversals completos. Su alternativa QA `enabled=false` representa el comportamiento antiguo y no debe usarse inadvertidamente como baseline.
- **Cultivos y props:** ya cuentan con instancing y uploads condicionados/parciales. Compararlos con un baseline de objetos individuales inflaría una supuesta ventaja.
- **Animación:** AnimationMixer, sincronización de entidades y otras operaciones JavaScript permanecen con WebGPU salvo trabajo explícito y justificado adicional.
- **Carga de fragmentos:** triángulos, overdraw, filtrado, sombras y muestreo POM siguen consumiendo GPU en ambas APIs.

Ninguna de estas observaciones constituye un cuello de botella medido. Son lugares que instrumentar, no causas diagnosticadas de los tiempos observados.

## Riesgos de paridad

1. **Color:** AfricanToon aplica fórmulas explícitas de linearización, filmic y conversión de salida. Algunos materiales tienen `toneMapped=false`. Aplicar también la curva estándar del renderer puede cambiar la imagen y el coste.
2. **Sombras:** el mapa actual proporciona profundidad comparada y color packed, utilizado por destrucción. Una comparación que solo conserva sombras solares sobre el suelo no cubre ese contrato.
3. **Culling/LOD:** reproducir poses y estado inicial. La cuantización de cámara conserva decisiones anteriores dentro de la misma celda; una comparación debe partir de estados equivalentes.
4. **Carga asíncrona:** esperar actores, horizonte y chunks antes de capturas estáticas. Medir streaming por separado con el mismo recorrido y cambios.
5. **Profundidad:** clips, crecimiento de cultivos, transparencias y materiales de profundidad especializados tienen que coincidir con la geometría visible.
6. **Recursos:** mantener ownership de texturas prestadas, cancelaciones y disposiciones idempotentes. Contar texturas/geometrías no equivale a medir VRAM.
7. **Fallback:** la existencia de un backend WebGL2 para WebGPURenderer no demuestra que todas las operaciones TSL/compute del prototipo estén disponibles allí. La alternativa funcional debe probarse, no suponerse.

## Alcance estimado si las pruebas justifican migrar

Estimación de planificación, no compromiso ni evidencia de viabilidad: **4–8 semanas-persona**, además del experimento de decisión, con incertidumbre alta. Probablemente habría cambios directos en **25–40 módulos de integración**, además de consumidores y pruebas. El número no implica reescribir todos los 156 archivos de la carpeta de rendering.

| Trabajo | Orden de esfuerzo estimado |
| --- | --- |
| Materiales/TSL, AfricanToon, terreno, agua y vegetación | 8–15 días-persona |
| Sombras, profundidad, destrucción y otras pasadas | 5–10 días-persona |
| Inicialización, precarga, lifecycle y fallback | 4–7 días-persona |
| Seis biomas, campañas, paridad visual y rendimiento | 5–10 días-persona |

El rango agregado se redondea deliberadamente. La incertidumbre principal es conservar conjuntamente AfricanToon, profundidad packed DEST, PCF propio, agua y fallback sin mantener dos renderizadores completos. El trabajo paralelo puede reducir calendario en bloques independientes; la validación integrada sigue siendo necesaria.

## Secuencia práctica propuesta

1. Prototipo independiente con módulos, distribución, viento y cámara de la cobertura existente. Comparar GLSL/WebGL2 actual con WebGPU equivalente; cuando sea viable, añadir el mismo TSL sobre WebGL2 para separar cambio de API de reescritura del shader.
2. Añadir terreno/normal/POM/sombras y día/noche sin perder características. Inspeccionar imágenes antes de interpretar tiempos.
3. Llevar una carga representativa compleja y dinámica, incluyendo las pasadas auxiliares. Instrumentar CPU de preparación, CPU de envío, GPU completa, streaming y variación temporal.
4. Decidir con resultados reproducibles. Si no se demuestra una ventaja representativa, mantener WebGL2; si se demuestra, comenzar la migración por etapas con una versión funcional y pruebas de paridad.

Esta auditoría no decide **MIGRAR** ni **CONSERVAR WEBGL2**: esa decisión corresponde al informe experimental posterior.
