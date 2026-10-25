# Matas con streaming y transiciones — piloto QA, 20/10/2026

Se conserva el avance para llevar las matas Blender a campaña. El piloto anterior guardaba una instantánea de la población inicial: a 288 m se quedaba sin microvegetación. Este piloto sigue los chunks residentes, mantiene 192 instancias y recupera la distribución inicial al regresar. No está integrado en el renderer habitual ni completa la dirección artística global.

Modelo, colores y densidad proceden de [grass-clumps](../grass-clumps/README.md), sin nuevas texturas ni assets externos. Se reutilizan los callbacks de chunks y observadores de eventos existentes; no se modifica simulación, navegación, balance ni siluetas originales.

## Comparación en juego real

24 capturas: Sabana y Gran Río, tres posiciones (inicio, +288 m, regreso), día 150/noche 350, semilla 712, calidad media, 1280×720. Antes = instantánea `grass-clumps`; después = `grass-streaming`. Cámaras, objetivos y horas coinciden en las 12 parejas.

- [Sabana lejos antes](case-1-grass-clumps-1-day.png) / [después](case-1-grass-streaming-1-day.png).
- [Gran Río lejos antes](case-6-grass-clumps-1-day.png) / [después](case-6-grass-streaming-1-day.png).
- [Gran Río noche antes](case-6-grass-clumps-1-night.png) / [después](case-6-grass-streaming-1-night.png).

`streaming.json` guarda cámaras, chunks, población y escalas durante 45 fotogramas por parada. La capacidad del buffer permanece en 192; las claves de detalle coinciden con las del mundo. Población candidata 5.607 → 6.117 → 5.607; población visible del nuevo piloto 192 → 192 → 192, frente a 192 → 0 → 192 del anterior. Sin errores de página/HTTP en esta captura.

El recorrido preliminar de 96 m se conserva como datos en `initial-96m.json`; sus nombres de imagen son históricos y las imágenes actuales corresponden al recorrido final de 288 m. Se amplió porque 96 m aún permitía seleccionar matas de la instantánea inicial.

## Transición, ocupación y propiedad

La selección favorece en 4 m las matas ya elegidas. Las salientes reducen escala durante 0,3 s y liberan su sitio antes de incorporar las entrantes, que crecen durante otros 0,3 s. No usa transparencia ni aumenta el número máximo de instancias. Sigue existiendo corte de selección a 85 m, suavizado mediante esta transición.

`occupancy-motion.json`: prueba sintética en una fixture desechable usando los eventos reales `PlacementCommitted` y `StructureRuined`. Una estructura retira siete matas cercanas; al quedar en ruinas se recuperan exactamente las posiciones previas. No es una prueba de interacción completa de campaña. Recorrido adicional de 30 m en 120 fotogramas por bioma verifica capacidad y variación acotada de escala; esto demuestra la interpolación numérica, no sustituye una revisión de vídeo.

La regeneración de chunks marcados sin cambiar ocupación mantiene sus candidatos. La disposición doble emite exactamente una liberación de geometría y una de material. Se restaura el hook y se retira el observador. El contador global de geometrías vuelve a 125 en Sabana y 123 en Río; texturas pasa de 74 a 75 al volver en esta sesión. El modelo no usa texturas, pero estos contadores globales no demuestran por sí solos ausencia total de fugas.

## Rendimiento y ajuste de CPU

`paired.json`: ABBA de visibilidad en la misma página, 16 bloques, 180 muestras por bloque tras calentamiento; assets y lógica de selección residentes en ambas variantes. Mide coste incremental de dibujar las matas en cámara fija, no el coste total de streaming. 192 instancias, 69.120 triángulos y una llamada adicional. La primera página registra un 404 sin URL en el registro de consola del benchmark; no se atribuye a un recurso concreto.

| Bioma | Fase | GPU base ms | GPU con matas ms | Diferencia ms |
|---|---|---:|---:|---:|
| Sabana | Día | 17,657 | 18,024 | +0,366 |
| Sabana | Noche | 18,083 | 18,366 | +0,283 |
| Gran Río | Día | 13,815 | 14,290 | +0,475 |
| Gran Río | Noche | 14,816 | 15,033 | +0,217 |

Hay deriva entre bloques; no se declara una mejora de GPU respecto al pase anterior. La medición GPU precede al ajuste de cálculo de prioridades descrito abajo, que mantiene el shader/modelo y criterio de selección; se repitieron movimiento, ocupación y capturas con el código final, no el benchmark GPU.

La primera versión recalculaba distancia e identificador en cada comparación de ordenación: el hook de selección consumía 1,289/1,227 ms medios durante movimiento en Sabana/Río (`occupancy-motion-unoptimized.json`). Calcular cada prioridad una vez por candidato reduce esas medias a 0,591/0,541 ms; p95 1,0/1,1 ms. Incluye instrumentación QA, excluye carga de chunks y el resto del render. Sigue siendo un coste a considerar al integrar; no es una medida del tiempo total de frame.

## Recomendación y límites

Conservar streaming, propiedad y selección optimizada como base del siguiente pase de campaña. Revisar visualmente transiciones en vídeo: el crecimiento de escala puede resultar perceptible. Faltan campaña, cambios reales de ocupación desde la interfaz, cuatro biomas, recorridos prolongados y presupuesto conjunto. Aún hay aspecto de agujas y densidad insuficiente respecto a los mockups. No promover este módulo QA directamente a producción ni abrir una PR de calidad gráfica final con esta evidencia parcial.
