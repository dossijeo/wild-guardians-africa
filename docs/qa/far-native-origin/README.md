# Origen de render del impostor experimental

2026-10-06, fixture aislada, servidor 5191, viewport 1280 × 720, DPR 1. Se añadió Recentrar origen para alternar (0,0) y (192,144), manteniendo fija la cámara global. La fixture utiliza withRenderOrigin y NativeAssetGroups con ese mismo origen; el uniforme mundial de AfricanToon también se actualiza.

El shader del billboard utilizaba cameraPosition local contra aTreeBase global cuando el render se recentraba. Ahora uFarOrigin convierte la cámara a coordenadas globales para distancia/orientación y convierte el vértice global a local antes de aplicar viewMatrix. La iluminación aproximada recibe vFarWorld local. El modelo propio del prototipo también calcula su fade con la cámara global reconstruida. Los datos de árboles y las decisiones CPU permanecen globales. update(camera, origin) recibe el origen antes de entrar en la ventana síncrona de render; llamadas anteriores sin segundo argumento conservan origen cero.

## Evidencia

- far-before/after: cámara global (0,10,100), ready=1, cobertura nativa=0; origen cero frente a (192,144). Capturas RGB de 880 × 720 de la región de escena (recorte x=400 para excluir controles): **0 píxeles diferentes**.
- middle-before/after: cámara (0,10,50), ready=1, cobertura nativa=0,5; mismos orígenes. **421 píxeles diferentes de 633600**, diferencia máxima de canal 19/255 y media por canal menor que 0,0015/255. Las diferencias están dentro de la región del árbol. No afirmar identidad exacta para la representación mixta.
- pixel-comparison.json: comparación mediante Pillow ImageChops, RGB sin reescalado. Informes y capturas originales se conservan.
- Ambos estados continúan con tres programas/tres llamadas, webglError=0 y errors vacío. console.json vacío.

`node --test tests/far-tree-readiness.test.js tests/far-impostor-math.test.js tests/render-origin.test.js`: 12 aprobadas, 0 fallidas, 534,09 ms. Se añadió comprobación de que cambiar/restaurar el origen actualiza solo el uniforme del prototipo: no cambia estados por ID, bases globales, matrices ni contadores de escaneos/subidas.

## Límites

No es todavía integración de WorldScene. Falta conectar generación regional, cobertura/GPU por batch, navegación/supresión y guardado, preparar nuevos niveles, coordinar la preparación con el origen y medir coste integrado. Durante esta prueba se seleccionó distancia 100 mientras la preparación asíncrona seguía en curso: se comprueba correspondencia visual de origen, no ausencia de primera carga de ese nivel ni un protocolo seguro de cambios de cámara durante preparación. Esta condición necesita invalidación por generación de batch antes de adoptar la bandera GPU global en gameplay.

La prueba usa un árbol y desplazamiento moderado del origen; no acredita precisión subunitaria de los buffers globales del impostor a coordenadas extremas. La diferencia de silueta/trama del fade y las pruebas continuas de movimiento, múltiples regiones/biomas, sombras y móvil continúan pendientes. Las medidas GPU de versiones anteriores no se trasladan a esta modificación sin volver a medir.
