# Murallas que cruzan el borde del centro

La CI 37232277591 de `19653be` terminó con cinco fallos en `centers.test.js`: las cinco culturas aún exigían una excepción al colocar una muralla parcialmente dentro del centro. Esa expectativa contradice la revisión del jugador, que permite el cruce parcial y pide omitir silenciosamente solo las piezas completamente interiores.

La prueba conserva la geometría de cada GLB original, escala 1, rotación 0,73, límites físicos, rutas de servicio y entrega pagada. En un snapshot independiente comprueba ahora la construcción y el cobro de una pieza que cruza el borde, y la ausencia de cambios y cobros al intentar colocar otra completamente dentro. Así la muralla de prueba no altera la ruta ni el saldo de la entrega que sigue comprobándose en la partida original.

`node --test tests/centers.test.js tests/wall-gesture-budget.test.js tests/wall-placement-native.test.js`: 23/23 aprobadas, sin fallos. Incluye cinco culturas, límite por dinero y reserva laboral, liberación/cancelación del puntero, reembolso y colocación nativa en seis biomas. Este resultado dirigido no acredita la nueva CI completa ni un gesto en teléfono físico.
