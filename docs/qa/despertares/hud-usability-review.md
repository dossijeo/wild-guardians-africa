# Revisión de usabilidad del HUD de Despertares

La revisión se realizó después de completar las [campañas ampliadas](expanded-campaign-review.md). No cambia la obtención de energía, los beneficios, la economía, la IA, el combate ni los efectos del terreno.

**Primera carga:** se añadió una explicación del guardián cuando el medidor alcanza 100 por primera vez. Describe la elección directa entre cultivo y muralla, advierte de que el cultivo bendecido deja de cosecharse y explica la confirmación y la cancelación. Se integra en la cola y en la memoria del tutorial existente, sin pausar ni consumir energía. Las pruebas dirigidas de tutorial, HUD y traducciones pasaron 56/56; la compilación pasó.

## Problemas y correcciones

- En portrait, el espacio para el medallón reducía los cuatro botones nativos. Se conserva su escala original y se sitúa Despertar bajo ellos, en el espacio disponible junto al diálogo. En las capturas de referencia los botones pasan de 44 a 61,3 píxeles en 320 × 568, de 49,7 a 72,1 en 360 × 640 y de 80,3 a 93,6 en 390 × 844.
- El medallón distingue la recarga de la disponibilidad, muestra el progreso circular y el valor completo, y destaca cuando está listo. El movimiento respeta la preferencia de movimiento reducido. Landscape conserva la distribución superior y los recursos gráficos existentes.
- Las instrucciones de selección y la explicación del objeto seleccionado permanecen visibles durante la interacción. La selección sigue siendo directa sobre el mundo; confirmar o cancelar conserva las reglas de consumo existentes.
- Los avisos urgentes de ataque o pérdida pueden mostrarse con el tutorial únicamente cuando existe espacio comprobado. En ese caso se abrevia su presentación y se conserva el texto completo; los demás avisos esperan su turno en el sistema existente. En landscape compacto se evita que los avisos queden bajo el medidor.
- Se ajustó el margen de la columna en landscape compacto para evitar el recorte del texto inglés y se ampliaron las áreas interactivas pequeñas sin ampliar necesariamente el gráfico.

## Evidencia y alcance

La [comparación antes/después](hud-usability-comparison/index.html) presenta capturas reales sin retocar, tomadas a igual resolución y carga; la escena o el momento del tutorial pueden diferir. Las [capturas posteriores](hud-usability-final-review/) incluyen recarga, disponibilidad, selección de planta y muralla, confirmación, tutorial, avisos, menús y contratación.

Se verifican 320 × 568, 360 × 640, 390 × 844, 768 × 1024, 568 × 320, 844 × 390, 1280 × 592 y 1280 × 720, en español e inglés, además de cambios de orientación, movimiento reducido y un margen inferior simulado de 34 píxeles. La prueba usa la aplicación real con una escena de prueba y energía preparada, además de ratón, teclado y eventos táctiles emulados. Comprueba objetivos de interacción de al menos 44 × 44 píxeles CSS y ausencia de errores de navegador.

Las pruebas dirigidas actuales pasan 54 de 54 y la compilación termina correctamente. Una suite completa ejecutada durante la revisión pasó 5039 pruebas, con 62 omitidas y ningún fallo; empezó antes de los últimos ajustes de presentación de avisos, que se verificaron posteriormente con las pruebas dirigidas y el navegador. La compilación informa del aviso existente sobre tamaño de algunos paquetes.

**Limitación:** no se ha probado un teléfono físico. El tacto y el área segura se emularon en Chrome de escritorio; conviene comprobar en un dispositivo real, especialmente el medallón compacto con área segura inferior grande y la legibilidad de los avisos.
