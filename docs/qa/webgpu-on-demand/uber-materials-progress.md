# Materiales compartidos y sustitución bajo demanda: avance experimental

Este trabajo es un primer paso de investigación, no una comparación completa de las tres arquitecturas ni una propuesta de sustituir el renderizador. Se ejecuta únicamente en `webgpu-on-demand.html`, sin modificar Wild Engine ni los materiales de producción. La investigación continúa: faltan el shader universal, familias para terreno, vegetación y efectos, medidas GPU y de memoria, comparaciones visuales con AfricanToon y pruebas en una escena real.

## Material anterior y preparación

Los modos `swap-direct` y `swap` presentan primero un material provisional y después lo reemplazan por el material original del GLB. En `swap`, el original se prepara con `compileAsync` mientras se sigue dibujando el provisional; el laboratorio comprueba que el cambio sucede después de resolverse la promesa. Se han observado fotogramas que continúan durante la espera, pero eso no demuestra ausencia de bloqueos.

La opción experimental `swapPreparation=scope&matchSwapTarget=1` prepara únicamente el actor elegido dentro de su escena, conservando las luces y el formato del framebuffer. Durante la parte síncrona de la solicitud aísla temporalmente los objetos, restaura la escena y el material anterior antes de esperar. Utiliza la API privada `_getFrameBufferTarget()` de Three r180 y recorre la escena: **no es una solución lista para producción**. La traza de una ejecución con LOD no encontró creaciones adicionales de pipeline o texturas en las primeras ventanas tras el cambio; no garantiza que todos los pases posteriores estén preparados. En otras estrategias de preparación sí aparecieron pipelines adicionales. No se han validado todas las sombras, transparencias ni postprocesado del juego.

Se hizo un control sin instrumentar por modo, con diez GLB completos, WebGPU real en GTX 1660 y Edge headless; carga de modelos previa a la secuencia y ejecución caliente en el mismo contexto. La caché del controlador no se puede declarar fría. El modo asíncrono y el inmediato no tienen igual duración, así que sus percentiles no forman una comparación controlada concluyente. RAF del entorno se estabiliza en torno a 33,3 ms incluso en caliente.

| Modo | Contexto | Muestras RAF | Media | p95 | p99 | Máximo | >50 ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Sustitución inmediata | Nuevo | 87 | 155,6 | 800,0 | 933,2 | 933,2 | 28 |
| Sustitución asíncrona | Nuevo | 330 | 55,7 | 100,1 | 666,6 | 866,8 | 21 |
| Sustitución inmediata | Mismo contexto | 315 | 33,3 | 33,4 | 33,4 | 33,5 | 0 |
| Sustitución asíncrona | Mismo contexto | 315 | 33,3 | 33,4 | 33,4 | 33,4 | 0 |

En el caso asíncrono la llamada a `compileAsync` tardó hasta 108,4 ms **antes de devolver la promesa**, y hubo de 5 a 10 fotogramas provisionales durante la espera por actor en el contexto nuevo. Los datos no aíslan compilación de subidas, inicialización, driver o contención, y no incluyen tiempo GPU. Por tanto no se ha demostrado que el intercambio elimine tirones ni que la reducción de la media sea reproducible. Los JSON completos están en `results/uber-swap-direct.json` y `results/uber-swap-async.json`.

## Prototipo de material compartido

`src/labs/shared-character-material.js` usa `MeshStandardNodeMaterial` y actualizaciones TSL por objeto para color, rugosidad, metalicidad y textura. Solo acepta un subconjunto conservador de materiales estándar opacos; los demás conservan su material provisional individual. El agrupamiento distingue cara, colores de vértice y presencia de textura. La eliminación del mapa de normales es propia del **material temporal**, no una propuesta de aspecto final.

En una prueba GPU independiente con dos objetos, cambiar colores y luego intercambiar texturas produjo los píxeles esperados sin crear un pipeline adicional: el contador permaneció en 1 para colores y en 2 para texturas. Es un caso controlado con planos, no prueba de paridad visual de personajes. Ver `results/uber-shared-parameters.json` y `tests/browser/shared-material-parameter.js`.

En la secuencia de diez modelos completos, 116 de 135 mallas utilizaron el material provisional compartido: guardián 3/4, hiena 2/4, león 1/5, rinoceronte 5/5, búfalo 3/3, jabalí 2/4, trabajadores 25/27, 25/27, 25/28 y 25/28. **Es un recuento de mallas, no de píxeles, triángulos ni cobertura visual**; las 100 mallas de trabajadores dominan el agregado. Los materiales físicos y mapas incompatibles siguen una ruta individual. No se ha comparado visualmente el resultado con los originales ni con AfricanToon, y se desconocen los costes de usar los parámetros por objeto a gran escala.

