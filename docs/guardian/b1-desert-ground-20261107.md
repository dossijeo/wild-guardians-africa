# Suelo WebGPU del desierto

La superficie Worker puede preparar el suelo del desierto con el catálogo de materiales existente, sus mapas de arena y normal, color por vértice y máscara de cada chunk. Comparte el grafo entre materiales y deja la publicación y retirada a la residencia y admisión del terreno ya existentes. La subida usa el mismo propietario y espera asíncrona que los demás proveedores; ante fallo se conserva el material provisional y se notifica el error.

La traducción incorpora la modulación de arena, el desgaste, la rugosidad, la iluminación diurna/nocturna y las sombras. No se ha demostrado paridad visual: faltan la contribución ambiental reflejada, el ruido de detalle geométrico del shader anterior, AO de contacto y la equivalencia con origen flotante. No se considera cerrado B1. Las pruebas comprueban los dos recursos reales, propiedad, cancelación, máscaras y generación WGSL sin dispositivo; todavía faltan ejecución WebGPU real, imágenes y mediciones integradas.
