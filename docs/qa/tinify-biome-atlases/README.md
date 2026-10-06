# Seis atlas de props optimizados con Tinify

Se sustituyen por alias las seis imágenes baseColor de los packs originales de bioma. La conversión usa la API HTTP de Tinify y su caché privada; las credenciales y ubicaciones del proveedor no aparecen en los informes. Los originales se conservan fuera del paquete distribuido. No se cambian geometría, UV, escala, paleta/shader, normales ni mapas de datos.

| Bioma | Original, bytes | Tinify, bytes | Ahorro |
| --- | ---: | ---: | ---: |
| Gran Río | 1082466 | 248596 | 833870 |
| Desierto | 1432578 | 478174 | 954404 |
| Sabana | 1541620 | 534614 | 1007006 |
| Manglares | 1581944 | 473812 | 1108132 |
| Gran Cañón | 1555890 | 430444 | 1125446 |
| Volcanes | 1545158 | 510388 | 1034770 |
| Total | 8739656 | 2676028 | 6063628 |

Los seis conservan 2048 × 2048, orientación y alpha exacto. Es compresión de color con pérdida; RGB no es idéntico. Los report.json mantienen acceptedForRuntime:false porque describen el piloto previo; esta revisión registra la aceptación posterior mediante las pruebas siguientes.

## Verificación

- 42 pruebas dirigidas de variantes/alias, política Tinify, caché/píxeles y paquete: correctas.
- Doce comparaciones WebGL nativas, día/noche en los seis biomas: props originales de slots 0/4/10 con el material nativeAssetMaterial y AfricanToon, mismos meshes/UV, mapas normales/datos y cámara. Hash/dimensiones de ambos atlas verificados. Sin errores WebGL/globales; doce capturas conservadas. Se aprecia la misma silueta/encuadre y un acabado próximo a esta distancia. El fixture normaliza la altura de cada prop para compararlo, no modifica su escala de gameplay.
- Las 22 variantes de imágenes cargan por alias en el navegador. Otras 22 cargan desde /nested/itch/audio-qa/, con todas sus URL bajo ese prefijo y sin fallback de raíz. Informes native-runtime.json y native-nested.json.
- Build y paquete web correctos: 587 archivos, 382.099.282 bytes, 859 enlaces relativos y veinte GLB. Frente al paquete anterior (388.155.440), ahorro neto de 6.056.158 bytes tras el manifiesto/bundle. No se duplican los seis originales en la distribución.
- Preflight fresco: 87 imágenes de color elegibles (13.861.072 bytes), 53 pendientes de revisión y 22 variantes integradas. Los mapas de datos y texturas embebidas siguen su política propia.

## Reproducción y límites

Piloto: node tools/optimize_image_pilot.mjs <ruta-inventariada> con TINIFY_API_KEY privada. Comparación: tests/browser/biome-atlas-images.html; carga de alias: tests/browser/image-runtime.html. Pruebas: image-runtime, tinify-image-cache, tinify-color-policy, image-pixel-comparison y web-package. npm run build; npm run test:web-package; tools/serve_web_package.mjs para prefijo anidado.

El ahorro corresponde a bytes codificados/paquete. La resolución GPU no se reduce; no se afirma mejora medida de RAM, FPS ni frametime. La revisión visual cubre tres props por bioma en dos fases de luz, no todos los props/LOD/calidades, móvil físico, Tauri ni una nueva campaña completa. Los logs originales se conservan en gzip con mtime cero y hashes. La CI del nuevo push debe confirmar el conjunto.
