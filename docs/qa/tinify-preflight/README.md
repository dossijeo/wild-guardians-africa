# Preflight de imágenes Tinify

Estado: selección de próximos pilotos, sin subidas ni sustituciones nuevas en runtime.

Sobre el inventario de `8c7ceb9` y sus 162 imágenes independientes distribuidas:

- 98 candidatas de color, 24.458.903 bytes codificados, ordenadas por tamaño.
- 53 requieren revisión específica, 55.530.061 bytes: normales/datos, usos desconocidos, SVG o perfiles de color.
- 11 variantes ya integradas se excluyen de nuevas conversiones.

`node tools/plan_tinify_images.mjs` vuelve a inspeccionar los archivos actuales con la misma política que `optimize_image_pilot.mjs`. Comprueba hash, formato, dimensiones, transparencia, animación, orientación, perfil, profundidad y espacio de color antes de crear el cliente de API. Un inventario obsoleto es un error fatal. No solicita credenciales ni ejecuta operaciones de API.

Los perfiles ICC y datos de más de ocho bits requieren una decisión explícita de conversión; no se eliminan ni cuantizan silenciosamente. Los archivos desconocidos o usados por shaders siguen protegidos. La elegibilidad no acredita ahorro ni aceptación visual, y no cubre las 63 texturas embebidas en GLB.

Validación: 42 pruebas dirigidas correctas con `node --test tests/tinify-color-policy.test.js tests/tinify-image-cache.test.js tests/image-pixel-comparison.test.js tests/image-runtime.test.js tests/image-roles.test.js tests/lossless-data-image.test.js`. Incluye JPEG con ICC real, PNG de 16 bits, EXIF de orientación, discrepancias de inventario y las variantes distribuidas actuales.

No cambia shaders, resolución de texturas, coste por fotograma ni el paquete distribuido en esta etapa. Los futuros candidatos todavía deben superar comparación visual y carga nativa antes de incorporarse.
