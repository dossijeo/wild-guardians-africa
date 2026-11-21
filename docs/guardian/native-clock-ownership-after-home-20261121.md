# El reloj del portón después de retirar al último trabajador

La prueba inicial de Home19 dibujó la ausencia del trabajador y conservó el motor. La siguiente publicación incluyó un intervalo histórico autónomo de 19,25 a 19,30 s junto con un reloj nativo pausado y sin segmentos. El consumidor rechazó esa combinación y el drenaje quedó pendiente. [Datos de la frontera gráfica](performance/native-terminal-gate-retention-20261121.json).

La Surface consulta ahora el mismo inventario de cobertura nativa cuando decide si puede preparar un intervalo histórico. Mientras haya un recurso con reloj nativo, sus fotogramas ordinarios salen por la publicación confirmada. El reloj del motor mantiene su cobertura nativa. La selección de intervalos se comprueba por separado de las guardas de cámara.

Seis controles dirigidos ejecutan la selección de la Surface, el reloj, el grupo histórico, el planificador de intervalos y el consumidor. Cubren un motor solo, un trabajador solo, la retirada del último trabajador, la escena puramente histórica, una preparación provisional y el rechazo de un intervalo incompatible. Tres fallaban antes del cambio y los seis pasan después.

En NVIDIA Turing, tras presentar la ausencia mediante el ticket 8, el mismo motor del portón se dibujó durante 681,5 ms y 23 dibujos. El consumidor drenó sin errores. El primer dibujo de la ausencia tuvo un intervalo de 33,3 ms a 30 Hz. El máximo de 37,0 ms ocurrió durante el Home anterior a la retirada. C4 sigue abierto. [Validación física](performance/native-terminal-gate-retention-20261121.json).
