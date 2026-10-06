# Cinco muestras de terreno sin arrays temporales

`Navigation.terrainValid` conserva centro, derecha, izquierda, delante y detrás en ese orden. Sustituye las seis expresiones de arrays del bucle por índices/offsets escalares. No añade caché, no altera puntos, radios, agua/lava, pendientes ni reglas de actor. No se afirma una reducción medida de RAM/GC: el motor JavaScript puede optimizar allocations.

Referencia a1db5d7 y candidato aislado: dos pares de calentamiento, ocho pares alternando orden sobre el fixture CPU de 32 cultivos pagados, ocho trabajadores pagados y cinco bestias. Los estados completos tras cada tick, pasos y búsquedas coinciden exactamente en todos los pares. Mediana total 3246,88 → 3182,05 ms (−2,00 %); peor tick 397,21 → 389,06 ms (−2,05 %). Cinco de ocho pares mejoran cada medida. Es una mejora pequeña y con variación; no acredita FPS/GPU/móvil ni resuelve picos de varios cientos de milisegundos. Dos campañas largas independientes seguían vivas; sin otra prueba/build propios durante la medición.

La comparación diferencial reproduce 4.320 consultas sobre seis campos procedurales reales: 60 posiciones fraccionales por bioma, radios 0/0,28/0,9, trabajador/bestia y allowFluid false/true. Coinciden booleanos y las 107.272 llamadas observadas al terreno (orden, argumentos y resultados). La fuente aplicada coincide con el candidato después de normalizar LF/CRLF.

Validación: 78 pruebas de vecinos, límites, épocas, segmentos, reutilización, puertas/incursiones; otras 78 pruebas de fluidos, colocación, retirada y poblado/pisadas del Gran Cañón. Build correcto y paquete web: 587 archivos, 388.155.440 bytes, 859 enlaces relativos y veinte GLB. No cambian assets ni balance.

Reproducción: `node tools/experiments/terrain-sample-offsets.mjs <referencia-a1db5d7> <candidato-nuevo>`; luego `node tools/experiments/compare-terrain-samples.mjs <referencia> <candidato>`. Medidas, comparación y logs conservados en esta carpeta; gzip mtime cero. La CI completa de la nueva implementación sigue pendiente del push; la CI de a1db5d7 ya terminó correctamente.
