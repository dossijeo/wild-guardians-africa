# Traza nativa de profundidad — 6 de octubre

Base 72e105f; Volcanes/Mapungubwe, seed 712, calidad media, 25 chunks, centro/brote/contratación pagados. Estado pausado y reloj/cultivo en cero. Secuencia N1/N2/G/B1/B2/N3 con observación de los dibujos de profundidad.

A 1280×720 los siete pares coinciden en profundidad. Tras aumentar el framebuffer a 1600×900, G/B1, N2/B1 y B2/N3 difieren en los mismos tres píxeles del contraejemplo: (635,790), (633,791), (631,792), origen GL inferior izquierdo. El canal azul pasa de 146/152/158 a 185/192/199. B1/B2 coincide en profundidad y en las 67 filas observadas: orden, objetos, programas, rangos, versiones de atributos/instancias, matrices y mapas. N1/N2 y N2/N3 también coinciden en profundidad y traza. Esto no prueba igualdad de los bytes de buffers ni de todos los uniformes, ni atribuye la discrepancia al shader.

Una recarga independiente válida a 1600×900 repite estos resultados. Entre ambas muestras hubo un intento de precarga fallido por `GPU preload timed out`, con warning de ANGLE sobre environment4. Se conservan el fallo y el historial acumulativo de consola, que incluye mensajes de páginas anteriores dentro de la misma pestaña. No se declara consola limpia. El reintento pasó después de que el subagente detuviese su suite paralela; no se demuestra causalidad entre saturación y timeout.

El selector only-props permite especializar 18 materiales, pero los 67 dibujos siguen exactamente iguales en los siete pares. La selección no modificó dibujos visibles en esta vista: sus cero píxeles distintos NO descartan los props como causa ni acreditan equivalencia general. Las preparaciones y el estado lógico están en los informes completos comprimidos.

El color sigue variando incluso entre controles nativos. No hay prueba de equivalencia visual, CPU/GPU/FPS, móvil, noche o colapso. Alpha especializado continúa desactivado en producción. Siguiente paso: localizar el objeto y la cobertura de esos tres píxeles, comparando la receta original y de profundidad con datos completos. No elevar tolerancias para aceptar el resultado.
