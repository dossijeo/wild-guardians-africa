# Manglares: dirección artística aprobada por el usuario

2026-10-23, código actual cb9ce9a27. El usuario aprueba explícitamente la versión actual: «artísticamente es justo la dirección deseada», «no necesito que se parezca más al mockup» y la considera más bonita que la referencia. Queda pendiente validar rendimiento.

La variante aprobada es la receta nativa experimental `mangroveFerns=holly`, incluyendo las coronas iluminadas del commit e612c37df, la masa y escala actuales, el aclarado parcial tras el ajuste oscuro, la reducción gradual de densidad del 30 % únicamente en los bordes, sombras y agua azul profunda. Referencia visual registrada: holly-fern-sunlit-review-20261023/mockup-side-by-side.jpg. La aprobación se refiere al resultado visual actual, no a la demostración de un presupuesto de rendimiento ni a todas las variantes históricas.

Criterio actualizado: no perseguir mayor equivalencia con el mockup, ni cambiar siluetas, color o densidad para resolver diferencias artísticas que el usuario ya ha aceptado. Preservar esta apariencia en cualquier optimización. Mantener disponible la variante anterior de hojas redondas; no confundirla con el helecho aprobado actual.

Pendiente: benchmark de la receta nativa exacta con la iluminación actual, producción instanceCulling, sombras reales y fondo completo; separar CPU de preparación/render, GPU y frametime, con repeticiones y estado comparable en Intel UHD. Los costes históricos de variantes anteriores no certifican esta combinación. Si se optimiza, demostrar conservación visual con capturas antes/después, incluyendo noche y movimiento. La aprobación artística no autoriza fusionar main ni implica cierre del experimento global.
