# Murallas sobre agua y lava

Se amplía `tests/browser/wall-stroke-guide.html` con `?mode=fluid&biome=…`. Busca un punto de fluido real próximo al centro, conserva la semilla 712 y Mapungubwe, paga el centro con el saldo inicial 1500 y utiliza el trazado y renderizado de producción. No altera alturas, terrenos, costes, límites ni modelos. La búsqueda y medición de cajas son herramientas de esta página de QA, fuera del juego distribuido.

En Gran río, Volcanes, Gran cañón y Manglares se observan dos puntos de guía antes de construir, cuatro piezas después de soltar y saldo 700 → 660. La guía desaparece tras construir. No aparece una confirmación intermedia. Las capturas y datos están en `mobile-first-day/walls-fluid-{gran-rio,volcanes,gran-canon,manglares}.{png,json}`.

Los datos miden la superficie real, el nivel del fluido, el anclaje del mesh y su extremo superior. Las piezas mojadas permanecen ancladas al suelo; su parte superior queda por encima del agua o lava. Las vistas de Gran río y Volcanes muestran claramente el cruce; en Manglares parte de la muralla queda detrás de vegetación. No se introduce una elevación artificial de toda la muralla a la superficie del agua.

Son gestos preparados mediante controles de QA para inspeccionar la guía y la colocación nativas, no gestos en un teléfono físico ni un recorrido completo del HUD. La prueba separada de arrastre real de ratón y la captura `wall-drag-runtime-desktop.png` documentan la liberación inmediata en el juego. Las 23 pruebas de centros, presupuesto y colocación nativa pasan con la revisión vigente; las restricciones de cultivos y centros permanecen comprobadas por separado.
