# Vegetación lejana: primer atlas offline

Primer paso del prototipo aislado solicitado: una **Acacia paraguas** original de Sabana (slot 0), ocho vistas horizontales 0–315 grados y 256 × 256 por vista. No se activa en WorldScene ni en gameplay y no se añade al paquete distribuido.

`tests/browser/far-vegetation-atlas.html` es la herramienta de precálculo. Usa el binario y textura originales del runtime mediante Assets, geometría de mayor detalle y un material de color base sin luces, normales ni variantes horarias horneadas. El atlas se genera únicamente al pulsar el botón de la herramienta, nunca durante una partida. El visor muestra además el WebP guardado, sin regenerarlo.

## Encuadre y anclaje

Todos los ángulos usan la misma proyección ortográfica y extensión. La base se estima desde los vértices del 1,5 % inferior de la geometría; se registra en `acacia.json`: X=0,0515078; Y=0; Z=1,2762385. Es un anclaje experimental que necesita validación durante la transición, no una suposición de que el origen o el centro de la copa coincidan con el tronco.

El frame mide 10,566605 × 7,8 unidades del modelo; incluye margen lateral/superior y base en V=0. El futuro billboard debe usar estas dimensiones y el anclaje local transformado por la misma rotación/escala del árbol 3D. El atlas tiene celdas cuadradas, mientras que el rectángulo del mundo tiene esa relación de aspecto: el visor 2D no representa las dimensiones del billboard final.

## Validación realizada

- Generación nativa y carga del WebP 2048 × 256 correctas, cero errores WebGL; una llamada de dibujo por vista del precálculo.
- Ocho siluetas diferentes; todas llegan a la fila inferior 255 y conservan márgenes transparentes superiores y laterales.
- WebP lossless: 255780 bytes frente a PNG de 412348 bytes. Sin cambios en alpha ni RGB de píxeles con alpha mayor que cero. El codificador cambia RGB bajo alpha cero (977277 canales); la futura mezcla/filtrado debe utilizar alpha premultiplicado para evitar que colores invisibles contaminen bordes. No se afirma igualdad RGBA completa.
- Hashes del atlas y de los tres archivos fuente (pack, binario y textura de color) en `encoding.json`. `node tools/verify_far_vegetation_atlas.mjs` comprueba dimensiones, fuentes actuales, conteos geométricos, márgenes, base y siluetas; resultado en `checks.json`.

`atlas-native.jpg` muestra el precálculo y la carga del WebP. No se acredita aún billboard cilíndrico, selección angular en shader, blending angular, dithering, luz/fog, correspondencia procedural, carga tardía del modelo, horizonte poblado ni coste de instancias durante gameplay. Son los pasos siguientes del experimento. Tampoco se atribuye ahorro de RAM o FPS al tamaño del archivo.
