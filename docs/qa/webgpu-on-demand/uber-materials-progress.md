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
