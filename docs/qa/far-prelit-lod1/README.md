# Atlas precocinado del nivel intermedio nativo

El atlas anterior captura LOD 0, mientras el lote nativo usa LOD 1 a 50 metros en la prueba de transición. Esta variante captura directamente la geometría/material de LOD 1 para eliminar esa diferencia de fuente, sin aumentar el nivel geométrico del lote 3D.

`far-vegetation-atlas.html` acepta `lod=0/1/2`; el encuadre sigue derivándose del nivel completo. Se mantienen exactamente localBase, sourceBounds, impostorWidth e impostorHeight del atlas original. El nivel capturado se registra como bakedLod y el usado para encuadrar como framingLod.

## Precálculo y archivos

Capturas offline mediante `?bake=day&rotations=8&resolution=128&lod=1` y su equivalente `bake=night`, con AfricanToon real y sol fijo. Cada fase contiene ocho orientaciones del árbol por ocho vistas de cámara, 128 × 128 píxeles por celda, atlas RGBA de 1024 × 1024.

- Geometría capturada: 9.437 vértices y 5.170 triángulos, comprobados contra el catálogo nativo.
- Las 64 celdas de cada fase tienen contenido, WebGL sin errores y consolas vacías.
- WebP lossless con conservación exacta de RGBA, verificado contra el PNG capturado, incluidos píxeles transparentes.
- Día: 632.618 bytes; noche: 537.256 bytes. Los anteriores atlas LOD 0 de la misma resolución ocupan 641.090 y 550.008 bytes. No cambia la resolución ni el espacio de textura descomprimida previsto.
- Los PNG originales permanecen en `.cache/far-prelit-lod1-source`, fuera del commit. Se guardan metadatos, hashes y comprobaciones en los JSON de esta carpeta.

## Comparación de transición

`far-native-transition.html?atlas-lod=1` selecciona estos atlas; el valor por defecto conserva el atlas original. No cambia shaders, selección nativa de LOD ni lógica de transición.

Ambas capturas `*-middle` utilizan cámara [0,10,50], LOD nativo 1, cobertura nativa 0,5, preparación GPU completa y readiness 1. Ambas muestran tres programas y tres llamadas de dibujo, sin errores. Los 12.796 píxeles modificados fuera del panel están contenidos en [559,271,720,416], alrededor del árbol. Ese recuento acredita el cambio visual localizado, no una medida de mejora perceptual.

Se elimina la discrepancia de geometría fuente en esta posición, pero la captura todavía muestra diferencias de perspectiva y trama del dither: no se da por resuelta la invisibilidad de la transición. El atlas es horizontal/ortográfico y la cámara real está elevada; también falta ajustar el rango para que no cruce un cambio de nivel nativo. No basta con sustituir los atlas para cerrar esos problemas.

Pasan 14 tests de cobertura nativa y preparación GPU. Quedan desplazamiento continuo/lateral, alturas y ángulos, noche/transición intermedia, varios árboles, sombras e integración con WorldScene. Las cifras de preparación guardadas son observaciones únicas y no se comparan como benchmark. Esta variante es experimental y no forma parte del paquete de gameplay.
