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

- Mediciones residentes CPU/GPU/presentación completadas con sus límites: véase abajo.
- Aparición espontánea y salida al menú verificadas; finalización natural verificada en la prueba de cámara; reinicio posterior todavía pendiente.
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

## GPU residente y límites de la partida normal

measure-microevents-resident-gpu.mjs mide drawWorldFrame completo mediante EXT_disjoint_timer_query_webgl2: 30 frames de calentamiento y 120 consultas por brazo, sin disjoint. Escena congelada con raincloud; se alterna únicamente la visibilidad de su mesh (el controlador permanece). GPU media A/B/B/A: 16.365 / 16.743 / 16.040 / 18.174 ms. Deriva mayor que el efecto aparente; no se demuestra diferencia consistente. Esto no sustituye streaming/simulación activa ni cuantifica un coste aislado preciso. microevents-gpu.json conserva todas las muestras.

Prueba normal por menú, sin URL QA ni force: el primer observador no correspondía al módulo Vite versionado (observer-missing.json, ensayo inválido). Corregido usando la URL real del módulo cargado. La partida nueva bloqueó eventos durante tutorial (tutorial-blocked.json). La fixture nocturna bloqueó durante incursión/tutorial y después quedó sin cultivos visibles (no-visible-crops.json). Son exclusiones esperadas; ninguna prueba se cuenta como aparición espontánea. La siguiente iteración planta mediante la interfaz normal, sin modificar reglas ni el director.

La última corrida normal no cerró el ciclo: el selector de cultivo apuntaba al control heredado oculto (#plant-action), no al HUD nativo. Se corrige a [data-menu="grow"], pendiente de ejecutar. El timeout se conserva en microevents-normal/report.json; no se atribuye al runtime.

Inspección adicional: mariposas, hierbas y desprendimientos visibles en las capturas del catálogo; mariposas poco contrastadas contra suelo dorado, pendiente de ajuste. Prueba normal: before-dawn.json conserva el intento de cultivar de noche y hiring-gate.json el bloqueo correcto en contratación. La automatización ahora espera condiciones de plantación y confirma contratación mediante su botón normal, sin saltarse las reglas.

## Aparición espontánea y salida: PASS

check-microevents-normal-lifecycle.mjs carga la fixture guardada desde Continuar, sin parámetros QA, sin force ni alteraciones del director. Espera la incursión y tutorial, confirma contratación normal al amanecer y planta tres cultivos mediante el HUD. El día 2 a tiempo 18.21 aparece **pollen** espontáneamente: tres anclajes válidos, 19 instancias, captura spawn.png inspeccionada sin controles QA. La instrumentación solo observa tick desde la URL exacta del módulo Vite, no cambia el mundo. La selección de partida guardada se prepara en localStorage y se declara explícitamente; no es una prueba del paquete compilado.

Al salir mediante menú: disposed=true, active=null, pending=false, attached=false; cero errores. Informe microevents-normal/report.json. Los informes before-dawn y hiring-gate documentan problemas de automatización/exclusiones anteriores, no regresiones del juego. No se deduce de este caso la correcta aparición de todos los tipos ni la finalización natural: esas comprobaciones mantienen su alcance propio.

## Cámara y expiración: PASS

microevents-camera/report.json y camera.webm: arrastre real con botón derecho y rueda, 13 hojas ancladas, deriva mundial cero durante órbita y zoom con partículas congeladas. Capturas inicial/orbit inspeccionadas. Tras descongelar: movimiento y expiración natural, outcome ignored, cero instancias. La deriva posterior 0.149 pertenece al movimiento reanudado, no al desplazamiento de cámara. No demuestra ausencia de clipping en todas las pendientes ni sustituye la prueba de oclusión por estructuras.

## Mariposas: contraste aceptado

Alas de ocre claro a naranja cálido; mantiene geometría, tamaño, cuatro frames, animación y física. Captura real microevents-butterfly/butterflies.png inspeccionada frente a microevents-current/butterflies.png; gesto completado sin fallback, nueve instancias, cero errores. Se conserva por mayor legibilidad sobre Sabana sin nuevas operaciones GPU.

Verificación RGBA de las 64 celdas: solo cambian 8,9,10,11. La autoría parcial vía canvas cambia también RGB bajo alfa cero; esos datos ajenos fueron restaurados desde el atlas original al integrar las cuatro celdas. Corrección metodológica: la comprobación anterior del fuego usaba getbbox RGBA, que no detectaba todas las diferencias RGB con alfa idéntico; no sustentaba identidad de todos los canales. Aquel candidato fue descartado y restaurado íntegramente antes de este cambio.
