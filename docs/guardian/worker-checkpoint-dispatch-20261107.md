# Despacho durante un checkpoint gráfico

El host ya no detiene automáticamente la autoridad por tener una candidatura
de checkpoint gráfico pendiente. Las publicaciones posteriores y sus cambios
de terreno se añaden al diario en orden mientras haya capacidad; el receptor
gráfico sigue aplicando el checkpoint en su secuencia exacta. Al confirmarse la
candidatura se conservan las entradas posteriores. Si se rechaza, se mantiene
la base anterior y sus eventos. Una nueva solicitud de checkpoint sigue esperando
a que termine la anterior.

Para evitar llenar el diario mientras falta el acuse, el despacho vuelve a
detenerse antes del límite: deja una entrada de margen y reserva un 25 % del
umbral de bytes. Las barreras de saturación, fallos de recuperación y presión
de terreno continúan activas. Un recurso que no responda o una publicación
excepcionalmente grande todavía puede detener la simulación; no se garantiza
avance ilimitado sin un consumidor o almacenamiento disponibles.

Las pruebas retienen el acuse, envían eventos y terreno posteriores y comprueban
confirmación, rechazo y presión del diario. Otra prueba usa el host y Wild
Engine reales con un canal gráfico simulado y verifica que transcurre tiempo de
simulación y que un comando de pausa termina antes del acuse. Pasan también los
contratos de recuperación y runtime.
Falta validar el ciclo con Workers gráficos y WebGPU reales y medir latencias,
uso de memoria y tiempos de fotograma; no se afirma una mejora global.
