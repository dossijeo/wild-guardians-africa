# Bootstrap nativo de autoridad — QA

La opción de desarrollo `qa-worker-native-bootstrap` usa para el traspaso las claves de chunks residentes que `createSpatialWorld` ya mantiene para sus operaciones nativas, en lugar de obtenerlas de `WorldScene.chunks`. Sin el flag sigue la ruta anterior. La captura incluye el snapshot lógico, estado espacial nativo, claves, revisiones de chunks/topología/terreno, vista y bindings de espera de incursión. Es síncrona y rechaza cambios de revisión durante la captura. El Worker reconstruye su sesión y, antes de `ready`, compara el snapshot espacial y el conjunto de claves; cualquier diferencia detiene el arranque QA. La comparación JSON normaliza `-0` y `0`, como el transporte serializado.

La lista de claves ya existía en el wrapper JS de Wild Engine; no es un segundo mapa de geometrías. Su longitud se comprueba contra el contador WASM y se rechazan duplicados. El contador por sí solo no prueba identidad si se modifica WASM directamente por fuera del wrapper: esta ruta depende de que generación, publicación y liberación usen las operaciones ordinarias del wrapper. Los trabajos programados o cancelados que aún no se publicaron no entran en la captura. La prueba de cancelación cubre una generación programada no ejecutada, no una preparación pthread ya iniciada.

Las pruebas con Wild Engine real incluyen una muralla construida con las reglas del juego y un chunk retenido sin malla visual. La sesión reconstruida coincidió en snapshot espacial, alturas, walkability del trabajador y cinco especies y dos rutas de trabajador; una incursión de un jabalí inició y sus snapshots/decisiones coincidieron durante 20 ticks. También se comprueba que alteraciones de topología, claves o revisión sean rechazadas. Una fixture adicional arrancó un Worker de autoridad real con dos chunks y verificó que un estado espacial alterado impide `ready`. Estos son escenarios concretos, no una prueba de equivalencia global ni de partida prolongada.

La opción se conecta en `installWorkerGame`, que hoy sigue ejecutándose **después** de `WorldScene.load()`. No elimina todavía la construcción ni las precargas de la escena heredada, ni ha sido validada en una partida visual completa. La captura nativa puede incluir chunks retenidos que no figuran en el mapa visual anterior; por ello no se afirma equivalencia con `WorldScene.chunks` ni se activa por defecto. El Worker reconstruye topología desde el estado lógico y la compara con la captura: no importa directamente el snapshot nativo, pues eso requeriría sincronizar identidades internas con los mirrors de obstáculos.

Pruebas dirigidas:

```powershell
.\.cache\tooling\node20.exe --test tests/native-authority-bootstrap.test.js tests/spatial-native-retention-semantics.test.js tests/spatial-chunk-retention.test.js tests/simulation-authority-client.test.js
```

Fixture del Worker, con Vite en una terminal:

```powershell
.\.cache\tooling\node20.exe .\node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5194 --strictPort
```

En otra terminal:

```powershell
$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
.\.cache\tooling\node20.exe .\tools\experiments\audit_authority_native_bootstrap.mjs
```

`QA_BASE_URL` y `PLAYWRIGHT_MODULE` permiten cambiar servidor o instalación. Detener Vite al terminar.

### Guardado de frontera nativa (QA)

Con `qa-worker-game&qa-worker-native-save`, el coordinador real de guardado solicita al Worker una captura de residencia, topología nativa y vista en la misma orden que el estado confirmado. La guarda en `workerNativeAuthorityCheckpoint` junto a las vinculaciones de espera; las partidas normales conservan el formato anterior. `savedNativeAuthorityOptions` valida y transforma ese guardado para crear una autoridad: el Worker reconstruye desde el estado y compara la topología y claves antes de anunciar `ready`, rechazando divergencias. Los metadatos se eliminan del estado lógico activo tras restaurar.

La fixture `tests/browser/authority-native-bootstrap.html`, ejecutada con `tools/experiments/audit_authority_native_bootstrap.mjs`, solicita el guardado al Worker real, recupera una segunda autoridad desde el resultado serializado, compara cuatro avances y eventos y comprueba el rechazo de topología alterada. Ejecutar Vite en 5194 y después `$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'; .\.cache\tooling\node20.exe tools/experiments/audit_authority_native_bootstrap.mjs`. La prueba usa un mundo pequeño, dos chunks, sin WorldScene, física Rapier ni renderizador; no demuestra paridad de una partida completa ni mide rendimiento.

Con `qa-worker-early-native` y un guardado que contenga el checkpoint, Continue prepara el host y su única autoridad antes de `world.load`, sin ejecutar ticks. Al terminar la carga, conecta el receptor de escena y los puertos; los chunks nativos residentes se envían antes del primer snapshot. La inicialización falla si el estado lógico cambia mientras se carga la escena. El flujo completo de partida y el render WebGPU todavía requieren validación de extremo a extremo. Los guardados anteriores carecen de residencia y vista, por lo que no se inventan: siguen la ruta antigua. La combinación con restauración Rapier queda pendiente de prueba real. Este checkpoint es experimental y no debe habilitarse en producción; la verificación nativa del Worker también es exclusiva de desarrollo.


La fixture de host real prepara la autoridad sin ticks, adjunta dos puertos con ACK, recibe los dos chunks originales, comprueba el primer snapshot y prueba el adaptador receptor y cancelación durante prepare. No ejecuta WorldScene ni WebGPU y no prueba pausas, progreso de campaña o Rapier; recuperación gráfica QA no es compatible con este bootstrap.

### Host preparado + WebGPU + Rapier (fixture acotada)

`tests/browser/worker-early-webgpu-rapier.html` crea un guardado desde una captura real de incursión de sabana, cierra esa primera autoridad y prepara un host con otra autoridad desde el guardado, sin ticks antes del handoff. Conecta una presentación Three.js WebGPU real en OffscreenCanvas de 32×32; comprueba el primer estado confirmado, el terreno, otro guardado desde el host y una pose Rapier activa tras impactar una hiena. La segunda ejecución observó 3 chunks residentes tras demanda (2 iniciales), guardado con 3 chunks, pose de 23 huesos y secuencia física 16 alcanzada por presentación 16, sin errores. Esto verifica la recepción de la publicación, no la paridad visual del rig ni una partida completa con WorldScene. El estado inicial es una captura real de incursión y se añade una pausa de fixture antes de la preparación.

Con Vite en 5194: `$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'; .\.cache\tooling\node20.exe tools/experiments/audit_worker_early_webgpu_rapier.mjs`. No se realizó prueba de rendimiento ni del flujo visual completo de Continue.

La misma fixture carga ahora el modelo real de hiena antes de conectar el terreno: se observó oculta antes del chunk y visible después. Durante el impacto, la presentación alcanzó la misma publicación física (29) y se compararon las transformaciones aplicadas de raíz, modelo y 21 huesos de piel contra la pose confirmada: error máximo 0. Los dos extremos de dedos adicionales de Rapier no son huesos deformantes del modelo. El diagnóstico compara transformaciones en ese instante; no es una comparación visual completa de animaciones o calidad gráfica. Las bestias y trabajadores se ocultan mientras falta su chunk, sin inventar altura; una pose física confirmada continúa mostrándose con su posición autoritativa.
