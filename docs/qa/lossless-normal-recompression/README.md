# Recompresión exacta de dos atlas de normales

Main de referencia: `d8caf74` (runtime idéntico a `1429a8d`). El inventario y preflight se han vuelto a ejecutar: 79 imágenes independientes de color pendientes, 45 que requieren revisión/conservación de datos y 38 variantes ya integradas. No hay que aplicar compresión de color con pérdida a normales o canales de datos.

Los dos atlas independientes más pesados se han recompuesto localmente en WebP sin pérdida usando la herramienta existente. Ambos son 2048×2048, RGB8 opacos. Se compararon todos los canales RGBA descodificados con Sharp: exactamente iguales, incluidos hashes de píxeles, dimensiones y alpha. Los informes conservan receta/versiones y hashes de archivos verificados contra los originales públicos y candidatos privados.

| Atlas original | Bytes originales | Bytes candidatos | Ahorro |
| --- | ---: | ---: | ---: |
| b2101b5… | 7.363.500 | 7.296.634 | 66.866 |
| dd78224… | 7.194.112 | 7.136.182 | 57.930 |

Ahorro candidato total: **124.796 bytes (0,86 %)**. Es pequeño y exclusivamente de bytes codificados. No cambia dimensiones, no mide consumo GPU/RAM ni demuestra una mejora de FPS o tiempo de carga. No se ha enviado estos mapas a Tinify ni utilizado credenciales para esta prueba.

Los dos candidatos se integran mediante los aliases de `image-runtime.json`. Los originales se conservan en el repositorio y quedan excluidos del paquete distribuido; solo se entrega la variante correspondiente. No cambia la resolución ni la configuración del sampler/material.

La prueba nativa `tests/browser/data-image-runtime.html` en el navegador de la aplicación (WebGL2) ha vuelto a comparar las diez variantes de datos, incluidas estas dos: 20 comparaciones con `colorSpaceConversion` `none` y `default`, cero canales distintos, hashes RGBA coincidentes, cero errores WebGL o de consola. Los resultados completos están en `native-webgl.json`; cada atlas nuevo aporta 16.777.216 canales por comparación. Esta prueba valida descodificación/subida/readback exactos, no sustituye la aceptación visual de otras optimizaciones del shader.

Reproducción: actualizar inventario con `node tools/audit_image_assets.mjs`, luego `node tools/optimize_data_image_pilot.mjs assets/b2101b5b7c39267556186f59f2f3d9d780dec24340697fc8fd38b1aa0d30befc.webp assets/dd78224d3519fb2a8aad0f252758a7ffeca1c18a7845f84d354e5c067c195b86.webp`. La herramienta reutiliza candidatos por hash y vuelve a comprobar integridad; no los publica.

Validación de la integración: 48 pruebas de `lossless-data-image`, `image-runtime` y `web-package` aprobadas, compilación Vite y comprobación completa del paquete aprobadas (641 archivos / 382.699.599 bytes / 859 enlaces relativos). El test de paquete vuelve a comprobar hashes, dimensiones, alpha y canales exactos de cada mapa de datos.
