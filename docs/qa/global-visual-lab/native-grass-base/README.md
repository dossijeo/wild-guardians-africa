# Bases de hierba seca: diagnóstico y máscara cromática QA

2026-10-20. Sabana, campaña real seed 712, global-lighting, 1280×720. Solo rama experimental; sin cambios de producción.

## Resultado

Candidato QA de alcance limitado. La máscara reduce los charcos cian pintados sobre el recurso Hierba seca corta (slot 8), pero no integra las peanas circulares: persisten su borde, material liso y restos cian. No aporta volumen de fibras ni alcanza la dirección artística. No habilitar por defecto. El siguiente ensayo debe tratar la transición material base/suelo conservando las siluetas; no aumentar iluminación o contraste para ocultarla.

- Día cercano: [original](media-close-day-original.webp) / [máscara seca](media-close-day-dry.webp).
- Noche cercana: [original](media-close-night-original.webp) / [máscara seca](media-close-night-dry.webp).
- Cámara de juego: [original](media-game-day-original.webp) / [máscara seca](media-game-day-dry.webp).

## Causa y alcance

Raycasts de la campaña identifican slot 8 por identidad de material en prototypes. Los objetos usan nativeMergedAsset/nativeMergedPass, por lo que buscar únicamente nativeLodBatch no identificaba el recurso. Los puntos comprobados se encuentran sobre waterInfo.inside=false. Fuente del pack: Meshy_AI_Miniature_Savanna_Lan_0926120835_texture.glb. El slot 19 Charca estacional es el único que declara asset.water y no se modifica. La zona azul observada pertenece al material del modelo seco, no al agua del mundo. Véase ray-audit.json y el inspector reproducible.

El helper conserva callback y clave de caché nativos. Modifica baseColor al principio de artLighting416, antes de la iluminación diurna/nocturna, con una máscara suave cian y luminancia conservada aproximadamente. Solo material compartido del slot 8 en Savanna. Sin atlas nuevos, lecturas de textura, geometría, instancias, desplazamiento, navegación ni reglas. La clasificación cromática no es una segmentación semántica perfecta; no extender a otros recursos/biomas. La continuidad nocturna sigue la iluminación existente, no una emisión.

## Verificación

Doce capturas original/seco/retorno, dos vistas y dos horas (150/350). Cámaras, horas, draw calls, triángulos y cantidades de geometrías/texturas coinciden por condición. Tres retornos idénticos; el retorno nocturno de cámara general difiere en cinco píxeles, registrado sin atribuirlo al material. Cero errores de navegador. Diferencias del candidato: 2.933/2.917 píxeles cercanos día/noche y 1.430/1.435 en cámara general. La mejora se juzga en las imágenes, no por este recuento.

La captura inicial del inspector era negra por leer el canvas fuera del render; se corrigió renderizando en la misma evaluación antes de leerlo. No se usa aquella imagen como evidencia. No se ha probado movimiento ni streaming prolongado: el ensayo solo recolorea el recurso compartido y no demuestra una solución completa de integración.

## Rendimiento

Intel UHD/ANGLE, 32 bloques ABBA con 30 frames de calentamiento y 120 muestras: 3.840 muestras GPU, media/baja. Sin errores, disjoint ni movimiento de cámara. CPU de envío y p95 completos en audit.json; muestras crudas en benchmarks-*.json.gz. Sin capturas durante las medidas.

| Calidad | Vista | Hora | GPU original → seco (ms) | Delta | CPU original → seco (ms) |
|---|---|---|---:|---:|---:|
| media | close | day | 19.169 → 18.561 | -3.17% | 3.439 → 3.263 |
| media | close | night | 18.757 → 18.696 | -0.33% | 3.358 → 3.268 |
| media | game | day | 20.759 → 20.438 | -1.54% | 3.479 → 3.609 |
| media | game | night | 20.903 → 22.251 | +6.45% | 2.890 → 3.070 |
| baja | close | day | 13.793 → 14.043 | +1.81% | 3.388 → 3.427 |
| baja | close | night | 15.085 → 15.554 | +3.11% | 2.937 → 3.065 |
| baja | game | day | 15.419 → 15.713 | +1.91% | 3.257 → 3.285 |
| baja | game | night | 15.210 → 15.847 | +4.19% | 2.960 → 2.979 |

Media/juego/noche supera el umbral orientativo del 5%. Las diferencias negativas no prueban aceleración. No aprobar presupuesto global a partir de esta ronda. Geometrías/texturas y triángulos/draws permanecen iguales entre variantes; no se mide memoria GPU en bytes ni tamaño interno del programa adicional.

## Reproducción

Servidor del worktree en 5190. Ejecutar inspect-native-grass-base.mjs, capture-native-grass-base.mjs, measure-native-grass-base.mjs y summarize-native-grass-base.py desde la raíz. Scripts bajo tools/experiments. Los PNG locales se publican en WebP sin pérdida; el resumen puede leer JSON local o gzip publicado. Los scripts de captura generan PNG antes del resumen. El comportamiento original continúa por defecto.
