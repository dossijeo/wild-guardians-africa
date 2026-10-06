# Precarga GPU con la receta de pantalla

La precarga real de WorldScene deja de dibujar los animales en un render target auxiliar de 16 × 16. Ahora envía el render con el destino normal y un viewport/scissor vacío, sin limpiar el framebuffer. Esto conserva la receta de salida de pantalla. La captura nativa de profundidad sigue preparando su propio pase. Antes de marcar `animalGpuReady`, se espera una fence WebGL mediante consultas de timeout cero y cesiones de frame.

La restauración del viewport, scissor y autoClear ocurre sincrónicamente, incluso si falla el draw. El render target no se cambia. La espera rechaza cancelación, pérdida de contexto, timeout o fallo de fence y libera la fence en finally. Los rigs y primers mantienen su limpieza existente.

## Evidencia en WorldScene real

- `canyon-five-species.json`: Gran Cañón, seed 712, centro de trabajo pagado, aparición controlada de las cinco especies. Resultado ok, siete descargas de GLB antes y después, ningún programa nuevo de materiales de animales, GPU preparada y errores vacíos. La carga de esta muestra tarda 7787,7 ms; no es una comparación antes/después ni una garantía de frametime móvil.
- `canyon-warthog-contact.json`: centro y cultivo pagados, incursión controlada de facóquero. A los 399 pasos de 0,05 s se registra AnimalLogicalHit sobre el cultivo. Su mesh está presente, visible y su bounding box intersecta el frustum. No hay programas nuevos de animales ni errores. Esto no prueba por sí solo ausencia de oclusión: en la captura de contacto una roca tapa parte del animal.
- Ambos archivos de consola están vacíos. Las capturas acompañan a los informes.

Veintiún tests focalizados pasan para la preparación, rigs, primers, cancelación de carga, restauración de estado y espera no bloqueante. La prueba aislada de worker/texturas sigue separada: no se incorpora al cargador del juego en este cambio.

## Repetición en los seis biomas

`six-biomes-summary.json` reúne Gran Cañón, Volcanes, Manglares, Sabana, Gran Río y Desierto en el commit de runtime 28f2cc9. Todos pasan: cinco rigs preparados por bioma, siete descargas antes y después de aparecer, ningún programa nuevo de animales y ninguna entrada de consola de aviso/error. Cada bioma incluye informe crudo y captura.

Esta ampliación usa seed 712, cultura Mapungubwe y calidad media. La suite completa local seguía ejecutándose en paralelo, por lo que los tiempos no se presentan como una comparación de rendimiento aislada. El resultado prueba la primera aparición controlada en estos seis mundos, no las combinaciones de todas las culturas/calidades ni campañas naturales. El primer contacto simulado se comprueba únicamente con el facóquero en Gran Cañón.

Pendiente: móvil físico; otras culturas/calidades; comparación cuantitativa antes/después del primer ataque; presupuesto de espera bajo carga; primera instancia adicional de una especie después de consumir su rig de reserva. No se declara la optimización de precarga completa por estas pruebas.