## Qué determina una variante

En la versión local Three 0.180.0, `src/renderers/common/Pipelines.js` compone la clave de pipeline con los identificadores de las etapas de vértice y fragmento y la clave del backend. `src/renderers/webgpu/WebGPUBackend.js` incorpora estados de mezcla, profundidad y stencil, cara y orientación, muestras, formatos del destino, topología, geometría y recorte. Por ello compartir un objeto `Material` no garantiza un único pipeline: distintos pases, layouts geométricos o estados fijos pueden exigir otros. A su vez, distintos objetos/materiales pueden reutilizar etapas y pipelines compatibles. Los nodos y características estructurales como skinning, morph targets, sombras, instancing, transparencia y atributos deben verificarse caso por caso; no basta contar materiales.

Colores, valores escalares y recursos de textura se pueden cambiar dinámicamente cuando el diseño de nodos, bindings, formatos y estado de renderizado siguen siendo compatibles, como demuestra el control anterior. Cambiar la presencia o tipo de recursos, atributos, estados fijos o formato de render puede exigir otras variantes. Atlas o arrays pueden facilitar la selección de texturas, pero aún no se han ensayado aquí.

## Reproducción y siguientes pruebas

Con el servidor Vite del repositorio en `127.0.0.1:5175` y Playwright disponible mediante `NODE_PATH`:

```powershell
$env:WG_SOURCE='full'; $env:WG_BACKEND='webgpu'
$env:WG_SWAP_PREPARATION='scope'; $env:WG_MATCH_SWAP_TARGET='1'
$env:WG_SHARED_FALLBACK='1'; $env:WG_MODE='swap'
node tools/experiments/audit_webgpu_on_demand.mjs
node tools/experiments/check_shared_material_gpu.mjs
node --test tests/shared-character-material.test.js
```

Antes de elegir entre shader universal, familias o solución híbrida hay que implementar controles A/B/C equivalentes con recursos reales, medir cantidad de shaders y pipelines por separado, verificar cambios de parámetros con lectura de imagen, comparar capturas frente a AfricanToon y cuantificar CPU, GPU, memoria y picos con repeticiones equilibradas. También hay que estudiar cómo portar `onBeforeCompile` y GLSL a TSL, sombras, agua, VFX y pérdida de dispositivo. **Por ahora no se justifica retirar la precarga ni migrar el juego a WebGPU.**

## Seguimiento: cobertura visible y recuento de pipelines

Se comparó la salida GPU de los diez modelos completos en una pose estática, con iluminación estándar y un único ángulo. La referencia usa el material provisional individual sin mapa de normales; la alternativa sustituye las mallas admitidas por el material compartido. Las dos imágenes fueron idénticas píxel a píxel en este ensayo de 192 × 192, con WebGPU real. [Captura comparativa](uber-real-characters.png): izquierda individual, derecha compartido. Se muestran los valores del render target lineal directamente, por lo que la captura se ve más oscura que el juego. No evalúa AfricanToon, sombras, animación, otras cámaras, ni paridad con el material final de producción.

Para comprobar que la comparación detecta cambios se repitió oscureciendo deliberadamente las mallas compartidas. El control alteró más de cinco niveles de canal en 2.761 píxeles del rinoceronte y 2.226 del búfalo; solo 72 en el guardián, 8 en la hiena y ninguno en los otros seis modelos desde esta cámara. Esto revela que en varios modelos las mallas elegibles están tapadas o no contribuyen visiblemente en esta pose; **la igualdad de píxeles no demuestra fidelidad en esas partes**, y el recuento de 116/135 mallas no representa cobertura visual. Resultados: `results/uber-real-image.json` y `results/uber-real-image-control.json`. Se exige que cada modelo dibuje al menos 100 píxeles y el control positivo detecte cambios. Para la comparación sin alteración, el test aplica un umbral de error RGB medio de 0,5 y menos de un 1 % de píxeles con diferencias de más de cinco niveles. Estos límites son una comprobación de regresión de esta escena, no una métrica universal de percepción.

Se instrumentaron también llamadas reales de la API WebGPU y se contaron cadenas WGSL distintas por igualdad exacta, sin confundirlas con la cantidad de materiales. Para una secuencia de los diez modelos completos con preparación `scope`, el renderizador parte de un contexto nuevo y se compara el material provisional individual contra el compartido; en ambos casos se termina preparando el mismo material original. La instrumentación altera los tiempos, por lo que esta tabla solo se usa para contar llamadas y código. Cada fila corresponde a una ejecución, no a una serie estadística.

