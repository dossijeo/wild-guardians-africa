# Caché experimental de aristas vecinas: descartada

Se comparó main a1db5d7 con un candidato aislado que guarda el resultado de segmentClear en las aristas enteras del grafo de vecinos. Mantiene dirección, radio, actor, ignore, límites, orden y reinicio por época de navegación. No se modifica el runtime.

Fixture integrado: 32 semillas pagadas, ocho trabajadores pagados y cinco especies; crédito y daño preparados exclusivos de QA. Dos pares de calentamiento y ocho pares alternando orden. Todos los pares conservan exactamente la huella de los estados completos después de cada paso, cantidad de pasos y búsquedas.

Mediana de tiempo total: referencia 4222,33 ms; candidato 4447,02 ms (+5,32 %). Mediana del peor tick: 518,86 frente a 483,00 ms (−6,91 %), pero tres de los ocho pares empeoran ese pico. El resultado mixto no acredita una mejora global; se descarta la integración. Dos campañas largas independientes seguían vivas durante la comparación; no había otra prueba/build propios simultáneos. Los tiempos son CPU local y no prueban GPU, FPS, móvil ni RAM.

Reproducción: archivar el commit indicado en una carpeta de referencia y ejecutar `node tools/experiments/neighbor-edge-cache.mjs <referencia> <candidato-nuevo>`. El script crea una copia de fuente/JSON sin duplicar assets binarios, aplica únicamente el candidato y verifica las trayectorias. `results.json` conserva pares y hashes de fuentes; `progress.log.gz` conserva salida original comprimida con mtime cero.
