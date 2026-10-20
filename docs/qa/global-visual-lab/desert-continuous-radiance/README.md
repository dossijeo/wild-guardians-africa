# Desierto: salida de radiancia continua — descartada

Se compara la rampa toon suavizada ya conservada en `global-lighting` con una salida directa `toLinear4(filmic4(groundLit))`. La candidata pierde el dorado de la arena, deja expuestas las grandes facetas de las dunas y adquiere una paleta gris verdosa nocturna. Las sombras de contacto son más graduadas, pero no aparece la estructura superficial del mockup. No integrar esta sustitución directa ni presentarla como avance artístico aprobado.

## Hallazgo del pipeline

En `african-toon.js`, el terreno del Desierto calcula `nativeGroundLight4` con BRDF, visibilidad solar, entorno y contacto. Después pasa ese resultado como `lit` a `africanToon4`. La rama ordinaria de esta última reconstruye el color a partir de albedo, normales y rampas; no consume `lit`. Las ramas tempranas de agua/humedad no corresponden a esta arena seca. Por tanto, refinar exclusivamente la BRDF previa no garantiza un cambio visible en esta ruta.

La prueba sustituye solo la llamada final del suelo por el tonemapping existente. Conserva mapas, normales, geometría, sombras nativas, exposición y ciclo día/noche. Abarca materiales de suelo residentes y horizonte, con enlace de futuros materiales. No toca edificios ni objetos. Al omitir la reconstrucción toon también se omiten su pigmento, tinta, rim y gradación: **no es una ablación aislada de cuantización**, ni demuestra que toda iluminación continua sea inferior. La comparación incluye ese cambio de paleta y tratamiento completo.

## Capturas reales

24 capturas de campaña, semilla 712, cultura Mapungubwe, calidad media, 1280 × 720 DPR 1. Dos regiones: poblado y objetivo desplazado +50/+30 m. Tres cámaras por región, día 150/noche 350, controles y candidata. Campaña pausada y reloj visual de materiales fijado para comparar.

- Dunas, día: [control](dunes/desierto-base-overview-day.webp) / [continua](dunes/desierto-candidate-overview-day.webp).
- Dunas, noche: [control](dunes/desierto-base-low-night.webp) / [continua](dunes/desierto-candidate-low-night.webp).
- Poblado: [control](desierto-base-overview-day.webp) / [continua](desierto-candidate-overview-day.webp).

La primera serie conserva la interfaz de campaña en las capturas; la segunda extrae directamente el canvas para ver el terreno sin interfaz. No comparar píxeles entre regiones/series. Los WebP son lossless y se verificaron contra los RGB originales.

[Auditoría de doce parejas](comparison.json): cámara, objetivo, hora, día, semilla, calidad, número de estructuras/plantas, draw calls y triángulos coinciden. Cero errores HTTP/JavaScript registrados. La serie de dunas añade comprobación explícita `getError()`: cero en sus doce capturas; la primera serie no registraba ese dato. Los contadores son los del harness de captura, no una medida de todas las pasadas GPU.

## Coste y límites

Cero nuevas texturas, geometría, instancias o pasadas por construcción; no se añade ninguna lectura de textura. Esto no equivale a coste temporal cero: activar el resultado de la BRDF puede cambiar el trabajo que el compilador elimina. No se ejecutó benchmark GPU/CPU porque esta receta no supera la revisión artística. No atribuir a esta prueba los tiempos de la rampa suavizada anterior.

El contador de texturas varía entre cargas (59/52, 59/56 o 61/54 según pareja), aunque el helper no crea ni destruye texturas. No constituye ahorro ni medición de VRAM. Sin prueba de recorrido largo, calidad baja/alta, hardware adicional ni aislamiento de cada componente de color. No se publica como solución completa de streaming solo por disponer del callback de enlace.

## Reproducir y decisión siguiente

Vite en 5190. `node tools/experiments/capture-desert-continuous-radiance.mjs` captura las dunas. Para el poblado se utilizó `capture-campaign-grass.mjs` con `WG_GRASS_STUDY=desert-continuous-radiance`, `WG_GRASS_BIOMES=desierto` y `WG_GRASS_OUTPUT=docs/qa/global-visual-lab/desert-continuous-radiance`. Los scripts guardan PNG; la entrega contiene copias WebP verificadas y registros con esas rutas.

Se mantiene la rampa suavizada actual. El siguiente experimento de arena debe separar estructura del material y paleta de iluminación, conservando el dorado y evitando las ondulaciones periódicas uniformes ya descartadas. Cambiar solo la salida final no resuelve la carencia de estructura mesoscópica. No modificar la geometría autoritativa para reproducir la referencia. El objetivo de calidad de los seis biomas sigue pendiente y el viento 8× permanece intacto.
