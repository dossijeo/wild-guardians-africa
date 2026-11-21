# Centro inicial y revisión de chunks nativos

En una partida nueva de sabana, semilla 712 y cultura suajili, el clic de pantalla relativo `(0.2, 0.85)` en la vista QA WebGPU selecciona aproximadamente `(61.04902548888943, 17.16776320490579)`. Antes del cambio, ese centro fallaba con `SpatialChunkUnavailable` al consultar los props del chunk residente `1,0`.

Al instalar el poblado inicial, la sesión espacial nativa puede reconstruir y versionar chunks ya residentes. La inicialización de la autoridad publicaba todos los chunks con revisión cero, de modo que la consulta correcta los consideraba obsoletos y el cargador los consideraba ya residentes. Ahora se usa el callback ordinario del stream espacial, que asigna la revisión vigente y registra los props nativos. No se modifican las reglas de construcción ni se trata la información ausente como terreno libre.

La regresión determinista compara la construcción en la autoridad con todos los chunks iniciales frente a otra que carga bajo demanda y otra restaurada desde el checkpoint anterior a construir. Comprueba la igualdad del estado y eventos, una sola confirmación y la idempotencia del ID. La prueba utiliza Wild Engine real en el mismo proceso; no representa toda una partida ni mide rendimiento:

```powershell
.\.cache\tooling\node20.exe --test tests/fresh-native-authority.test.js tests/spatial-prop-query.test.js tests/simulation-authority-client.test.js
```

La prueba UI acotada usa el flujo real de nueva partida QA, selección WebGPU y Worker autoritativo. En una terminal ejecutar Vite en el puerto 5194 y en otra:

```powershell
$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
.\.cache\tooling\node20.exe tools/experiments/audit_fresh_native_center.mjs
```

La primera observación manual posterior al cambio construyó el centro en la posición indicada, publicó `PlacementCommitted` y descontó 800 monedas. La vista QA sigue siendo parcial; no constituye validación visual completa, ni cubre otros biomas o construcción durante incursiones.
