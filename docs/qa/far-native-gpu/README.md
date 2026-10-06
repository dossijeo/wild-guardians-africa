# Transición experimental hacia el lote nativo

Fecha: 2026-10-06. Fixture: `tests/browser/far-native-transition.html`, servidor local 5191, viewport 1280 × 720, DPR 1. Una acacia original con AfricanToon diurno, sol fijo, atlas precocinado de ocho vistas por ocho orientaciones, resolución 128 por celda. El modelo cercano se dibuja mediante createAssetLod y NativeAssetGroups. El mesh 3D propio del prototipo no se incorpora a la escena.

## Evidencia guardada

- `before.png` / `before-report.json`: instancia nativa empaquetada, pero preparación GPU retenida; ready=0, cobertura de color nativa=0. Permanece el impostor.
- `ready.png` / `ready-report.json`: initTexture ejecutado para seis texturas y compileAsync completado; ready=1, cobertura nativa=1, ninguna transición pendiente.
- `suppressed.png` / `suppressed-report.json`: ocultación por ID, enabled=false, ready=0, cobertura nativa=0. Desaparecen ambas representaciones.
- `console.json`: consola vacía. Los tres informes contienen webglError=0 y errors vacío.

La preparación registrada fue 2,30 ms **con la escena ya renderizando**. Los frames anteriores pueden haber compilado programas y subido recursos del lote invisible. Este dato no mide carga en frío ni acredita eliminación de tirones en gameplay. Los tres draw calls incluyen el suelo diagnóstico y representaciones descartadas por shader: no equivalen a tres objetos visibles.

## Cambio y validación CPU

NativeFarCoverage compone el fade lejano sobre nativeVisibility de las geometrías privadas de color. Conserva el atributo lógico de obstrucción y aprovecha la propagación existente hacia NativeAssetGroups. Usa el pivote inferior del atlas con escala anisotrópica y rotación mundial para medir distancia. Reutiliza resultados si cámara, revisión de preparación, obstrucción y empaquetado no cambian; limita las subidas a rangos modificados.

`node --test tests/native-tree-coverage.test.js tests/far-tree-readiness.test.js tests/asset-lod.test.js`: 11 pruebas, 11 aprobadas, 0 fallidas (859,53 ms). Incluyen composición con cobertura de obstrucción 0,8, preparación 0,5 → cobertura de color 0,4, propagación al grupo combinado, supresión/restauración, 180 consultas quietas sin escaneos o subidas adicionales y distancia desde pivote desplazado, escalado y rotado.

## Límites

Es una prueba aislada: todavía no está conectada a WorldScene. No verifica render-origin, carga en frío, paisaje completo, guardado, todos los biomas, sombras, móvil, RAM/VRAM ni coste GPU sostenido. Las sombras nativas no se modifican. Las métricas de lotes anteriores del prototipo no se trasladan a esta nueva ruta sin medirla de nuevo. Sigue pendiente la integración y la comprobación visual de la banda de transición al mover la cámara.
