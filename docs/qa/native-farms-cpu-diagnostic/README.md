# Perfil CPU nativo de cuatro fincas

Base `112a53c8`, producción sin cambios. El comando completo y hashes de los cuatro archivos comprimidos están en `manifest.json`. Dos mundos con el mismo código actual continúan cada una de las cuatro victorias archivadas usadas por el ensayo de altura: contratación pagada, terreno nativo, 350 ticks por mundo. Coinciden los 36 checkpoints y eventos/rutas. No es una campaña nueva de cien noches ni reproduce el estado de la campaña viva de Gran Cañón.

`profile.cpuprofile.gz` contiene el perfil V8 completo. `tick-summary.json.gz` conserva únicamente muestras cuya pila incluye `Game.tick` o `tickScoped`; el analizador reproducible está en `tools/summarize_simulation_cpu_profile.mjs`. Se excluyen preparación, imports y serialización de checkpoints. GC sin ancestro tick queda excluido también. Esta separación es por pila, no por ventanas temporales: tiempos muestreados, profiler y planificación de procesos impiden tratarla como atribución exacta de CPU o benchmark comparativo.

20.388 muestras retenidas, aproximadamente 22,52 segundos muestreados. Principales tiempos propios dentro de ticks:

| Función | Tiempo propio muestreado |
| --- | ---: |
| TerrainField.lattice | 5306 ms |
| workerEntityLookup (closure) | 2126 ms |
| findPathSteps | 1103 ms |
| updateWorkers | 1019 ms |
| fluidInside | 1013 ms |
| reserveTasks | 962 ms |
| segmentClear | 794 ms |

No sumar estos tiempos como coste inclusivo de navegación ni interpretar la variación entre brazos idénticos como mejora. Incluye arranque frío y estado estable, sin desglose por finca; no mide render, GPU, FPS, RAM ni móvil. Las campañas CPU 43808 y 49032 seguían vivas durante la captura.

La serialización domina el perfil completo, pero es verificación externa al tick en este runner. No justifica cambiar el guardado del juego a partir de este ensayo. Sí aparece un coste relevante de búsquedas de entidades: el siguiente piloto debe instrumentar reconstrucciones de índices y mutaciones de las colecciones para distinguirlas de consultas, conservando FIFO y referencias vivas. Las cachés/filtros de terreno anteriores siguen rechazados; este perfil no los rehabilita ni demuestra todavía una solución.

Para reproducir el análisis, descomprimir el perfil y ejecutar:

```powershell
node tools/summarize_simulation_cpu_profile.mjs <perfil.cpuprofile> <resumen.json>
```

No cambia producción; no se repite la suite completa por añadir esta evidencia diagnóstica.
