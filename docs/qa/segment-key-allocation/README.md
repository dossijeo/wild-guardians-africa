# Consultas de segmentos: menos asignaciones temporales

`Navigation.segmentClear()` conserva exactamente su caché dirigida para extremos enteros, radio, obstáculo ignorado y permisos de trabajador/animal. La detección de enteros usa cuatro comprobaciones directas, evitando un array temporal. La clave solo se construye para consultas elegibles: los extremos fraccionarios ya no crean cadenas que se descartaban inmediatamente. No se modifican colisiones, límites, puertas, restricciones de fluidos ni selección de rutas.

## Evidencia y límites

- Referencia congelada: `a002693b8fc383a2a0690d97a35311c14268b5ac`. El candidato cambia únicamente estas tres líneas de navegación. Los scripts reproducibles están en `tools/experiments/segment-key-allocation.mjs` y `compare-segment-queries.mjs`.
- Dos pares de calentamiento y ocho pares alternados sobre la finca pagada de 32 cultivos, ocho trabajadores y cinco especies. Cada ejecución compara 1.630 estados serializados, con 146 búsquedas; el hash de toda la trayectoria coincide: `3c035b1b27ca92321f5055c3f7bb87c5b5e60f960b5c905ee2e1c0dd105f996c`.
- Mediana total local: 3.439,22 → 3.342,48 ms (−2,81 %), mejora en seis de ocho pares. Mediana del tick máximo: 414,56 → 406,66 ms, mejora en cuatro de ocho pares. La dispersión no acredita una mejora consistente de los picos grandes. Dos campañas de cien noches siguieron ejecutándose en segundo plano; no se lanzó otra compilación o suite durante esta comparación.
- [1.152 consultas diferenciales](differential.json) en los seis terrenos procedurales reales: perfiles originales de vegetación, puerta girada, extremos enteros/fraccionarios, dos radios, permisos e ignorar obstáculo. Coinciden booleanos, orden/claves de la caché y número de comprobaciones físicas.
- 133 pruebas dirigidas correctas: 44 de navegación/caché/actores y 89 de puertas, cierre mixto y fluidos. Compilación y paquete web correctos: 587 archivos, 382.099.527 bytes, 859 enlaces relativos y 20 GLB.

Estas mediciones son CPU local de una carga concreta; no prueban FPS, GPU, RAM, móvil o mejoras de cien noches. Los picos de navegación de unos 400 ms siguen pendientes. Logs originales comprimidos sin alterar sus bytes, y hashes en `logs.json`.
