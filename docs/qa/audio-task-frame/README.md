# Índice de tareas compartido durante la actualización de audio

La actualización principal llama a `AudioSystem.updateFarmActors`: voces de trabajadores, regadera y contactos agrícolas comparten un índice diferido de la FIFO durante esa única llamada síncrona. Antes cada sistema lo construía por separado. En reposo, caminata, suspensión, pausa o resultado se conserva la ruta independiente y sus liberaciones. Los módulos siguen funcionando por separado para otros consumidores.

El índice no se cachea por tiempo simulado ni se conserva entre llamadas. Una orden de UI puede cambiar tareas sin mover el reloj; la siguiente actualización debe leerlas otra vez. Las validaciones de audio que llega después de descodificar siguen consultando las tareas vivas, no el índice del fotograma antiguo. No cambian sonidos, volumen, posiciones, marcadores, límites ni simulación.

Verificación: 431 pruebas de audio correctas y build correcto (10,28 s, advertencia habitual de bundle grande). Ocho pruebas nuevas cubren un solo recorrido compartido, estados sin trabajo, cambios sin avance de reloj, descargas tardías y cuatro clases de trabajador en el primer cultivo de Sabana/Mapungubwe/seed 712 sobre terreno original. Se pagan centro, semilla y jornal, completando riegos/cosecha/entrega físicas. Actualizaciones separadas y compartidas producen exactamente las mismas secuencias de ID/emisor/familia/ganancia y liberaciones; cada actualización conserva la serialización del dominio. Los sonidos son dobles de prueba, no escucha ni descodificación Web Audio.

Diagnóstico: `node tools/bench_audio_task_frame.mjs`, con los mismos módulos de producción para ambas rutas, 100 trabajadores, 1.000 tareas, 100 calentamientos y cuatro lotes ABBA de 500 muestras por estado. La actividad pasa de tres lecturas de FIFO por actualización a una; reposo cero y caminata una en ambas rutas. Ningún cambio de dominio.

| Estado | Mediana separada/compartida | p95 separado/compartido |
| --- | --- | --- |
| Reposo | 0,0357 / 0,0441 ms | 0,0925 / 0,0926 ms |
| Caminata | 0,1506 / 0,1507 ms | 0,2758 / 0,2777 ms |
| Acción agrícola | 0,3948 / 0,2175 ms | 0,7862 / 0,3285 ms |

El coordinador añade un pequeño coste en reposo y no acredita beneficio en caminata. El ahorro se mide en CPU aislada durante actividad; no es FPS ni frametime integrado. Campañas largas concurrentes, sin medida GPU/decodificación/RAM/móvil. Se conservan muestras, resúmenes y hashes de las fuentes comprobadas. CI nueva pendiente; la validación completa de d3dac6d había terminado correctamente antes de publicar este cambio, mientras Windows seguía ejecutándose.
