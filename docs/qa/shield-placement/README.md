# Colocación dentro de escudos activos

El ensayo original de Manglares/Saheliana falló tras 64 noches completas. Su snapshot original se conserva sin cambios en `../intensive-post-jam-b0d19a5/manglares-saheliana-failure/`.

Reconstruyendo el orden de parcelas de la estrategia a partir de los cultivos históricos, el siguiente punto era `(60, -12)` al inicio del día 65. El único obstáculo solapado era un escudo con 1,9 segundos restantes. Antes de la corrección, la colocación devolvía «La construcción solapa otro edificio» y `Game.plant` lanzaba ese error sin modificar el estado.

Los tres validadores de colocación ahora excluyen escudos de las colisiones con edificios. La navegación sigue bloqueándolos para bestias y permitiéndolos para trabajadores. No cambian terreno, costes, crecimiento ni estrategia del ensayo.

72 pruebas dirigidas pasan: snapshot nativo fallido, cobro de semilla y tarea inicial FIFO, guardado/carga, navegación del escudo, restricciones de edificios y vegetación, agua/lava, centros, murallas y colocación de magias. Las comprobaciones categóricas adicionales usan terreno plano controlado; la reproducción principal usa el terreno nativo del snapshot. Compilación Vite correcta; permanece el aviso de bundle grande.

Esta evidencia prueba la corrección del comando que falló, no una campaña completa de 100 noches ni rendimiento móvil.
