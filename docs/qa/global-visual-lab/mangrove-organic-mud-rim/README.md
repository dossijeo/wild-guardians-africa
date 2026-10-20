# Manglares: descarte de recorte irregular del barro

**Descartado como mejora del conjunto.** Hacer irregular el contorno reduce la silueta poligonal, pero mantiene la separación brusca de material y la apariencia de pieza pegada sobre el musgo. Desde cámara normal el beneficio es insuficiente; no se activa por defecto ni se integra en el renderizador.

## Ensayo

Se calcula una distancia al contorno existente por vértice y se añade un atributo escalar al mesh visual. El fragment shader descarta una franja interior de0,04–0,48m modulada por ruido espacial continuo. No hay alpha blending, nuevas texturas, triángulos o draws. Las posiciones, índices y contornos consultados por mudContainsPoint no se escriben; la erosión solo cambia la silueta visible dentro de la huella existente. Esa divergencia visual/huella es otra razón para no ampliar el recorte.

24 capturas de campaña real, doce parejas, semilla712, media/baja, tres cámaras y día/noche. Coinciden cámara, hora, draw calls y triángulos en todas las parejas. Cero errores registrados. [Datos](captures.json), [comparación](comparison.json).

Comparativas: [normal día media](media-day-game-comparison.webp), [oblicua día media](media-day-oblique-comparison.webp), [normal noche baja](baja-night-game-comparison.webp). La revisión directa del antes/después normal diurno mostró la insuficiencia artística. No se considera que diferencias de píxeles prueben una mejora.

## Costes y límites

El piloto añade4bytes por vértice. En la primera captura candidata hay453132bytes acumulados de atributos; el contador incluye bindings creados, no memoria GPU residente. No se ejecuta benchmark GPU de una candidata visualmente descartada. elapsedSinceInstallMs mide tiempo de pared desde la instalación, no CPU de construcción; se corrigió el rótulo inicial buildMs en los metadatos sin alterar los valores.

El helper retiene bindings durante la prueba y genera una clave de programa por chunk al incrustar su origen: no es una implementación apta para producción ni un modelo de coste para la futura mezcla. Se conserva solo para reproducir el descarte, no se propone optimizar este recorte antes de resolver su dirección artística.

## Siguiente hipótesis

La frontera necesita transición de color, normal y rugosidad entre barro y musgo. Investigar una máscara visual común que permita mezclar ambas respuestas manteniendo las huellas autoritativas; evitar sustituir el borde geométrico por ruido de descarte. El patrón repetitivo del musgo también sigue pendiente, pero no debe ocultarse oscureciendo toda la isla.

Reproducción: Vite5190, `node tools/experiments/capture-mangrove-organic-mud-rim.mjs`; empaquetado con WG_SAND_OUTPUT=docs/qa/global-visual-lab/mangrove-organic-mud-rim y `node tools/experiments/package-desert-sand-settlement.mjs`. El empaquetador compartido no cambia el bioma. Los WebP individuales son lossless; las comparativas son calidad92.
