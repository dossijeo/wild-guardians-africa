# Integración del Bioma Lab V4.1.10.3

Origen: `C:/Users/PC/Desktop/Wild Guardians New/Bioma_Lab_V4_1_10_3_Manglar_Barro_Humedo.html`, SHA-256 `84f3601d6793e0ada922f69a794922b995788f5bc6bbdc35ad863a11c467320c`. Comparado con V4.0 y con las adaptaciones African Toon V4.1.4 del juego. El archivo original permanece intacto. Extracción reproducible con `tools/extract_assets.py --file Bioma_Lab_V4_1_10_3_Manglar_Barro_Humedo.html`; recetas con `tools/prepare_biome_update.py`.

## Diferencias recuperadas

| Área | Aplicación en el juego |
| --- | --- |
| Generador | Plataforma nivelada con transición de 6 m, despeje y probabilidades por estrato alrededor del poblado. Se calcula con las huellas de la cultura real, en vez del poblado único de demostración. Acceso, centro y 12 parcelas transitables se validan **después** de aplicar la plataforma. |
| Guardado | `terrainVersion=4.1.10.3` y `villages[0].terrainSite` conservan altura, dimensiones y halo. Cargar una partida anterior conserva su terreno y población originales. |
| Cañón | Unión arena/pared más estrecha y franja húmeda menor; detalle, normales y parallax sólo en el fondo plano. |
| Suelo | Albedo real, normal OpenGL, AO/rugosidad/altura empacadas, repetición, mipmaps y filtrado anisotrópico. Los seis biomas conservan sus escalas y calibraciones del lab. |
| Manglar | Alternancia de musgo y barro; humedad orgánica y de orilla, barro oscuro, charcos más lisos y reflejos localizados. No se moja toda la superficie de forma uniforme. |
| Relieve aparente | Parallax cercano de hasta ocho pasos; se desvanece con la distancia. No cambia geometría, colisión ni siluetas. |
| Contexto | Máscara RGBA de cobertura, variación media, humedad y desgaste: 35×35 texels, paso 1,5 m y halo compartido. Se transfiere desde el worker con terreno y agua. |
| Iluminación | Receta ilustrada V4.1.6: tres masas tonales, perfiles de seis biomas, envolvente de copa, sombreado vertical y sesgo mip del follaje. Se aplica a props y a los poblados reales. Trabajadores, bestias, cultivos y destrucción conservan el African Toon recibido anteriormente; el diorama conserva su renderizador propio. |
| Recursos | Los seis paquetes de modelos de bioma son idénticos a V4.0. Se archivan 21 binarios nuevos sin pérdida; el poblado demostrativo adicional se conserva como referencia y no sustituye las cinco culturas del juego. |

## Integración técnica

El mundo usa la misma altura y distribución en navegación, generación local y worker. Los mapas y el ruido se mantienen anclados al mundo al recenterar el renderizador. Los rectángulos de contexto se trasladan temporalmente con el origen y se restauran al acabar la pasada. La sombra conserva su caché y la captura de profundidad mantiene las geometrías originales.

Plantar y lanzar magia siguen sin reconstruir el paisaje. Cambiar calidad conserva las máscaras y texturas; al retirar un chunk se libera su máscara una sola vez. Las texturas de bioma se liberan al cerrar el mundo. Los mapas de horizonte utilizan el contexto neutro del lab.

## Validación

Los tests `biome-update.test.js` comparan alturas, agua, distribución y máscaras con las funciones del **nuevo lab** en los seis biomas y chunks negativos. Acreditan continuidad entre halos, conservación/liberación de máscaras al cambiar calidad y recreación de la navegación con la plataforma guardada.

La matriz visual en `qa/biome-v4-1-10-3/matrix.json` y sus capturas documenta los casos realmente completados. Es una escena de QA con WorldScene, assets, worker, poblados, centro y actores reales; no equivale a una campaña jugada. Las mediciones anteriores de ruido fino y coste GPU no se extrapolan a este material nuevo.


Resultados finales: 30 combinaciones × día/noche, 60 capturas, cero errores de renderizado; prueba adicional de trabajadores y bestias en manglar y cambio Media → Muy baja → Media. La consola archivada incluye advertencias ANGLE X4000 del compilador HDR; no se ocultan ni se cuentan como errores.

La [CI de 9481512](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37154214266) pasa **1.205/1.205** tests, verifica los 505 recursos y los 20 GLB, construye y valida el paquete web. Las seis pruebas que dependían del mapa antiguo se ejecutan explícitamente con terreno legacy; cinco casos nuevos comprueban la incursión y salida física en manglar con plataforma.

Tras excluir seis recursos exclusivos del poblado demostrativo, la comprobación local del paquete pasa: **575 archivos, 403.778.267 bytes, 813 enlaces relativos**. El ZIP para itch.io contiene **351.685.314 bytes**, con CRCs verificados. Las tres pruebas de empaquetado también pasan. El archivo de referencia conserva íntegros esos recursos.


## Mangrove ground correction from original materials — 2026-10-04

Replaced the lab's diagonally patterned combined tile with an offline organic
blend of the user-provided original Moss002/Ground050 maps. No source UVs are
warped or rotated and no shader/chunk sampling is added. Color, normal and packed
AO/roughness/height share the same periodic mask at the original 1024 resolution.
Both separate ZIPs and source hashes are preserved; superseded combined maps are
excluded from the web package. Two actual ABBA GPU comparisons observed no
frametime regression. Day, night, grazing-angle and minimum-quality evidence,
measurement limits and packaging checks: [original-material QA](qa/mangrove-original-materials/README.md).
