# Inventario inicial para WebP y Tinify

Auditoría de lectura sobre los archivos originales/archivados y los derivados de `public`, contrastados con la pertenencia al paquete `dist` existente. No convierte, modifica ni envía imágenes a servicios externos y no utiliza credenciales.

El paquete contiene 225 entradas de imagen: 162 archivos independientes y 63 imágenes embebidas en los GLB. Su contenido codificado suma 219.365.411 bytes (104.103.235 independientes y 115.262.176 embebidos); no equivale a memoria GPU ni a tamaño completo de los contenedores. Hay 213 hashes distintos. Por formato: 189 WebP, 26 JPEG, 9 PNG y un SVG. No se han encontrado data URI de imagen en los documentos públicos actuales ni errores de lectura. El archivo vectorial necesita una decisión específica; no se rasteriza por este inventario.

La auditoría conserva dimensiones, alpha, canales, espacio de color, perfil ICC, orientación, páginas y hashes. Sigue las referencias de materiales GLTF, incluyendo EXT_texture_webp y extensiones de materiales; reconoce normales y mapas de datos aunque compartan imagen con color. También incluye los atlas de props de cada bioma y las texturas de suelo secundarias de los charcos de Manglares.

65 imágenes distribuidas siguen sin clasificación de uso. Se conservan sus orígenes en los labs para revisarlas; no se presupone que sean color por tener extensión WebP. 130 entradas requieren revisión o preservar píxeles, incluidas las desconocidas; no se deben optimizar con pérdida automáticamente. De las imágenes embebidas, 42 tienen usos de normales/datos y 21 solo color.

[Inventario](inventory.json) y [seis pruebas de clasificación](tests.txt): GLTF original/WebP, imagen compartida, extensiones, desconocidas, charcos secundarios y atlas nativos de bioma. Todos los casos pasan. El inventario cubre los contenedores GLB y los raster/vectoriales públicos reconocidos; no demuestra aceptación visual, ahorro ni conversiones correctas.

Reproducir: `node tools/audit_image_assets.mjs`; resultado por defecto en `.cache/image-inventory.json`. La pertenencia a distribución depende del build existente y se debe actualizar después de cambiar el paquete.

Siguiente fase: completar usos, deduplicar solicitudes por hash, convertir/optimizar y comparar dimensiones/alpha/píxeles según uso, actualizar referencias relativas y comprobar HUD, menús, biomas, culturas y modelos. La [referencia oficial de Tinify](https://tinify.com/developers/reference/http) documenta compresión/conversión a WebP por HTTPS; la clave se utilizará fuera del repositorio y los logs. No se ha hecho ninguna subida a Tinify con este inventario.

Actualización: los 42 assets del HUD nativo se clasifican por sus referencias explícitas de ASSETS. El inventario sigue siendo de lectura; las primeras subidas reales se documentan por separado en [los pilotos Tinify](../tinify-color-pilot/README.md).
