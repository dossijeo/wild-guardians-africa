# Revisión visual directa: Sabana, Gran Río y Gran Cañón

Se inspeccionaron las parejas diurnas de vista 0000 en la galería main-current. El generador volvió a verificar 36 parejas, cámara/objetivo/hora/origen/elapsed/trabajadores y SHA256 de 72 imágenes sin renderizar ni modificar píxeles. Esta verificación de archivos no sustituye la inspección visual: aquí se juzgan únicamente las tres parejas indicadas.

La referencia es main histórico b2497b0695218652672c805c40971ea830686e3a, no origin/main actual. Las imágenes son de calidad media, 720p y simulación pausada. No sirven para comparar rendimiento ni certificar los seis biomas completos.

| Bioma | Mejora observada | Limitación visible / siguiente comprobación |
| --- | --- | --- |
| Sabana | La capa de fibras emerge del suelo en primer plano y derecha; las sombras anclan edificios y árboles. Mantiene la paleta seca cálida y el área del poblado despejada. | La vista aún combina suelo plano con cobertura; no implica por sí sola un defecto, porque las zonas despejadas son necesarias. La continuidad y aparición del LOD requieren movimiento. |
| Gran Río | Cobertura verde con volumen colectivo; caminos más distinguibles y sombras que separan las construcciones. Las siluetas de los edificios se conservan visualmente en esta pareja. | La ribera queda al fondo y no permite valorar su unión cercana con vegetación y agua. No aumentar densidad ni oscurecer más sin esa evidencia. |
| Gran Cañón | Paredes con estratificación y detalle; ribera de transición suave; agua menos turquesa y sombras mucho más legibles que la referencia plana. | En el pie de pared derecho queda una transición amplia de sombreado, y el reflejo se repite hacia el fondo. Revisar comportamiento temporal antes de modificar: esta captura no demuestra un fallo de normales ni de geometría. |

Recomendación: conservar las tres direcciones actuales. No retocar materiales aprobados para producir una nueva diferencia estática. El siguiente control artístico útil es revisar el paso hacia impostores/montañas y la ribera durante una secuencia de cámara con fondos completos, aprovechando las secuencias existentes antes de generar nuevas. La corrección de residencia nativa ya permite continuar esa validación nocturna sin confundir pérdida de datos de navegación con una mejora visual.

[Galería completa](main-current-gallery.html). Los controles de streaming posteriores validan otros aspectos; sus capturas finales avanzan el reloj y no reemplazan estas parejas de hora fija.
