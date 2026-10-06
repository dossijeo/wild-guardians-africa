# Arte del tutorial y logo optimizados con Tinify

Se integran ocho variantes WebP de Tinify: las seis manos originales, el sprite del Espíritu y el logo del menú. Se conservan dimensiones, encuadre, pivots y alpha exacto. Los consumidores mantienen sus identificadores; los alias existentes seleccionan la variante. Los originales se conservan en public/archivo, excluidos del paquete de distribución. Compresión según la [referencia oficial HTTP](https://tinify.com/developers/reference/http#converting-images); credencial y ubicaciones privadas del proveedor fuera de Git e informes.

| Imagen | Original bytes | Tinify bytes | Ahorro bytes |
|---|---:|---:|---:|
| press | 27,988 | 13,704 | 14,284 |
| tap | 32,046 | 16,498 | 15,548 |
| pinch | 34,580 | 16,730 | 17,850 |
| point | 26,456 | 12,888 | 13,568 |
| drag | 34,148 | 17,698 | 16,450 |
| open | 37,850 | 19,182 | 18,668 |
| guardian | 271,138 | 118,972 | 152,166 |
| logo | 672,802 | 99,400 | 573,402 |
| Total | 1,137,008 | 315,072 | 821,936 |

Comparación nativa de los ocho originales y candidatos: cero diferencias de alpha, dimensiones originales y consola sin avisos/errores. comparison.png muestra manos a 180 px de altura, avatar en ese encuadre y logo a 480 × 160; se conservan siluetas, encuadre y legibilidad, sin deformaciones visibles en esta vista. El RGB cambia por la compresión con pérdida, no se afirma igualdad de color. Los report.json individuales mantienen acceptedForRuntime:false del piloto previo; este README registra la aceptación posterior para estos usos.

Validación: 64 pruebas dirigidas correctas; build de 211 módulos correcto, con advertencia habitual de tamaño de bundle. Las treinta variantes se cargan por hash y dimensiones en navegador nativo y desde /nested/itch/audio-qa/, en servidor sin fallback de raíz. Ambos informes y consolas están archivados. El paquete valida 587 archivos, 859 enlaces relativos y veinte GLB runtime; no duplica los ocho originales.

Peso neto del paquete: 382.145.139 → 381.332.978 bytes, ahorro de 812.161 bytes tras coste de manifiesto/bundle. Las ocho imágenes ahorran 821.936 bytes por sí solas. No mide RAM, GPU ni FPS.

Inventario actualizado: 225 imágenes distribuidas, cero desconocidas/errores; 87 candidatas de color para Tinify, 45 de revisión y 30 variantes integradas. Los mapas embebidos, perfiles, datos y aceptación física móvil/Tauri siguen pendientes. Este lote no acredita una ronda completa de todas las imágenes, ni un recorrido completo del tutorial 3D/HUD en todos los dispositivos.

Reproducción: la comparación en tests/browser/tutorial-menu-images.html; alias en tests/browser/image-runtime.html; `node --test tests/image-runtime.test.js tests/image-roles.test.js tests/tinify-color-policy.test.js tests/tinify-image-cache.test.js tests/image-pixel-comparison.test.js tests/web-package.test.js`; `npm run build`; `npm run test:web-package`; servidor de rutas anidadas tools/serve_web_package.mjs. Los informes comprimidos y proof.json fijan fuentes y alcance.
