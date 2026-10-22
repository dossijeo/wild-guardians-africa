# Revisión visual sobre el renderer integrado

Revisión manual parcial; no sustituye las comprobaciones automáticas ni la revisión temporal completa. Capturas reales del benchmark, cámara reiniciada al mismo encuadre tras medir. Main a la izquierda en futuras composiciones, laboratorio a la derecha.

- Sabana, media/día: revisadas media-main-day-0.png y media-lab-day-2.png. El laboratorio mantiene la cubierta de hierba corta reconocible, sombras más definidas y suelo cálido. Main conserva la textura plana sin esa cobertura. El fondo de producción no incluye la misma continuidad lejana. No son imágenes equivalentes para atribuir diferencias de GPU solo al culling.
- Gran Río, media/día: revisadas las mismas dos variantes. Cobertura herbácea más visible, suelo desnudo y caminos más definidos, mayor volumen bajo edificios y agua menos turquesa. Los cultivos pequeños siguen confundiendo parte de su silueta con el fondo; no resolver ese problema reduciendo la cobertura aprobada.
- Manglares: los12encuadres de ribera aprobados son idénticos píxel a píxel antes/después del merge. Inspeccionado manualmente el primer plano diurno. Se conserva tamaño, densidad y contraste de las hojas; el culling reduce triángulos fuera de cámara, no esta cobertura.
- Volcanes: inspeccionada captura poblada integrada media/día, volcanes-visual/volcanes-media-native-day/0000.png. Mantiene relieve de roca/ceniza y contraste cálido de los edificios; lava distante sigue muy brillante. La comparación poblada anterior usa un fondo previo a su alineación, por lo que sus diferencias no se atribuyen automáticamente al merge.

Pendientes: comparativas main/lab restantes de noche y perfiles bajos, inspección específica de sombras y transiciones durante movimiento, validación prolongada de streaming. No declarar completados los biomas ni el objetivo global a partir de estas muestras.

Manglares, comparación main/lab media/día del benchmark: inspeccionadas media-main-day-0.png y media-lab-day-2.png. El laboratorio conserva hojas volumétricas visibles, ribera de musgo, agua azul profunda y sombras que anclan los edificios. Main presenta agua turquesa de borde poligonal y parches de suelo con contorno duro. El suelo cubierto de musgo sigue mostrando repetición a esta distancia; la aprobación de las hojas no significa que todo el bioma esté terminado. No sustituir la variante densa aprobada para ocultar ese patrón.

Manglares media/noche: revisadas media-main-night-1.png y media-lab-night-3.png. El laboratorio suaviza los contornos de suelo desnudo y mantiene las hojas reconocibles; el agua es más oscura y menos saturada. Los cultivos se leen peor que los edificios y la vegetación cercana; registrar como límite de legibilidad nocturna. No se aprecia pérdida del tamaño de hoja aprobado en estas imágenes, pero la cámara general no reemplaza el primer plano de referencia.

Desierto media/día: comparadas media-main-day-0.png y media-lab-day-2.png. Arena con ondulaciones y sombreado fino frente al suelo casi uniforme de main; conserva la paleta cálida y la geometría del relieve. Sombras de edificios más suaves y legibles, tratamiento aprobado que se mantiene. No inferir de esta vista que el aliasing en movimiento o la noche estén resueltos.

Gran Cañón, pareja diurna de benchmark media: el laboratorio conserva estratos cálidos, relieve de roca, orilla marrón integrada y agua azul frente a la superficie más plana y agua turquesa de main. Persisten reflejos repetidos de alto contraste en agua. Esta revisión artística no valida la comparabilidad temporal de media.

Desierto, pareja nocturna media inspeccionada: se conserva el relieve fino y la riqueza de sombras aprobada. No se deduce de esta pareja el cierre de todos los ángulos ni de la transición día/noche.

Streaming: inspeccionados Manglares media noche y baja día al segundo retorno. Se conserva la cobertura de hojas; baja muestra menor densidad propia del perfil existente, sin cambio experimental. De noche persiste el contraste escaso de cultivos. Volcanes media noche al retorno conserva relieve rocoso, ceniza y edificios; la lava distante sigue muy luminosa y repetitiva, pendiente de acabado artístico. Estas observaciones no atribuyen diferencias históricas al merge.
