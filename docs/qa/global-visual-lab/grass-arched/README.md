# Matas arqueadas de tres secciones — candidato conservado

20/10/2026. Se conserva como base para el siguiente pase de vegetación, todavía sin integración habitual. La forma se lee mejor que los listones del modelo anterior: las hojas se abren y terminan en una curva descendente. Las agrupaciones de siete siguen mostrando un patrón demasiado regular, y quedan cuatro biomas por adaptar. No se declara alcanzada la calidad global.

## Modelo y comparación visual

Creado en Blender mediante `tools/experiments/blender-grass-arched.py`; fuente `grass-arched.blend`, GLB `public/assets/visual-lab/grass-arched.glb`. 15 hojas cerradas de tres secciones, 240 triángulos, 150 vértices exportados y normales suavizadas, un material sin texturas. GLB de 8.008 bytes. El modelo anterior tenía 360 triángulos y 868 vértices exportados: reducción del 33,3 % de triángulos y del 82,7 % de vértices. No cambia modelos originales ni usa recursos externos.

Radio horizontal máximo de la fuente: 0,472 m; con escala máxima 1,15 queda por debajo del margen de exclusión de 0,65 m. El modelo sigue siendo geometría cerrada, sin planos cruzados; la auditoría de Blender informa cero bordes abiertos/no manifold.

32 capturas finales de campaña: Sabana y Gran Río, día/noche, tres vistas habituales y una de detalle; semilla 712, calidad media, 1280×720. La base de las imágenes usa el modelo anterior, con la misma distribución, máscaras nativas, huellas, límite de 192 instancias y transiciones. Las vistas cercanas extraen el canvas del juego sin HUD. El runner espera un segundo después del cambio de vista/fase antes de recoger métricas y captura.

- [Sabana anterior](sabana-base-detail-day.png) / [arqueada](sabana-candidate-detail-day.png).
- [Gran Río anterior](gran-rio-base-detail-day.png) / [arqueada](gran-rio-candidate-detail-day.png).
- [Vista de juego anterior](sabana-base-overview-day.png) / [arqueada](sabana-candidate-overview-day.png).
- [Vídeo Sabana día](sabana-day-motion.webm) y [Gran Río noche](gran-rio-night-motion.webm); también se guardan las otras dos combinaciones día/noche. Secuencias de aproximadamente seis segundos, no una prueba de recorrido prolongado.

Se descarta la variante intermedia [de hojas anchas](../grass-broad/README.md), cuya geometría más barata no compensaba su aspecto rígido.

`comparison.json` verifica las 16 parejas finales sin errores de página/HTTP: cámara, objetivo, hora, calidad, entidades e instancias coinciden. Catorce parejas dibujan 192 matas y reducen 23.040 triángulos; las dos vistas generales nocturnas seleccionan 166 y reducen 19.920. Ambas cifras corresponden exactamente a 120 triángulos menos por instancia. El número de llamadas permanece igual entre modelos. Sintaxis JS comprobada; no se modificó código de producción ni fue necesario otro build.

## Rendimiento de campaña

El benchmark de `campaign-performance.json` usa el bucle real de campaña pausada, ABBA, 16 bloques de 180 muestras GPU después de 30 frames de calentamiento. Compara la nueva mata visible frente a oculta; ambos estados conservan assets y selección. No mide una sustitución directa del modelo anterior ni el coste total de streaming/movimiento.

| Bioma | Fase | GPU sin dibujar matas ms | GPU con matas ms | Diferencia ms |
|---|---|---:|---:|---:|
| Sabana | Día | 14,439 | 14,366 | −0,073 |
| Sabana | Noche | 14,738 | 15,158 | +0,420 |
| Gran Río | Día | 13,164 | 13,385 | +0,221 |
| Gran Río | Noche | 14,013 | 14,230 | +0,217 |

La diferencia negativa es variación de la medición, no una aceleración causada por añadir hierba. Los 16 bloques tienen cámara estable, 180 muestras y población acotada, sin errores. Una llamada adicional y hasta 46.080 triángulos para 192 matas. La reducción geométrica es comprobable; la mejora temporal frente a rondas anteriores no se afirma como resultado de una comparación directa.

## Recomendación

Conservar esta forma y adaptar distribución/paleta a los seis biomas, empezando por romper la regularidad de los grupos. Mantener las exclusiones de edificios y desgaste nativo ya verificadas. Antes de integrar, faltan los otros cuatro biomas, ocupación de campaña desde la interfaz, recorridos largos y presupuesto conjunto. No se cambia simulación, navegación, reglas, balance, edificios ni atlas del taller.
