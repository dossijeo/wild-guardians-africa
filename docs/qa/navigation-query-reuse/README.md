# Reutilización de rutas exactas dentro de un paso de simulación

Referencia congelada: main 2f07bee. Al asignar una tarea y empezar a caminar se repetían algunas consultas completas de navegación. Ahora se reutilizan las respuestas exitosas de consultas exactamente iguales durante una única llamada síncrona a `tick`.

La clave conserva origen, destino, radio, permiso de trabajador, obstáculo ignorado y margen. Cada consumidor recibe puntos independientes, incluidos los del primer resultado guardado. Los cambios de época invalidan inmediatamente las respuestas. Los fallos y las rutas preparadas de incursiones mantienen sus reglas y precedencia anteriores.

El ámbito vive en un WeakMap por identidad del navegador y se libera en finally, también ante errores. Los navegadores de previsualización y desvíos dinámicos no heredan sus respuestas. No modifica el estado persistente, no dura entre ticks ni cambia la selección de tareas. Límite transitorio: 128 rutas / 20000 puntos; las respuestas mayores no se guardan. Las entradas se crean solo cuando hay una ruta exitosa.

## Evidencia

- 28 pruebas dirigidas aprobadas; 329 pruebas ampliadas de navegación, puertas, agua/lava, murallas, actores, trabajadores y tareas aprobadas.
- Escenario integrado de terreno nativo Sabana/Mapungubwe: 32 plantas y ocho trabajadores pagados, cinco animales, crédito QA explícito y daño preparado. Ambos completan 1630 pasos y comparten el hash de toda la trayectoria serializada `9ea59d5816db79085aafff2ec796d4322ab680afde6209555befa8d0baf0fd54`; búsquedas completas 161 → 146. Los picos aún rondan medio segundo: no se atribuye una mejora estable de frametime a esta medida.
- Seis incursiones en fincas pobladas reales: 600 pasos por bioma comparados contra la referencia. Los trabajadores de estos snapshots están en casa, así que estos casos prueban principalmente la continuidad nocturna; no acreditan por sí solos reservas diurnas.
- Seis jornadas iniciales adicionales: ocho plantas y dos trabajadores contratados pagando desde el saldo inicial, 2000 pasos de 0.05 s por bioma, sin incursión programada para aislar tareas. Estado serializado completo idéntico en cada paso. Se comprueba riego físico inicial: ocho plantas en Sabana, Gran Río, Manglares, Volcanes y Desierto; dos en Gran Cañón dentro de los 100 segundos observados. No se afirma que todas las plantas del cañón sean accesibles ni que hayan sido regadas. Consultas diurnas: 23→21, 23→21, 27→25, 23→21, 120→118 y 25→23 respectivamente. Estas jornadas usan Mapungubwe; no acreditan las treinta combinaciones de culturas y biomas.
- Benchmark aislado: once consultas de rutas nativas de la traza de estrés repetidas dos veces por ámbito; diez muestras tras tres calentamientos, orden alternado, todas las rutas devueltas idénticas. 286→143 búsquedas; mediana 88.55→45.47 ms para esa carga deliberadamente repetida. No representa el patrón de un fotograma real ni implica esa ganancia porcentual de FPS.
- Build y paquete web aprobados: 586 archivos, 388057027 bytes, 859 enlaces relativos y veinte GLB de runtime.

## Reproducción

`node tools/check_navigation_query_reuse.mjs <directorio-referencia-congelado>` y `node tools/benchmark_navigation_query_reuse.mjs <directorio-referencia-congelado>`. La referencia contiene src y content de 2f07bee, public/content, herramientas de apertura/carga integrada y package.json con type module. `reference.json` identifica sus archivos relevantes; no se genera una referencia copiando src ya modificado sin recuperar esos dos archivos del commit original.

Las pruebas de límites cubren copias mutables, dirección, coordenadas fraccionarias sin redondeo, radios, permisos, márgenes, fallos, anidamiento, interrupción, épocas de cultivos/estructuras y separación de navegadores derivados.

## Pendiente

Las búsquedas únicas caras aún son síncronas. Falta repartir ese trabajo sin alterar FIFO ni permitir riego, contacto o cosecha antes de la llegada física. Esta optimización elimina consultas redundantes; no acredita la resolución de los tirones de incursión, renderizado en móvil, campañas completas ni estabilidad final del proyecto. CI debe verificarse en el commit publicado.
