# Máscara de altura para las bases de hierba

2026-10-20. Sabana, slot 8 Hierba seca corta. Campaña real seed 712, global-lighting, 1280×720. Variantes QA, sin cambios de producción.

## Resultado visual

La máscara por altura integra mejor la peana que la combinación anterior de altura, normal hacia arriba y clasificación foliar. Reduce el borde naranja y el cian residual, de día y de noche. Conserva las siluetas y geometría, pero tiñe la parte inferior de algunas piedras y hojas: es una transición por altura, no una segmentación semántica. Conservar como candidato localizado, no extender a los otros recursos usando los mismos umbrales.

- Cerca/día: [original](media-close-day-original.webp), [máscara anterior](media-close-day-continuous.webp), [altura](media-close-day-root.webp).
- Cerca/noche: [anterior](media-close-night-continuous.webp), [altura](media-close-night-root.webp).
- Juego/día: [original](media-game-day-original.webp), [altura](media-game-day-root.webp).

## Diagnóstico

El LOD0 contiene 5.438 vértices y 2.922 triángulos; después de soldar posiciones a cinco decimales forma una sola componente conectada. No puede aislarse la peana como submalla desconectada. Las normales bajas incluyen caras laterales/inferiores que la máscara anterior excluía. El modelo mide 0,45 unidades locales de alto. La nueva transición es completa por debajo de 0,025 y termina a 0,055 unidades locales sobre el mínimo: no son alturas universales del mundo, pues las instancias tienen escala.

Se reutiliza el shader del pase anterior con sus consultas de textura/sombra/contacto. Solo cambia la máscara; no añade atributos, mapas, consultas ni geometría respecto a la variante continua previa. Puede aumentar el área que ejecuta la rama del material, por lo que coste estructural igual no implica tiempo GPU igual. Las hojas altas quedan fuera de la máscara por construcción; las raíces bajas no se excluyen por color. No cambia alpha, descarte de fragmentos ni posición de vértices.

Persisten los límites del pase anterior: normales y POM del terreno no compartidos, sin máscaras de desgaste/cobertura y sin reflexión ambiental equivalente. Tampoco corrige las bases de arbustos vecinos. No seguir ajustando este único recurso indefinidamente: tras registrar la comparación, volver a evaluar suelo/vegetación a escala global en Gran Río y Cañón.

## Validación y coste

Dieciséis capturas de campaña, vistas cercana/normal y horas 150/350: original, candidato anterior, máscara nueva y retorno. Cuatro retornos idénticos píxel a píxel, poses y recursos iguales por condición. Cero errores de navegador. Se mantienen geometrías, triángulos, draws y texturas; no se mide memoria de programas GPU en bytes.

48 bloques simétricos A/B/C/C/B/A, 30 frames de calentamiento y 120 muestras: 5.760 muestras GPU, Intel UHD/ANGLE, media/baja. Sin eventos disjoint ni movimiento de cámara. Datos crudos gzip y CPU/p95 en audit.json. No comparar directamente con medias de otras rondas.

| Calidad | Vista | Hora | GPU original / anterior / altura (ms) | Altura vs original | CPU original / altura (ms) |
|---|---|---|---:|---:|---:|
| media | close | day | 19.956 / 20.290 / 19.984 | +0.14% | 3.739 / 3.616 |
| media | close | night | 21.456 / 20.953 / 21.396 | -0.28% | 3.688 / 4.098 |
| media | game | day | 23.694 / 22.874 / 22.635 | -4.47% | 3.452 / 3.209 |
| media | game | night | 22.228 / 23.711 / 23.505 | +5.74% | 3.217 / 3.200 |
| baja | close | day | 14.154 / 15.588 / 15.047 | +6.31% | 3.107 / 3.304 |
| baja | close | night | 15.002 / 14.768 / 15.567 | +3.77% | 3.132 / 3.310 |
| baja | game | day | 14.759 / 15.250 / 14.792 | +0.23% | 3.291 / 3.080 |
| baja | game | night | 15.123 / 15.250 / 15.717 | +3.93% | 2.790 / 3.004 |

No aprobar coste global: media/juego/noche y baja/cercana/día superan el +5% frente al original. Frente al candidato anterior, las diferencias son pequeñas y cambian de signo; no demuestran aceleración. La máscara mejora la integración visual, pero mantiene el coste de la ruta completa de material/iluminación.

Cuatro clips de órbita (48 frames a 20 fps de reproducción, no FPS medidos): [día anterior](motion/day-continuous.webm), [día altura](motion/day-root.webm), [noche anterior](motion/night-continuous.webm), [noche altura](motion/night-root.webm). Capturas sin errores. Se inspeccionaron extremos de la órbita; la transición reduce el contorno, con contaminación de raíces/piedras bajas todavía visible. No se afirma ausencia exhaustiva de artefactos, ni validación de streaming prolongado o saltos de origen flotante.


## Reproducción

Servidor del worktree en 5190. Scripts tools/experiments/audit-native-grass-root-mask.py, capture-native-grass-root-mask.mjs, measure-native-grass-root-mask.mjs, record-native-grass-root-mask.mjs y summarize-native-grass-root-mask.py. PNG locales publicados como WebP sin pérdida; benchmarks crudos comprimidos en gzip. El resumen admite JSON local o gzip publicado. Sin capturas ni compresión durante las medidas.
