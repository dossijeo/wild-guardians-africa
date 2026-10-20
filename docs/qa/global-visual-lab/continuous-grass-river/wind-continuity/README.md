# Continuidad del viento al cambiar de LOD

Candidata independiente derivada del LOD por distancia 3D (bb6e9a805). No modifica la variante aprobada de Sabana ni el piloto original de Gran Río. Intensidad 8× conservada.

## Defecto identificado

Las hojas refinadas tienen altura original 0,85 veces la ligera. La posición visible interpola hacia `flatPosition` al alejarse, pero el viento seguía calculándose con `position.y`. Al cambiar a geometría ligera, el término cuadrático de desplazamiento cambia de golpe aunque los extremos estáticos coincidan.

La corrección obtiene `windHeight` de la posición interpolada antes de aplicar crecimiento, escala e inclinación. Lo usa tanto en desplazamiento como en la corrección aproximada de normal. No añade muestras, texturas, geometría o draw calls. No cambia los umbrales ni las máscaras.

## Evidencia

El [audit de frontera](boundary-audit.json) compara 144 casos de bases/puntas compartidas, escalas 0,65 y 0,90, extremos de onda −1/0/1, viento 8× y fade=1. Salto máximo anterior 0,14756 m; corregido cero dentro de precisión numérica. Es una referencia CPU en lod=0, no una prueba completa del shader ni de continuidad temporal. Las normales originales de ambas mallas siguen siendo diferentes; los vértices intermedios tampoco constituyen una triangulación idéntica.

12 capturas media, cámara cercana/normal/elevada, día/noche, semilla712 y 1280×720. Cámara y número de triángulos coinciden en cada par, sin errores GL ni overflow. [Comparativa normal](normal-comparison.webp): izquierda LOD 3D previo, derecha corrección. En los nombres históricos del harness, `original` significa LOD 3D previo y `distance` esta corrección. La inspección normal conserva cubierta y color; no se deduce de imágenes estáticas ausencia de popping.

## Decisión

Conservar la corrección como candidata QA. Pendientes vídeo de cruce de umbral, revisión de normales y cuantización de la selección de cámara, streaming y medición de esta variante. No atribuirle automáticamente el ahorro GPU medido para el LOD anterior. La revisión interactiva seguía abierta durante estas capturas; no son benchmarks.

Reproducir con `python tools/experiments/audit-continuous-grass-wind-continuity.py` y `node tools/experiments/capture-continuous-grass-river-continuity.mjs`; `WG_COVER_QUALITY=baja` selecciona calidad baja. Los PNG se convierten a WebP sin pérdida para publicación.

Calidad baja: otras 12 capturas, seis pares idénticos píxel a píxel, sin errores GL ni overflow y sin módulos refinados. Confirma que la corrección no cambia estas vistas del perfil ligero; no mide su coste temporal.
