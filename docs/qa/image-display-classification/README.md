# Clasificación de imágenes mostradas

El inventario anterior dejaba quince imágenes distribuidas sin clasificar. Se añaden consumidores explícitos: seis manos del tutorial, sprite del guardián, imágenes HTML del menú/biblioteca y cuatro referencias de edificios del lab de destrucción. Las fotografías se usan en `buildingThumbnail.src`; sus perfiles ICC siguen exigiendo revisión. Los comentarios, scripts/estilos y atributos `data-src` no se confunden con imágenes HTML.

El último archivo desconocido es la diminuta prueba de soporte WebP del GLTFLoader del lab de cultivos: compara `image.height===1`. Se registra como dato protegido, no como ilustración para comprimir. Los mapas compartidos conservan todos sus roles; un consumo de color no elimina un consumo de normales/datos.

Resultado actual: 225 imágenes distribuidas, cero usos desconocidos, cero errores de lectura. 162 archivos independientes y 63 imágenes embebidas. Nueve imágenes del archivo original no distribuido siguen sin clasificar; no se ocultan ni se consideran aptas para compresión.

Preflight: 95 candidatas de color (14.998.080 bytes), 45 archivos para revisión (54.393.053 bytes) y 22 variantes ya integradas (22.637.272 bytes). Las 63 imágenes embebidas necesitan un proceso posterior propio. Elegibilidad no demuestra ahorro, conversión correcta ni aceptación visual.

La nueva clasificación del SVG reveló que el preflight confundía un formato no admitido con un inventario obsoleto. Se separan ambos errores: SVG queda en revisión; una discrepancia de formato/hash/metadata sigue siendo fatal. No se rasteriza ni se sube el SVG automáticamente.

41 pruebas correctas antes de separar estos mensajes; después, 20 pruebas dirigidas correctas incluyen SVG real, formatos incoherentes, perfiles, fuentes desconocidas y extracción conservadora. Las 22 variantes runtime quedaron verificadas en la primera ejecución. Este cambio afecta herramientas de clasificación/política, no assets ni render del juego. No se hacen operaciones de API, conversiones ni sustituciones nuevas.

Reproducir: `node tools/audit_image_assets.mjs`, `node tools/plan_tinify_images.mjs`, `node --test tests/image-roles.test.js tests/tinify-color-policy.test.js tests/image-runtime.test.js`. Los informes comprimidos incluyen los archivos públicos/archivados y pertenencia al último build local; proof.json fija fuentes y alcance. Pendiente convertir/aceptar las candidatas y revisar normales, perfiles, mapas embebidos y dispositivos.
