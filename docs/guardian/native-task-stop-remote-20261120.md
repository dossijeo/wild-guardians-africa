# Task25 en el canal de dibujo WebGPU

Surface envía la plantilla Task25 al propietario del dibujo y comprueba que coincida con la atestación antes de adoptar la pose. La parada de cuerpos que admite esta integración tiene un diario de chunks vacío. Surface prepara sus cuerpos y conserva los lotes residentes de terreno, cultivos, cajas y estructuras.

El cliente negocia la versión del paquete y del reloj detenido. El Host exige que la plantilla coincida con la del cuadro retenido y comprueba el reloj relativo y los campos escalares de la pose de cada cuerpo. Confirma la primera presentación con la atestación de la misma familia, vinculada a la espera y a la frontera revalidada. La selección lee ese cuadro.

Three.js r180 actualiza uniformes cuando cambia su valor y diferencia esa actualización de una nueva generación de recursos. El patrón aplicado aquí conserva la preparación de recursos residentes y escribe los valores de parada en el transporte escalar existente. Chromium resuelve el estado de sincronización por la identidad del búfer y su contador. Se conserva la espera del propietario del dibujo y su comprobación causal. [Código de Three.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js#L193-L255) · [Código de Chromium](https://github.com/chromium/chromium/blob/128.0.6613.119/gpu/command_buffer/service/sync_point_manager.cc#L407-L428).

Tres pruebas ejercitan autoridad WASM, cliente y Host reales con un dispositivo y una cola simulados. Verifican la pose final en la selección sin crear más recursos después de retener el cuadro. También comprueban el rechazo sin mutación del cuerpo si falta el reloj relativo o si se omite la plantilla durante la espera.

Quedan el disparo ordinario desde Game, las paradas con motores de puerta y el recorrido en GPU física. La regla de Surface sobre los lotes residentes requiere medición de producto. C4 sigue abierto.

La compilación y las 41 pruebas dirigidas pasaron. La selección de 52 archivos obtuvo 724 de 726 pruebas aprobadas. Los dos fallos aparecen en `webgpu-world-held-frame.test.js` y se reproducen con los mismos nombres y aserciones al cargar el código anterior y el candidato. El manifiesto conserva ambos registros y los hashes de origen. [Evidencia de validación](performance/native-task-stop-remote-20261120/manifest.json).