| Material provisional | Códigos WGSL nuevos distintos | `createShaderModule` | `createRenderPipeline` | `createRenderPipelineAsync` |
| --- | ---: | ---: | ---: | ---: |
| Individual | 117 | 117 | 82 | 12 |
| Compartido experimental | 135 | 135 | 82 | 29 |

En la repetición caliente del mismo contexto no se crearon módulos ni pipelines nuevos en ninguno de los dos modos. Las cifras son llamadas de creación, no memoria, tiempo GPU ni número de pipelines residentes; una cadena WGSL es una etapa, no un programa completo. Introducir el material compartido **como capa temporal adicional** incrementó los códigos y llamadas observados en este caso, porque la sustitución sigue necesitando los materiales finales. Por sí solo no demuestra que una familia compartida capaz de conservar el aspecto final fuese peor o mejor: ese experimento sigue pendiente. Datos completos en `results/uber-shader-count-individual.json` y `results/uber-shader-count-shared.json`.

Reproducir la comparación visual con `node tools/experiments/check_shared_material_real.mjs`; usar `WG_PERTURB=1` para su control positivo y `WG_SCREENSHOT` para guardar la captura. Para los recuentos, ejecutar el auditor con `WG_TRACE=1`, `WG_SOURCE=full`, `WG_BACKEND=webgpu`, `WG_MODE=swap`, `WG_SWAP_PREPARATION=scope`, `WG_MATCH_SWAP_TARGET=1` y alternar `WG_SHARED_FALLBACK=0/1`.

## Cobertura visual aproximada de los materiales compartidos

Se ha añadido una prueba de cuatro ángulos para cada uno de los diez GLB completos en su pose estática. La imagen se vuelve a dibujar con una máscara sólida: rojo para mallas elegibles y verde para las demás. Los porcentajes indican la proporción roja de los píxeles de la silueta, no la proporción de mallas. La máscara respeta profundidad y lado de cada material, pero sustituye su shader y no reproduce transparencia, recorte alfa, sombras ni animación; es una estimación para orientar la investigación, no una medida exacta de cobertura en partida. Captura: `uber-character-coverage.png`; datos y recetas observadas: `results/uber-character-coverage.json`.

| Modelo | Mallas elegibles | Cobertura visible en cuatro vistas |
| --- | ---: | --- |
| Guardián | 3/4 | 0–2,1 % |
| Hiena | 2/4 | 0,3–2,1 % |
| León | 1/5 | 0–0,4 % |
| Rinoceronte | 5/5 | 100 % |
| Búfalo | 3/3 | 100 % |
| Jabalí | 2/4 | 0–0,5 % |
| Cuatro trabajadores | 25/27, 25/27, 25/28 y 25/28 | 0 % en estas vistas |

Las superficies visibles excluidas de varias bestias y de los trabajadores son principalmente `MeshPhysicalMaterial`; el guardián también incluye un material estándar con mapas de rugosidad y metalicidad. Los materiales físicos observados tienen clearcoat, transmisión, sheen, iridiscencia y anisotropía a cero, pero usan distintas intensidades especulares y algunos mapas de normales, rugosidad o metalicidad. No pueden reducirse a la familia estándar actual sin comprobar la equivalencia: la intensidad especular afecta el resultado y sigue pendiente la paridad con el renderizador AfricanToon real. Estos datos indican que el siguiente prototipo útil debe cubrir las superficies físicas visibles y sus mapas, o bien demostrar por qué pueden transformarse sin pérdida visual; optimizar las 100 mallas de trabajadores que quedan ocultas no resolvería la compilación de su superficie principal.

Ejecutar `node tools/experiments/check_shared_material_coverage.mjs`, con `WG_SCREENSHOT` y `WG_OUTPUT` opcionales. La prueba rechaza WebGL y comprueba que las cuatro vistas de cada modelo tengan una silueta no vacía. No mide rendimiento ni demuestra ahorro.

## Prototipo de familia física compartida

`src/labs/shared-physical-material.js` implementa una familia experimental de `MeshPhysicalNodeMaterial`, con parámetros por objeto para color, rugosidad, metalicidad, intensidad y color especular, IOR y escala de normales. Las texturas base, normales, rugosidad y metalicidad se seleccionan por objeto. El banco distingue lado, colores de vértice y presencia de cada mapa. Se rechazan deliberadamente, entre otros, materiales transparentes, variantes de stencil o profundidad no estándar, clipping, UV y transformaciones de textura incompatibles y características físicas complejas. Esto no modifica los materiales del juego.

