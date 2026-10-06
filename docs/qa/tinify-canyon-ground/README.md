# Suelo de Gran Cañón: Tinify WebP integrado

Corrección de evidencia (2026-10-07): las comparaciones históricas de suelo de esta carpeta no acreditan original frente a candidato: el resolvedor podía sustituir ambos por la variante runtime. Véase ../tinify-volcano-river-ground/README.md y sus nuevas capturas con URLs originales/candidatas distintas. Los informes de píxeles, hashes y carga de variantes conservan su alcance.

El albedo del terreno original del lab pasa de 1.753.093 bytes JPEG a 225.226 bytes WebP: 1.527.867 bytes menos, conservando 1024 × 1024 píxeles y alpha opaco exacto. Se procesó con Tinify mediante la credencial privada; el informe público no contiene credencial ni URL privada del proveedor. La compresión modifica RGB (error absoluto medio 5,275/255); no es una conversión sin pérdida.

La variante se distribuye por el alias relativo de `image-runtime.json`. El original permanece en Git para comparar y se excluye del paquete. No cambia el UV, la escala, los filtros, shaders, normales, mapas de datos ni número de muestras por fragmento.

Aceptación visual: escena real WorldScene, Gran Cañón/Mapungubwe, seed 712, calidad media, cámara idéntica. Se alternó únicamente `uGroundDetailMap`, copiando del candidato los filtros, colorSpace, wrapping y demás opciones del sampler al original. Las cuatro capturas originales/candidatas de día y noche no muestran deformación, cambio evidente del patrón ni discontinuidad. Los estados registran cero errores de shader. Es una vista y cultura de escritorio; no acredita todas las cámaras, móvil ni Windows.

Reproducir con Vite `/tests/browser/african-toon.html?case=21`, botón «Suelo Tinify / original (QA)» y «Día / noche». Los originales no se incluyen en la compilación distribuida; esta comparación de escena es source-only.

Carga nativa desde `/nested/itch/audio-qa/tests/browser/image-runtime.html` en puerto 4187: doce imágenes descodificadas, hashes y dimensiones correctos, cero errores, sin fallback de raíz. Véase `nested-images.json` y captura.

43 pruebas dirigidas correctas: política de color, caché Tinify, comparación de píxeles, variantes runtime, roles de texturas y datos sin pérdida. Compilación y verificador de paquete correctos: 586 archivos, 388.055.217 bytes, 859 referencias relativas, veinte GLB runtime y sin copias originales sustituidas. Reducción neta frente al paquete previo: 1.526.658 bytes; no es evidencia de ahorro de GPU/RAM ni de frametime. ZIP para itch.io generado y comprobado por CRC, con los archivos directamente en la raíz.

El informe del piloto conserva `acceptedForRuntime:false` como registro de la fase previa; esta documentación acredita su aceptación posterior en el alcance descrito. El barrido de imágenes completo, texturas embebidas y verificaciones nativas más amplias siguen pendientes.
