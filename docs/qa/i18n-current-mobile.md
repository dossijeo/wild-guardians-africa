# Interfaz inglesa actual en tamaños de móvil

Recorrido sobre `667d4bf`, mediante `tests/browser/mobile-first-day.html`: menú original, selector original y app real en Gran cañón/Mapungubwe. Se elige English en Opciones mediante su selector, se vuelve con la animación inversa, se inicia desde los dos pasos del selector y se coloca el centro y el mijo señalados por las manos. No se fabrican mensajes del menú ni se invocan comandos de simulación para estas acciones. El fixture conserva la instrumentación de presentación y las partidas en memoria; el audio está silenciado. No es una prueba de teléfono físico.

`i18n-current-mobile.json` conserva las mediciones y el diagnóstico terminal. Las cuatro capturas `i18n-current-portrait.png`, `i18n-current-landscape.png`, `i18n-current-hiring-portrait.png` y `i18n-current-hiring-landscape.png` muestran el tutorial y la contratación reales en 390×844 y 844×390.

- El tutorial de plantación contiene ahora **Grow crops**, igual que el botón. El texto cabe en vertical; la guía cambia del HUD al suelo cuando se elige la herramienta.
- El siguiente texto de contratación cabe en horizontal y termina antes de toda la columna de acciones: borde derecho 674,98 frente a inicio de botones 702,89. Las mediciones son muestras de la presentación animada, no límites estáticos de toda animación.
- Las ocho semillas aparecen traducidas en orden 5, 6, 8, 10, 12, 18, 100, 150.
- La contratación se abre automáticamente después de dejar de plantar; no incluye botón de cerrar. Explicaciones completas, nombres, ARIA y jornales 30/40 están en inglés. La modal y confirmar caben en ambas orientaciones.
- Tras desplazarse para leer las reglas en horizontal, el scroll permanece en 90,4 durante posteriores actualizaciones de interfaz. El cambio de orientación adapta el layout; no se afirma conservación de ese scroll entre orientaciones.
- La trabajadora joven se contrata por 40: 1500 → 700 por centro → 695 por mijo → 655 por contratación. Llega físicamente al brote y completa el primer riego; después se observa crecimiento 23,5626, agua inicial `manual` y ninguna pausa.
- Guardar y volver al menú deja un slot aislado, cero mundos, cero voces del audio de gameplay, contexto WebGL perdido, worker terminado y cero listeners del canvas. Los contadores de disposal no son bytes de memoria GPU. No hay excepciones ni warnings/errors en la consulta de consola.

La actualización del catálogo provocó una recarga de desarrollo durante el primer intento; este informe y sus capturas corresponden al recorrido posterior completo con el catálogo nuevo. Se restaura el idioma previo de la prueba y el viewport al cerrar. No se certifican aquí todas las pantallas inglesas, los cinco avisos agrícolas en partida, toda una jornada/noches ni el rendimiento móvil.

Validación de la corrección: 12/12 pruebas de idiomas, build Vite y paquete web aprobados: 580 archivos, 406794261 bytes, 816 referencias relativas y veinte GLB runtime.