En Three r180, `MeshPhysicalNodeMaterial.setupSpecular()` usa los accesores de material y no consulta sus propiedades `specularIntensityNode` y `specularColorNode`. El primer prototipo, que asumía lo contrario, generó diferencias medibles en todos los trabajadores y varias bestias (`results/uber-physical-before-specular-fix.json`). La clase experimental sobrescribe esa función con la misma fórmula de Three, sustituyendo esos dos valores por nodos por objeto. Es una adaptación específica de r180 y debe revisarse al actualizar Three.

Con esa corrección se compararon imágenes WebGPU a 192 × 192 de los diez GLB completos en una pose y un ángulo, sustituyendo solo las mallas físicas compatibles y conservando los mapas de normales de la referencia. Hiena 2/4, león 4/5, jabalí 2/4 y los cuatro trabajadores 2/27, 2/27, 3/28 y 3/28 usaron la familia física. Guardián, búfalo y rinoceronte no tienen mallas físicas compatibles en esta prueba y sirven de control sin sustitución. Todos los píxeles coincidieron en la prueba registrada; un control que oscurece deliberadamente la familia afectó entre 2.798 y 4.974 píxeles de cada uno de los siete modelos con mallas físicas. Datos: `results/uber-physical-real.json`, `results/uber-physical-control.json`; comparación: `uber-physical-comparison.png`.

Una prueba separada de dos objetos confirma que intercambiar colores y texturas produce los píxeles esperados sin crear otro pipeline en ese caso: 1→1 para colores y 2→2 para texturas (`results/uber-physical-parameters.json`). Se ejecutaron además dos tests unitarios de parámetros y rechazo de características incompatibles. Reproducir con `node tools/experiments/check_shared_physical_real.mjs`, `node tools/experiments/check_shared_physical_gpu.mjs` y `node --test tests/shared-physical-material.test.js`; el control visual usa `WG_PERTURB=1`.

Estas pruebas son una demostración inicial para materiales físicos estándar, no una validación de AfricanToon, sombras, día/noche, movimientos, impactos, coste GPU, memoria ni escenarios reales. La prueba no demuestra todavía reducción global de pipelines ni elimina los tirones. Falta integrar esta familia únicamente en la escena comparativa, repetir A/B con varios personajes y medir si sustituir los materiales finales —en vez de añadir otro material provisional— reduce de verdad las compilaciones y mejora los tiempos sin degradar la apariencia.

## Familia física como material final: aparición progresiva

El laboratorio admite `physicalFinal=1` para sustituir directamente las mallas físicas compatibles por la familia compartida, conservando los demás materiales. El banco vive durante toda la secuencia; se liberan las referencias por actor al retirarlo. No se añade un material provisional ni se llama a `compileAsync`: se compara la aparición inmediata de diez GLB completos, uno por uno, con animación, luces y sombras de la escena del laboratorio. Se sustituyen 18 mallas de las 135. Esto no reproduce AfricanToon ni es una incursión del juego.

Se ejecutó una serie A/B/B/A sin instrumentación (A materiales originales, B familia física) en Edge headless, WebGPU real, GTX 1660, con recursos GLB cargados antes de la secuencia y sin precalentamiento de personajes. Cada ejecución crea un navegador y contexto nuevos y luego repite en el mismo contexto. El caché del controlador no se ha vaciado ni se declara frío. Dos repeticiones por opción son insuficientes para una conclusión estadística, y las pausas dejan solo 14–16 intervalos RAF medidos en contexto nuevo, por lo que p95 y p99 son especialmente débiles. En el mismo contexto el entorno headless se estabiliza alrededor de 33,3 ms.

| Orden | Familia | RAF muestras | Media ms | p95/p99 ms | Máximo ms | >50 ms |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| A | Original | 16 | 481,2 | 2166,6 | 2166,6 | 9 |
| B | Compartida | 14 | 550,0 | 1699,9 | 1699,9 | 9 |
| B | Compartida | 14 | 545,2 | 1700,0 | 1700,0 | 9 |
| A | Original | 14 | 533,3 | 1733,4 | 1733,4 | 9 |

Las cuatro repeticiones calientes tuvieron media, p95 y p99 de aproximadamente 33,3–33,4 ms y ningún intervalo >50 ms. Los grandes máximos se mantienen en ambos tratamientos: **no se demuestra una mejora de fluidez**. Los intervalos incluyen carga de texturas y buffers, compilación y contención; no hay medición de tiempo de ejecución GPU ni atribución causal. Datos en `results/uber-physical-final-abba-{0,1,2,3}.json`.

