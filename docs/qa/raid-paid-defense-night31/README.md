# Bloqueo de la incursión de la noche 31

La campaña intensiva pagada con defensas cargada desde `b0d19a5` terminó con error tras 30 noches completas. En la noche 31 un facóquero y una hiena conservaban golpes pendientes, detenidos junto a murallas intactas y tres trabajadores incapacitados. El día quedó retenido correctamente hasta que terminase la incursión, pero el desvío local entre cuerpos no encontró salida.

Se conservan el [estado original](failure-state.json.gz), [observaciones de cultivos](lifecycle.json.gz), [procedencia y error](status.json) y [hashes de los archivos sin comprimir](archive.json). Ambos gzip se comprobaron mediante recuperación exacta. No hay informe de éxito ni se acredita completar 100 noches.

## Corrección y validación

Tras fallar el grafo local, se busca un desvío usando las colisiones nativas del terreno, murallas y cuerpos. La búsqueda tiene cachés privadas y avanza como máximo ocho celdas por paso de simulación, conservando el mismo algoritmo A* que la ruta síncrona. Mientras continúa no se reconstruye el grafo local que ya falló. Las posiciones se congelan para cada búsqueda y el resultado se comprueba de nuevo contra los cuerpos actuales antes de aplicarlo.

Un fallo con cuerpos inmóviles queda almacenado hasta que cambian sus coordenadas exactas o el terreno. Una búsqueda pendiente tolera cambios pequeños para poder avanzar, pero no almacena como definitivo un fallo obtenido con cuerpos que ya se habían movido. No se teletransportan actores, eliminan trabajadores caídos, alteran velocidades ni consumen golpes para desatascarlos.

[Pruebas dirigidas](motion-tests.txt): **77/77** aprobadas, sin cancelaciones ni omisiones; [fuentes comprobadas](verified-sources.json). Incluyen la reproducción completa del estado nativo, guardado/carga durante el desvío, separación de animales, segmentos válidos contra terreno y trabajadores caídos, salida por sus destinos originales, amanecer y contratación, con contabilidad y murallas conservadas. También comprueban invalidación de fallos, movimiento inferior a 0,25 m y equivalencia de rutas síncronas/incrementales.

La [comparativa de diez segundos](ten-second-comparison.json) conserva el diagnóstico antes/después. La solución síncrona inicial se descartó por un pico superior a un segundo. El diagnóstico incremental conserva un primer paso frío cercano a medio segundo al reconstruir rutas de carga, presente también antes de la corrección. El límite de ocho celdas reduce el trabajo indivisible nuevo, pero no garantiza por sí solo un tiempo de fotograma en móvil ni elimina otros costes de navegación: esa optimización sigue pendiente.

Pendientes: repetir la campaña intensiva con defensas hasta las 100 noches sobre estas fuentes, repetir la batería general congelada y verificar presentación/rendimiento en navegador. Resolver esta incursión concreta no prueba esos requisitos completos.
