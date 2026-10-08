# Aislamiento de categorías con baseline corregido

Fuente 2bd9235, misma pose nocturna elevada de Sabana/Mapungubwe/media (baobab 220 m). La máscara QA respeta owner.enabled/adapter.enabled: A1 y A2 mantienen 53.762 triángulos y 14 llamadas en sus 120 muestras respectivas. Cámara y estado exactos; 480 queries válidas, disjoint 0 y GL/errores 0 en cada ABBA. Se mantienen las dos campañas CPU históricas de fondo y ninguna otra escena GPU/build/benchmark raíz durante esta serie.

GPU mediana en ms (A1 → B1 → B2 → A2):

- Sin billboards: 4,585755 → 10,841198 → 9,772395 → 4,213437. B: 90.796 triángulos / 15 llamadas.
- Sin puente 3D: 4,161041 → 5,830677 → 6,010521 → 4,162760. B: 74.003 / 15.
- Todas las capas: 4,244765 → 11,192031 → 10,680364 → 3,909922. B: 93.478 / 19.

Los contadores de preparación/packing/bancos permanecen iguales entre los tres informes terminales (incluidos en summary.json). Los percentiles/medias de llamadas y triángulos son constantes dentro de cada lote. No obstante no se capturó la identidad de cada envío de sombra por muestra: esos contadores no demuestran por sí solos una equivalencia íntegra de pases/materiales.

El control sin puente reduce el coste local, pero no es una solución: dejaría huecos al retirar la representación 3D de una transición que aún la necesita. Quitar billboards cambia la cobertura y posibles oclusiones; las diferencias no son costes aditivos independientes. La deriva entre ensayos y lotes impide atribuir todos los ms a un componente único. Esta evidencia solo orienta la siguiente investigación de selección/LOD/shader del puente. No activa gameplay ni acepta visuales/FPS.

Las muestras originales están comprimidas sin eliminar detalle. Los controles anteriores con máscara incorrecta están separados en far-category-baseline-invalid; no se usan en este análisis.