Se hicieron otras dos ejecuciones instrumentadas solo para contar llamadas y cadenas WGSL distintas; la instrumentación afecta a los tiempos. En contexto nuevo, tanto el original como la familia crearon 100 módulos con 100 cadenas WGSL distintas y 82 pipelines síncronos, y ninguna llamada asíncrona. Las repeticiones calientes no crearon módulos ni pipelines. El resultado indica que la familia compartida **no reduce la cantidad observada de shaders ni pipelines en esta secuencia**; Three ya puede reutilizar programas entre materiales distintos. No establece qué ocurriría con otras geometrías, instancias o familias completas, ni demuestra equivalencia visual de las sombras. Datos: `results/uber-physical-final-trace-{0,1}.json`.

Reproducir con `WG_SOURCE=full`, `WG_BACKEND=webgpu`, `WG_MODE=direct` y alternar `WG_PHYSICAL_FINAL=0/1` en `tools/experiments/audit_webgpu_on_demand.mjs`; añadir `WG_TRACE=1` solo para diagnosticar. No se integra el prototipo en producción. Antes de plantear una migración hacen falta comparar familias con AfricanToon y recursos del mundo, identificar qué diferencias estructurales originan realmente los pipelines y analizar subidas de recursos y ejecución GPU.

## Identificadores de buffers, geometría y caché de pipelines

La traza profunda registra los descriptores WebGPU y conserva el código WGSL completo, además del recuento de llamadas. En una ejecución con los diez GLB originales y aparición inmediata se observaron 82 creaciones de pipeline, 81 códigos de vértice distintos y 20 de fragmento, 13 layouts de buffers de vértice y cuatro combinaciones de formatos de destino/profundidad. De los 81 códigos de vértice, uno fue creado antes de la ventana registrada y no se capturó; de los otros 80, 78 usaban `NodeBuffer_<n>`, 78 `skinIndex` y 74 una textura de array. Algunos códigos difieren en características reales, por ejemplo tamaño de los arrays de huesos o morph targets, atributos y dimensiones de textura. En otros, la única diferencia textual es el identificador generado para buffers. Renombrando consistentemente solo esos identificadores, los 80 códigos capturados se agrupan en 66 cadenas distintas. La igualdad textual tras renombrar no prueba compatibilidad de bindings ni de pipelines.

Para comprobar el efecto se añadió `canonicalVertex=1`, exclusivamente al laboratorio: usa el hook privado `_pipelines.getForRender` de Three r180 para normalizar esos nombres antes de que Three busque sus shaders. No modifica índices de binding ni tamaños de buffers. La opción está desactivada por defecto, depende de detalles privados y no es segura para producción sin revisar compatibilidad, coste, versiones y todos los shaders posibles. La comparación de imágenes WebGPU estáticas de los diez modelos produjo hashes SHA-256 idénticos con y sin el hook, y se superaron dos tests unitarios de la normalización. No cubre animación, sombras, AfricanToon ni escenas completas.

En trazas separadas, la normalización redujo las llamadas `createShaderModule` y cadenas WGSL nuevas de 100 a 86, pero las creaciones de pipeline permanecieron en 82. Los pares de shaders pasaron de 81 a 67; los descriptores capturados sin identidad de pipeline layout, de 82 a 68. Cada layout explícito se identifica aquí por identidad del objeto, no por su compatibilidad estructural. Three incluye en `getGeometryCacheKey()` los identificadores de los atributos de morph targets, además de la estructura geométrica; esos datos participan en la clave del pipeline. Este mecanismo es un candidato a investigar, no una demostración de que las 14 parejas de descriptores puedan compartir layouts o pipelines sin riesgo.

Se ejecutó también A/B/B/A sin instrumentación, con diez personajes completos en la misma escena y condiciones descritas anteriormente. Cada contexto nuevo dejó solo 14–25 intervalos RAF, por lo que los percentiles no son sólidos:

| Orden | Normalización | RAF | Media ms | p95 ms | p99/máximo ms | >50 ms |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| A | No | 16 | 481,2 | 2166,7 | 2166,7 | 9 |
| B | Sí | 25 | 324,0 | 1100,0 | 1666,7 | 10 |
| B | Sí | 25 | 325,3 | 1133,3 | 1600,1 | 10 |
| A | No | 14 | 531,0 | 1733,4 | 1733,4 | 9 |

