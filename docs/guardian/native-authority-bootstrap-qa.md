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
