# Fondos de montañas HQ — candidatos generados

Encargo del usuario del 7 de octubre de 2026: sustituir el aspecto low poly de
las montañas lejanas por versiones de alta calidad creadas con imagegen.
Se han generado seis fuentes independientes, una por bioma, con la herramienta
integrada `image_gen`, fondo transparente y prompts completos en `prompts.json`.
Los originales generados se conservan sin modificaciones. No están en `public`
ni sustituyen todavía los fondos de la PR #6; no aumentan el paquete del juego.

La dirección visual utiliza relieve erosionado, estratos naturales, iluminación
diurna suave y planos atmosféricos, evitando facetas poligonales. Sabana y Gran
Cañón emplean mesas cálidas; Gran Río y Manglar, relieves verdes; Volcanes,
basalto gris; Desierto, roca y arena claras. No hay cielo ni objetos de gameplay.

## Integración pendiente

Mantener el contrato del cilindro del horizonte: RGBA sRGB, repetición horizontal
360°, skyline transparente y base opaca, tintado nocturno y bruma existentes.
Exportar inicialmente a 2048×512, igual que los fondos actuales, para conservar
el presupuesto de memoria (~5,33 MiB con mipmaps por textura activa). Las fuentes
son 2172×724: recortar solo espacio transparente superior para obtener 4:1 antes
de reducir; no estirar ni deformar montañas. Si el recorte invade la silueta,
regenerar el candidato o adaptar el encuadre; no cortar picos para cumplir tamaño.

El prompt pide continuidad horizontal, pero eso no prueba una unión perfecta.
Comprobar la costura, silueta, escala, alpha y mips en el cilindro real antes de
aceptar cada imagen. Examinar amanecer/día/atardecer/noche, cámara rotando y
parallax, integración con suelo/vegetación y el presupuesto de bytes WebP.
Las franjas cromáticas de las previsualizaciones requieren inspección del alpha:
no confundir RGB oculto con un borde visible; verificar también filtrado/mipmaps.
No se consideran aprobados visualmente ni se atribuye una mejora de rendimiento.

El manifiesto `audit.json` registra hashes y comprobaciones de las fuentes,
incluida continuidad de extremos. Su resultado es diagnóstico, no aceptación.

Primer diagnóstico: 10.339.317 bytes de fuentes; los seis candidatos no tienen
píxeles cromáticos extremos visibles con el corte actual. Los extremos no son
exactamente continuos (0–26 filas con discrepancia de alpha y diferencias RGB),
por lo que necesitan corrección/validación de costura antes de activar. El
recorte superior de 181 px conserva toda la silueta visible en cinco imágenes;
en Desierto cortaría 52 píxeles visibles y queda rechazado: requiere nuevo
encuadre. El alpha de la base no es 255; verificar cobertura con el corte actual
y mipmaps. No usar estos diagnósticos como prueba de una exportación aceptada.

## Arcos HQ — piloto actual

La repetición del panorama y su variante reflejada se conservaron como pruebas
negativas: la simetría en espejo era demasiado evidente. El piloto posterior
utiliza cuatro siluetas imagegen diferentes en un atlas 2048×512, con valles
amplios entre arcos proporcionados; una malla, una muestra de textura y el
mismo tintado diurno/nocturno. Los detalles y pendientes son ilustrados,
suaves y erosionados, sin aspecto de facetas low poly.

Los contratos `*-four-export-contract.json` fijan las cuatro fuentes,
Sharp/vips/WebP y el hash de salida. Reproducir cada atlas con:

    node tools/prepare_mountain_arc_four.mjs .cache/hq-arc-four-BIOMA BIOMA

BIOMA es savanna, grand_river, mangrove, volcanoes, canyons o desert.
El datum vertical de los arcos es la altura procedural del terreno en la
primera aldea persistida (`state.villages[0]`). Esa coordenada se conserva al
continuar partida: no depende de la posición inicial de la cámara ni sigue
la meseta bajo ella al desplazarse. Solo fixtures sin aldea usan su sitio
inicial de cámara como referencia. El parallax horizontal acotado se conserva;
la elevación de cámara no mueve las montañas en vertical. El ajuste de base
por arco sigue siendo una decisión artística que requiere revisión nativa.

Volcanes cuatro-celdas original permanece en el contrato negativo v1.
Su reparación v4/v2/v2/v2 vuelve a generar flancos continuos mediante imagegen;
D, de 2171 px de ancho, recibe una única columna transparente antes del crop
4:1 y la reducción uniforme, sin alterar ningún píxel fuente. No se corrige
el defecto mediante ruido/blending adicional en shader.

Los pilotos continúan fuera de los assets públicos hasta completar contacto,
giros día/noche, filtrado efectivo y comparación de coste. Los informes de
`docs/qa/far-hq-mountains-pilot` distinguen diagnósticos CPU de aceptación nativa;
las muestras de mips altos pueden mezclar celdas y no se descartan esos negativos.
