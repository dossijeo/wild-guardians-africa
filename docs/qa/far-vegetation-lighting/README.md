# Iluminación real en el prototipo de acacias

Sobre 10d4cef, 6 de octubre de 2026. Abrir `tests/browser/far-vegetation-transition.html?lighting=real`. El visor predeterminado conserva el diagnóstico MeshBasic anterior. Ninguna variante está activa en gameplay.

## Receta y materiales

El modelo cercano clona el MeshStandard original, preservando texturas, datos de superficie, alpha test y hook nativo; añade dithering y el AfricanToon real. El impostor reutiliza `artLighting416`, `toLinear4` y `filmic4` actuales y los mismos objetos de uniformes de AfricanToon y perfil de Sabana. Clasifica follaje por color y aproxima su normal con una envolvente de copa y una orientación diferente para el tronco. No añade normal maps, bake direccional ni variantes horarias. El grading vuelve a linear antes de la conversión final de Three, sin segundo tonemapping.

Una normal vertical iluminaba demasiado el árbol; una envolvente única oscurecía el tronco. Ambas capturas rechazadas se conservan. Separar copa/tronco reduce esos problemas, pero **no acredita una transición imperceptible**: siguen visibles diferencias de contraste y detalle respecto al modelo real. No se adopta en gameplay.

## Evidencia nativa

Seis estados a cámara fija: mediodía con transición/modelo/atlas, más transición durante atardecer, noche y amanecer. Sin errores WebGL ni consola; el visor original sigue dibujando cuatro modelos MeshBasic sin errores. Cinco pruebas matemáticas correctas.

El botón de comparación recorre LOD, modelo (distancias 54–55 para el árbol central a 50) y atlas (disponibilidad visual cero). No transforma todo el horizonte en 3D. El benchmark restaura LOD 40–60 y mediodía.

Cuatro fases de `skyNight` real: día 2, tiempo log(2)/2,4 para amanecer, 150 para mediodía, 300+log(2)/2,4 para atardecer y 350 para noche. Amanecer/atardecer dan factor 0,5 y la misma dirección solar, como el mundo actual. Se aplican sus intensidades solar/hemisférica. Suelo, fondo y fog siguen siendo diagnósticos planos: no se acreditan terreno real, cielo HDR, contactos o sombras.

## Medición

Ocho lotes alternados, DPR 1 y 1280×720, 45 frames de calentamiento y 180 consultas GPU por lote. Dos draw calls; 18/2018 triángulos con 8/1008 árboles; cero modelos cercanos. Sin disjoint, pendientes, overflow ni error GL. Contadores de selección/matrices permanecen en 6/4 durante los ocho lotes.

| Árboles | Mezcla angular | Medianas GPU de ambos lotes (ms) |
|---|---|---|
| 8 | Sí | 0,651 / 0,643 |
| 1008 | Sí | 1,605 / 1,245 |
| 8 | No | 0,647 / 0,645 |
| 1008 | No | 1,814 / 1,722 |

Incremento aproximado de 0,78 ms con mil árboles y mezcla, según medianas de lotes. La variabilidad impide inferir ventaja de mezcla o comparar sesiones como A/B controlado. La receta requiere más trabajo por fragmento: comparar versiones más simples en el mismo ensayo y móvil antes de adoptarla. Los procesos de campaña 20608/36076 seguían vivos, sin tests/builds pesados propios simultáneos. CPU de actualización inferior a resolución temporal observable no significa coste nulo. No se mide RAM ni rendimiento del juego completo.

El atlas y paquete de gameplay no cambian. Pendientes: coherencia visual en movimiento, simplificación de luz, integración procedural/terreno/supresiones, RAM, móvil y demás biomas. `benchmark-native.json.gz` conserva todas las muestras; `summary.json` medianas y hashes; `native.json` estados visibles; capturas de modelo y atlas permiten comparar las diferencias.
