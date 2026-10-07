# Caché de sombras: cámara de vista

Base de revisión: main e7361fe, con la modificación local de `shadow-cache.js` identificada en `sources.json`. Ensayo nativo mediante la página `tests/browser/shadow-cache-view-camera.html`, servida por Vite en 5191. El resultado original está en `native.json` y la captura en `native.png`.

## Problema y corrección

El snapshot incluía la proyección y la matriz inversa de la cámara de vista. Three 0.180 renderiza la geometría de sombras desde la cámara de luz; utiliza la cámara de vista para seleccionar capas y como argumento de callbacks. Los dos callbacks reconocidos del juego registran estadísticas de props o actualizan uniformes de construcción desde `shadowCamera`. Los inputs personalizados de profundidad tienen su propio contrato; los callbacks desconocidos siguen impidiendo reutilizar la caché.

Se eliminan únicamente las matrices de vista del snapshot. Se conservan capas, matrices de luz, geometría, instancias, animación, texturas, recortes, inputs de profundidad y las invalidaciones explícitas. Una regresión adicional demuestra que un shader cuyo contrato declara dependencia de la cámara sigue invalidándose al moverla.

También se incorpora `alphaToCoverage` al snapshot: el `getDepthMaterial` de Three lo convierte en un cutoff de alpha de 0,5. Antes podía reutilizarse una sombra obsoleta al alternar ese ajuste. Las dos nuevas regresiones originales fallaron contra e7361fe antes de modificar la implementación.

## Evidencia WebGL

La fixture usa una luz direccional, shadow map de 256×256, materiales Standard, una superficie con alphaMap y una caja en otra capa. No utiliza guardados ni créditos del juego.

- 120 posiciones y proyecciones de cámara: 120 hits, cero nuevas pasadas de sombra.
- Readback RGBA empaquetado: cero bytes distintos entre la sombra inicial, la reutilizada y un recálculo forzado desde la última pose.
- Activar alpha-to-coverage: recálculo y 9.497 bytes distintos; coincide con el recálculo forzado posterior.
- Activar otra capa: recálculo y 6.335 bytes distintos.
- Mover la luz: recálculo y 15.297 bytes distintos; coincide con el recálculo forzado posterior.
- Sin errores WebGL ni errores recogidos por la página.

El resultado demuestra reutilización correcta para estos casters Standard. No cuantifica FPS, frametime GPU ni ahorro de RAM; tampoco sustituye readbacks de todas las construcciones dañadas, cultivos animados o pruebas en teléfono físico. La cámara de luz, los casters, el viento o los chunks que cambien siguen requiriendo dibujar la sombra.

`tests.log.gz` conserva las 53 pruebas dirigidas de caché, sombras nativas, cámara de luz, proxies, edificios y destrucción, todas aprobadas con salida 0. `build.log.gz` registra la compilación correcta de 222 módulos; mantiene el aviso existente de tamaño del bundle. La pestaña del ensayo terminó y se cerró después de guardar la evidencia. La pestaña anterior de voces se conserva sin reiniciarla.
