# Reintento de admisión de bendiciones

Las partículas de bendición permanecen ocultas hasta que el servicio gráfico admite su material. Si esa preparación falla transitoriamente, la presentación conserva la fuente confirmada y vuelve a solicitarla tras un intervalo de un segundo, sin esperar una modificación del estado de juego ni lanzar una nueva petición en cada fotograma. La simulación sigue siendo la única autoridad y retirar la fuente evita más reintentos.

Las pruebas usan admisión simulada: comprueban fallo, espera, reintento compartido y publicación solo tras éxito. También se ejecutaron las pruebas de guardián y del flujo confirmado. Quedan pendientes el fallo real del dispositivo y la primera aparición en una partida WebGPU; el intervalo limita los reintentos, no garantiza ausencia de tirones en el Worker gráfico.
