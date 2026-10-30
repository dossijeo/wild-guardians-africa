# Comparativa de los nuevos árboles — 30/10/2026

Comparación visual real en navegador: cuatro árboles de día y árbol seco de noche. Original a la izquierda; archivo nuevo a la derecha, normalizado a la altura original. Misma cámara, iluminación y factores de rugosidad (.87) y metalicidad (0). Visor: `/tests/browser/tree-4k-review.html`. No se han sustituido recursos ni cambiado el renderizador del juego.

## Resultado

La nueva corteza tiene una veta más definida y el árbol seco gana detalle de fibras. Las copas presentan un contraste mayor; el baobab incorpora bandas horizontales muy visibles. Son prometedoras para primer plano, especialmente la madera, pero no aprobaría todavía una sustitución directa: las bases tienen cambios de color marcados y aparecen caras muy oscuras. La comparación incluye diferencias de normales y UV; no permite atribuir todo el contraste a la calidad de la textura.

Aunque los archivos se llaman 4K, cada uno contiene dos imágenes de 3072 × 3072 (color y metallic-roughness), sin normal map ni atributo NORMAL. GLTFLoader utiliza sombreado plano al faltar normales. Los originales sí llevan normales suaves y normal map. Hay además renormalización de escala y UV reorganizadas. Triángulos actuales/nuevos: 4222/4206, 3290/3282, 3770/3762, 1612/1602. No son arrays intercambiables ni exactamente la misma topología. Las proporciones exteriores se conservan aproximadamente después de normalizar altura.

Para integrar manteniendo las mallas originales habría que transferir/rehornear el nuevo color/PBR sobre las UV originales (o transferir UV por correspondencia geométrica comprobada), conservar las normales originales y recuperar el normal map correspondiente. No se ha realizado esa integración ni validación de todas las costuras en este ensayo. La pieza de follaje suelta del árbol 2 ya existe en el original.

Dos mapas RGBA8 de 3072 cuadrados con mipmaps representan aproximadamente 96 MiB por árbol, 384 MiB para los cuatro, antes de un mapa normal adicional. Es una estimación, no una medición de memoria GPU. Para primer plano se necesita residencia limitada y evaluar compresión GPU; el tamaño pequeño del GLB no equivale a memoria GPU pequeña. Sin medición de FPS ni aprobación de rendimiento de Wild Engine.

## Reproducción

Copiar los cuatro archivos del usuario `tree_01_4k.glb` … `tree_04_4k.glb` a esta carpeta (ignorados por Git); sus SHA256, mapas y materiales se registran en inspection.json. Iniciar Vite y abrir el visor. Los originales de comparación están en `../tree-hd-transfer/current-runtime/`.

## Capturas

- [Árbol 1](tree-1-day.png)
- [Árbol 2](tree-2-day.png)
- [Baobab](tree-3-day.png)
- [Árbol seco](tree-4-day.png)
- [Árbol seco, iluminación nocturna de prueba](tree-4-night.png)

La iluminación es una previsualización PBR aislada, no una captura del escenario de Wild Engine.