La diferencia observada no demuestra una mejora reproducible: la muestra es pequeña, los tiempos incluyen subida, compilación y contención, y el controlador puede conservar caché. En las repeticiones calientes los intervalos rondaron 33,3 ms y ningún intervalo superó 50 ms. La mediana CPU de `render` en los 51 fotogramas con diez actores calientes fue 6,78/6,97 ms en A y 7,16/7,04 ms en B; son solo dos muestras de ejecución y el hook añade trabajo en cada llamada. No hay medida GPU. **No se integra esta normalización en el juego.**

Reproducir con `WG_SOURCE=full`, `WG_BACKEND=webgpu`, `WG_MODE=direct`, alternando `WG_CANONICAL_VERTEX=0/1`; para la traza añadir `WG_TRACE=1` y `WG_DEEP_TRACE=1`. `tools/experiments/summarize_webgpu_pipeline_trace.mjs` resume la traza, y `tools/experiments/compare_canonical_images.mjs` compara las huellas visuales. Los datos completos están en `results/uber-pipeline-structure-{original,canonical}.json`, sus resúmenes `uber-pipeline-summary-*.json`, `uber-canonical-abba-*.json` y `uber-canonical-image-*.json`.

## Reutilización experimental de pipelines con morph targets

La traza profunda ahora captura también los descriptores de `createBindGroupLayout` y `createPipelineLayout`, en vez de comparar solo la identidad de los objetos. Con la normalización de nombres activa, las 82 creaciones correspondían a 68 descriptores completos distintos al incluir las definiciones capturadas de layout y excluir solo su identidad. Se observaron diez definiciones de pipeline layout. La [especificación de WebGPU](https://www.w3.org/TR/webgpu/#bind-group-layout-compatibility) define la equivalencia de layouts por sus entradas y restricciones de exclusividad; comparar descriptores es una señal útil, pero no valida por sí sola los recursos ni todos los usos posteriores.

Se probó una clave alternativa **solo para el pipeline** en `src/labs/morph-pipeline-key.js`: mantiene atributos de geometría, nombres y número de morph targets, pero omite los identificadores individuales de sus buffers al formar la clave de pipeline. No modifica la clave que Three usa para crear y asociar los `NodeBuilder` y sus texturas de morph, ni comparte datos de animación. Requiere la normalización de WGSL anterior y utiliza métodos privados de Three r180. Este experimento no comprueba formalmente la equivalencia de todos los layouts posibles y no es apto para producción.

En dos ejecuciones instrumentadas separadas, con diez GLB completos y la misma normalización de WGSL, el control creó 82 pipelines y la clave experimental 69; ambos generaron 86 módulos de shader. Se mantuvieron 68 descriptores completos distintos; la captura de objetos y descriptores no garantiza que el driver haya reutilizado internamente los mismos recursos. Las trazas registran cero errores de WebGPU en el escenario probado. Datos: `results/uber-layout-descriptors.json`, `results/uber-morph-pipeline-trace.json` y los resúmenes correspondientes.

Se compararon dos renderizados deterministas con los diez modelos simultáneos, luz y sombras, sus primeros clips a 0, 0,25, 0,8 y 1,3 s y pesos distintos en 37 mallas con 130 valores de morph. Las cuatro imágenes fueron idénticas píxel a píxel según SHA-256, sin errores detectados en un error scope de validación y tras esperar la cola GPU. Un control que pone todos los pesos de morph a cero cambia las cuatro imágenes. La prueba utiliza un encuadre general con algunas superposiciones y no cubre todas las animaciones, caras, cámaras o materiales AfricanToon. Captura: `uber-morph-animated.png`; datos: `results/uber-morph-visual-{0,1}.json` y `uber-morph-visual-zero.json`.

Serie A/B/B/A sin instrumentación, donde A ya incluye normalización WGSL y B añade la clave de morph. Hardware y entorno iguales al experimento anterior; una ejecución por fila, 22–37 intervalos en contexto nuevo y dos repeticiones por opción:

| Orden | Clave morph | RAF | Media ms | p95 ms | p99/máximo ms | >50 ms |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| A | No | 37 | 227,9 | 899,9 | 1100,1 | 11 |
| B | Sí | 22 | 374,2 | 1200,0 | 1666,7 | 10 |
| B | Sí | 24 | 344,4 | 1133,3 | 1633,3 | 10 |
| A | No | 25 | 326,7 | 1100,0 | 1766,8 | 10 |

En caliente los intervalos fueron ~33,3 ms y ninguno superó 50 ms. Las medianas CPU de `render` con diez actores calientes fueron 7,16/7,08 ms en A y 7,61/7,55 ms en B. La muestra es pequeña, la instrumentación de imágenes y la de pipelines se efectuó separadamente, y no hay medición GPU. **La reducción de 13 creaciones no demuestra mejora de fluidez y los tirones persisten.** No se integra esta clave en producción. Datos: `results/uber-morph-abba-{0,1,2,3}.json`.

Para reproducir el rendimiento, ejecutar `tools/experiments/audit_webgpu_on_demand.mjs` con `WG_SOURCE=full`, `WG_BACKEND=webgpu`, `WG_MODE=direct`, `WG_CANONICAL_VERTEX=1` y alternar `WG_MORPH_PIPELINE=0/1`; usar `WG_TRACE=1` y `WG_DEEP_TRACE=1` solo para los descriptores. La comparación visual utiliza `tools/experiments/check_morph_pipeline_visual.mjs` con `WG_MORPH_PIPELINE=0/1`, después `tools/experiments/compare_morph_pipeline_visual.mjs` sobre ambos JSON; `WG_ZERO_MORPH=1` activa el control de pesos cero. Ejecutar también `node --test tests/morph-pipeline-key.test.js`.

## Trazas del navegador: hilo principal y proceso gráfico

Tras reducir las creaciones de pipeline se ha obtenido una traza Chromium independiente para cada modo de aparición de los diez modelos completos, con `target=live`: una inmediata y otra que usa `compileAsync`. Ambas son WebGPU real, GTX 1660 y Edge headless; se trazó después de cargar los GLB, con contexto nuevo y sin afirmar que la caché del controlador esté vacía. La instrumentación modifica el comportamiento. Son dos trazas diagnósticas, no un A/B de rendimiento estadísticamente válido. La secuencia asíncrona dura más y produce más tareas y fotogramas, por lo que no deben compararse sus recuentos como tasas directamente.

| Magnitud observada | Inmediata | Asíncrona |
| --- | ---: | ---: |
| Intervalos RAF registrados | 14 | 204 |
| RAF p95/p99 y máximo | 1733/1733 ms | 233/400 ms; máximo 567 ms |
| Mayor tarea del hilo principal del renderizador, tiempo transcurrido | 378 ms | 198 ms |
| Mayor tiempo de CPU de una tarea del hilo principal | 346 ms | 197 ms |
| Mayor tarea del hilo principal del proceso gráfico, tiempo transcurrido | 387 ms | 604 ms |
| Mayor tiempo de CPU de una tarea del proceso gráfico | 339 ms | 579 ms |
| Tareas del proceso gráfico >50 ms con evento WebGPU anidado | 31 de 33 | 15 de 19 |

Las columnas de tiempo transcurrido y CPU no tienen por qué corresponder a la misma tarea. Por ejemplo, la mayor tarea principal inmediata duró 378 ms y acumuló 171 ms de CPU de ese hilo: el resto no puede atribuirse únicamente a compilación o espera del controlador con esta información. Las tareas largas del proceso gráfico contienen con frecuencia eventos etiquetados `WebGPU`, pero esto **no mide el tiempo de ejecución de la GPU ni demuestra qué parte corresponde a compilación, subida o sincronización**; el proceso también puede recibir trabajo de otros contextos. Los tiempos de los distintos hilos se solapan y no deben sumarse. La traza anterior de API registró una copia `copyExternalImageToTexture` de hasta 121 ms en CPU, en una ejecución distinta.

La compilación bajo demanda sigue teniendo trabajo síncrono en el hilo principal y trabajo prolongado en el proceso gráfico incluso cuando su API devuelve una promesa. La evidencia no permite concluir que WebGPU por sí solo elimine los tirones, ni que eliminar pipelines duplicados vaya a resolver los costes restantes. Es necesario medir separadamente subidas y ejecución GPU, y comprobar la experiencia en una escena real antes de decidir una migración.

Trazas completas comprimidas: `results/uber-frame-trace-{direct,async}.json.gz`; se ha redactado únicamente la línea de comandos de metadatos que contenía la ruta local del perfil temporal. Los eventos se conservaron. Informes y resúmenes: `results/uber-frame-{report,summary}-{direct,async}.json`. `tools/experiments/trace_webgpu_frame_stalls.mjs` captura la traza con `WG_MODE=direct|async`, `WG_TRACE_PATH` y `WG_OUTPUT`; `tools/experiments/summarize_webgpu_frame_trace.mjs TRACE REPORT [OUTPUT]` acepta JSON o gzip. La correlación por aparición usa marcas temporales aproximadas y expresa solapamiento, no causalidad.

## Familia parametrizada para hierba de dos biomas

Se reutilizó la prueba anterior de `origin/codex/webgpu-renderer-evaluation` (`ad31e10dc`) y sus snapshots exportados desde `719510cec`: selección real de hierba de Sabana y Gran Río, 10.741 y 8.821 instancias respectivamente, 212.704 y 258.808 triángulos, dos draw calls por escena. Los snapshots originales de 4,8 y 3,5 MB se guardan comprimidos en `public/qa/uber-grass/`; se conservan texturas, geometrías, cámara, viento y fórmulas de la prueba anterior. El material TSL de referencia es `src/labs/uber-grass/grass-original.js`; `grass-shared.js` usa la misma fórmula con textura, tinte, semilla y otros parámetros por objeto. Una sola instancia de material sirve a los cuatro objetos de ambos biomas. Es una prueba de hierba aislada, no incorpora terreno, selección dinámica, oclusión solar ni el resto de AfricanToon.

En Edge headless con WebGPU real y GTX 1660 se renderizaron ambos biomas en cuatro estados: día y noche, con tres tiempos de viento. Las ocho imágenes de 640×360 coincidieron exactamente entre la ruta original y la compartida (SHA-256). Un control que intercambia las dos texturas cambió las ocho imágenes y también coincidió entre ambas rutas. Los draw calls y triángulos coinciden por escena, y el error scope de WebGPU no registró errores. Captura de revisión: `uber-grass-snapshots.webp`; las imágenes se muestran con los valores lineales leídos del render target y no representan toda la composición final del juego.

El contador de API incluye toda la escena y sus pasadas auxiliares: tras dibujar Sabana observó 2 pipelines en ambas rutas; al incorporar Gran Río subió a 3 en la original y permaneció en 2 con el material compartido. Los módulos observados pasaron de 5 a 6 en la original y permanecieron en 5 en la compartida. Las transiciones de día, noche y viento no crearon más pipelines. Esto demuestra reutilización en este caso, **no** un límite global de pipelines del mundo. Datos: `results/uber-grass-{original,shared}.json` y `uber-grass-swapped-{0,1}.json`.

Se midió aparte una serie A/B/B/A en contexto nuevo, con los recursos y pipelines de ambas escenas ya preparados: 30 fotogramas de calentamiento y 180 intervalos RAF sin lecturas GPU, alternando los biomas y variando tiempo/día/noche. La CPU incluye actualización de parámetros, preparación y envío. Otras 40 muestras GPU por ejecución se obtuvieron serializando la resolución de timestamps de las pasadas, con 15 muestras de calentamiento; no son latencia completa de fotograma ni deben sumarse a la CPU. Cada muestra comprobó que las consultas iniciadas coinciden con las resueltas. El temporizador mostró cuantización visible y este entorno headless se estabiliza a ~33,3 ms, por lo que no permite comparar FPS superiores a 30.

| Orden | Material | CPU media / p95 / p99 ms | GPU media / p95 ms | RAF media / p95 ms | RAF máximo ms |
| ---: | --- | ---: | ---: | ---: | ---: |
| A | Original | 0,356 / 0,460 / 0,540 | 0,206 / 0,262 | 33,334 / 33,385 | 33,410 |
| B | Compartido | 0,359 / 0,460 / 0,605 | 0,208 / 0,262 | 33,334 / 33,400 | 33,455 |
| B | Compartido | 0,365 / 0,460 / 0,570 | 0,202 / 0,262 | 33,334 / 33,370 | 33,445 |
| A | Original | 0,366 / 0,470 / 0,545 | 0,206 / 0,262 | 33,334 / 33,395 | 33,535 |

No hubo intervalos >50 ms y no se demuestra diferencia de rendimiento en régimen estable. Dos repeticiones por opción son insuficientes para afirmar equivalencia estadística. La prueba no mide carga bajo demanda, tiempo de compilación, memoria GPU, terreno o una partida; por tanto **no demuestra que se hayan eliminado tirones de producción**. Las cuatro ejecuciones completas están en `results/uber-grass-abba-{0,1,2,3}.json`.

Reproducir con el servidor Vite activo y `WG_GRASS_SHARED=0/1 node tools/experiments/check_uber_grass_real.mjs`, repetir con `WG_GRASS_SWAP=1` y comparar los cuatro JSON mediante `tools/experiments/compare_uber_grass.mjs`. Para la prueba calentada usar `tools/experiments/bench_uber_grass_real.mjs` con `WG_GRASS_SHARED=0/1` y `WG_OUTPUT` por ejecución. Se necesita Playwright mediante `NODE_PATH`. No se ha sustituido ningún material de la partida.
