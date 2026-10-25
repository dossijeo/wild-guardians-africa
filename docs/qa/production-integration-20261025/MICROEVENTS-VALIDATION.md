# Microeventos: validación posterior a la fusión

Estado: en curso, no cerrado. PR159 se fusionó como 568f3b8ef; el menú posterior está publicado hasta 55c17058b. Manglares sigue con helechos holly, LOD y caché 512, sin restaurar hojas redondas.

## Evidencia actual

- 84/84 pruebas funcionales pasan, incluidas proyección, interacción táctil, oclusión por estructuras, origen flotante, liberación y ausencia de mutación de partículas durante el dibujo.
- Catálogo completo: microevents-current/results.json; eventos forzados en fixtures reales, gestos completados sin fallback. No demuestra selección espontánea del director.
- microevents-motion/results.json: termitas, luciérnagas y desprendimientos, 18/36/9 instancias; movimiento real antes del gesto; cero errores o peticiones fallidas. El ensayo de termitas no registró sonido, por lo que no se da por validado su audio.
- microevents-night.json: reloj nocturno aproximadamente 1x durante preparación/evento y vuelve a 5x al cancelar; sin errores, ninguna instancia activa restante. El guardado se retiene artificialmente en esta prueba para comprobar la preparación.
- microevents-current/ground-clearance.json: cuatro tipos sobre una fixture, margen inferior positivo. No demuestra ausencia de clipping en pendientes ni con cualquier cámara.
- Inspección de capturas: pájaros y nubes visibles sobre cultivos; hormigas pequeñas pero distinguibles; luciérnagas contrastan de noche; bruma y hojas siguen discretas. Paneles QA presentes en estas capturas.

## Experimento negativo: fuego

Curvas en lugar de polígonos angulares en las cinco celdas de llama (19–23); el resto del atlas se verificó idéntico píxel a píxel. Variación visual de altura y oscilación sin alterar posiciones, radios ni reglas. Conservó 18 instancias y completó el gesto. Capturas y vídeo: microevents-fire-motion.

La comparación visual sigue mostrando una fila de iconos muy uniforme. No se demuestra una mejora suficiente de integración: se retira el candidato de runtime y atlas, conservando evidencia y la opción de autoría parcial para futuras iteraciones. No se modifica la formación de partículas para ocultar este problema porque también cambiaría las posiciones de interacción.

## Pendientes para cerrar

- Medición GPU pendiente. ABBA CPU/presentación completada: véase abajo.
- Aparición espontánea y finalización en una partida normal, sin flags QA, y salida/reinicio con evento pendiente.
- Movimiento/orbita y oclusión en el renderer real; revisión visual de los restantes tipos del catálogo.
- Decidir si el fuego necesita otra representación visual; no aceptar cambios solo porque funcionen técnicamente.
- Publicar el informe final con límites y no declarar el objetivo completo antes de esas comprobaciones.

## ABBA de presentación y CPU

Intel UHD D3D11, Chrome, calidad media, 1280×720, escena QA congelada, 12 frames de calentamiento y 80 intervalos rAF por brazo; evento seeds, máximo 14 instancias. microevents-performance.json conserva datos y alcance.

| Brazo | Mediana rAF ms | P95 rAF ms | Mediana CPU controlador ms | P95 CPU ms |
|---|---:|---:|---:|---:|
| A sin microeventos | 16.75 | 33.925 | — | — |
| B con evento | 16.64 | 33.410 | 0.300 | 0.605 |
| B con evento | 16.65 | 33.230 | 0.285 | 0.470 |
| A sin microeventos | 16.70 | 33.380 | — | — |

No se observa una regresión clara en esos intervalos; no se afirma mejora, equivalencia estadística ni coste GPU nulo. Muestra corta, un tipo, simulación congelada. El candidato de fuego no interviene en este evento. La instrumentación QA forma parte del coste del controlador observado.
