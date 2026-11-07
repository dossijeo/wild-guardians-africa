# B4 — Carreras de bestias en WebGPU

La presentación confirmada puede reproducir `Running` para `entering` y `retreating` mediante el banco esquelético compartido existente. Hay un bake por especie (búfalo, hiena, león, rinoceronte y facóquero), que usa el mismo `AnimationMixer` y clip que la presentación confirmada anterior. Se carga y admite de forma diferida; una admisión obsoleta se rechaza y el rig anterior sigue disponible. La simulación, navegación, separación, daños, eventos y físicas no se modifican. Los impactos provisionales, ragdolls, recuperación y ataques continúan en su ruta existente y desactivan el bake. Las expresiones siguen en CPU.

El historial autónomo solo acepta fases confirmadas, completas y ordenadas dentro de un estado compatible. Cuando aparece una transición de estado, la admisión histórica se rechaza y vuelve a la ruta normal. El historial estacionario congela la fase recibida. La disponibilidad del banco está subordinada a las capacidades ya existentes de animación baked; no sustituye el fallback WebGL.

Regeneración y comprobación:

```powershell
.\.cache\tooling\node20.exe tools/guardian/build_baked_walk_catalog.mjs --clip=Running
.\.cache\tooling\node20.exe tools/guardian/build_baked_walk_catalog.mjs --clip=Running --check
.\.cache\tooling\node20.exe tools/guardian/build_baked_walk_catalog.mjs --check
.\.cache\tooling\node20.exe --test tests/authority-animal-running.test.js tests/webgpu-animal-roster.test.js tests/webgpu-confirmed-animal.test.js tests/baked-walk-catalog.test.js tests/webgpu-baked-walk.test.js
```

En la captura determinista real `sabana712-d6-native-multi-reservation`, Wild Engine/WASM produce fases de entrada crecientes y transiciones a caminar. Las fases compatibles se aceptan, las que contienen una transición se rechazan, y los snapshots, eventos y la evidencia de separación de una autoridad observada coinciden con una autoridad de control. Las pruebas de catálogo verifican hashes y carga de las cinco especies. Una prueba con el rig real de la hiena instala el bake y comprueba la vuelta a CPU en caminar y ataque; otra descarta una admisión tardía tras cambiar el estado.

Los bakes verifican igualdad exacta al muestrear y al empaquetar. La interpolación a 30 Hz se comprueba sobre una muestra dispersa de vértices; el mayor error observado entre muestras es aproximadamente 0,0524 unidades del mundo en el rinoceronte. Esta cifra no demuestra equivalencia perceptual. Siguen pendientes capturas comparativas y validación de dibujo, sombras, aspecto, continuidad en dispositivo WebGPU real y coste global. La prueba de autoridad no es una prueba de renderizado, combate completo ni rendimiento. No se declara B4 cerrado por esta incorporación.
