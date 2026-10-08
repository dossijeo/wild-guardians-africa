# Recorrido directo de obstrucciones: candidato no promovido

Se comparó main 0e5d11c1 con un candidato que elimina las cuatro listas temporales por chunk de la enumeración de poblaciones: map de lotes, filter de meshes, map de meshes y lista combinada. Dos recorridos directos conservan lotes primero y meshes heredados después. El empaquetado real de asset-lod modifica atributos, no el inventario de hijos. No se cambia shader, caché, interpolación ni política de invalidación.

1600 frames comparados (800 con 25 chunks y 800 con 49) coinciden exactamente en estadísticas, cobertura Float32, versiones de atributos lógicos y de los tres LOD, y número de empaquetados. Incluyen cámara móvil, cambio de población, retirada de chunk y activación/desactivación. Cada chunk tiene tres poblaciones LOD de 32 instancias, tres meshes por LOD, dos poblaciones heredadas, un lote sin fade y un objeto sin geometría.

Ocho lotes ABBA/BAAB por escenario después de 200 frames de calentamiento. Cada brazo aporta 800 tiempos individuales por lote. Mediana inferior de los ocho cuantiles por lote, milisegundos por llamada:

| Chunks | Cámara | Mediana antes | Mediana candidata | P95 antes | P95 candidata |
| --- | --- | --- | --- | --- | --- |
| 25 | settled | 0.0313 | 0.0320 | 0.0697 | 0.0628 |
| 25 | moving | 1.0865 | 1.2374 | 1.7104 | 1.8535 |
| 49 | settled | 0.1114 | 0.0989 | 0.1916 | 0.1853 |
| 49 | moving | 2.8619 | 2.8986 | 4.0045 | 5.5599 |

El escenario `settled` mantiene cámara fija, con un toggle de enabled cada 251 frames: incluye la invalidación y recuperación de esos toggles, por lo que no representa únicamente reposo puro. El móvil cambia cámara cada frame. Las campañas largas CPU seguían activas y la variabilidad de los lotes es considerable; no se atribuye una causa al motor/JIT/GC sin perfil. El candidato no demuestra una mejora consistente y su P95 móvil con 49 chunks empeora en esta muestra. **No se aplica a producción**: reducir asignaciones en el código no basta para acreditar menor frametime.

No acredita GPU, FPS, heap, equivalencia visual del juego ni rendimiento de móvil. No cambian assets ni runtime; no requiere build para este archivo QA. Fuentes originales/candidatas comprimidas y hashes/muestras completos en report.json. Reproducir desde raíz con `node docs/qa/obstruction-traversal/measure.mjs`; usa el baseline archivado, escribe resultados nuevos en .cache y conserva la evidencia original. El script verifica primero la equivalencia; no promueve el candidato automáticamente.
