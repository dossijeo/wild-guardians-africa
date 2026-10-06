# Retratos de contratación optimizados con Tinify

Cuatro imágenes del HUD original, sin cambiar sus referencias lógicas, encuadre, dimensiones ni CSS: hombre joven, mujer joven, hombre mayor y mujer mayor. Tinify optimiza el color y genera WebP siguiendo la [referencia HTTP oficial](https://tinify.com/developers/reference/http#converting-images). Se mantienen los originales fuera del paquete distribuido; los alias de image-runtime seleccionan las variantes por hash.

## Evidencia

| Retrato | Original, bytes | Tinify, bytes | Ahorro |
| --- | ---: | ---: | ---: |
| Hombre joven | 19.796 | 8.970 | 10.826 |
| Mujer joven | 30.108 | 15.642 | 14.466 |
| Hombre mayor | 25.348 | 12.264 | 13.084 |
| Mujer mayor | 29.830 | 15.224 | 14.606 |
| Total | 105.082 | 52.100 | 52.982 |

Todos conservan 384 × 384, orientación y alpha exacto. Los informes individuales mantienen el estado del piloto anterior a la integración (acceptedForRuntime:false); este informe registra su aceptación posterior. El color es compresión con pérdida, no igualdad RGB.

- 50 pruebas dirigidas de imágenes/Tinify/alias/paquete correctas, con hashes, dimensiones, alpha y referencias relativas.
- Comparación nativa original/candidato de los cuatro retratos: cero diferencias de alpha, sin errores. Captura comparison.jpg a 192 px por retrato: misma silueta y encuadre, sin deformaciones visibles en esta vista.
- Carga nativa de las dieciséis variantes por sus alias, hashes/dimensiones correctos y sin errores. Informes native-runtime.json y native-nested.json: todas las URL de este último conservan el prefijo /nested/itch/audio-qa/, con servidor sin fallback de raíz.
- Build y paquete: 587 archivos, 388.155.386 bytes, 859 enlaces relativos y veinte GLB. Frente al paquete anterior medido de 388.202.961 bytes, reducción neta de 47.575 bytes tras el coste del manifiesto/bundle. Los originales de los cuatro retratos no se duplican en el paquete.
- Inventario/preflight actualizado: 93 imágenes de color elegibles (22.600.728 bytes), 53 que requieren revisión, y dieciséis variantes ya integradas. Las texturas embebidas y mapas de datos requieren su política propia.

## Reproducción y límites

`node --test tests/image-runtime.test.js`; `npm run build`; `npm run test:web-package`; comparación en tests/browser/worker-portrait-images.html; carga de alias en tests/browser/image-runtime.html. El servidor tools/serve_web_package.mjs permite probar la ruta anidada /nested/itch/audio-qa/tests/browser/image-runtime.html sin fallback de raíz.

La API usa la credencial privada solo en el proceso de conversión y conserva su caché fuera de Git. Los informes publicados no contienen credencial ni ubicaciones privadas del proveedor. No se miden FPS, GPU o RAM; el ahorro descrito corresponde a archivos codificados/paquete. La comparación visual es de escritorio y de retratos, no una nueva validación completa de la modal, móvil, Tauri o todas las culturas/biomas.
