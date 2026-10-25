# Revisión del estado gráfico actual — 25 octubre

Esta revisión utiliza las seis capturas reales de calidad alta del inventario
reciente de carga, a 1280×720 con HUD. No son nuevos renders, comparaciones
píxel a píxel contra main ni benchmarks GPU. `references.json` conserva las
URLs efectivas, los informes y las huellas de las imágenes inspeccionadas.

## Receta que debe conservarse

El informe histórico closure-review-20261022 sigue siendo útil para sus criterios,
pero su descripción de hojas cupped no representa la selección actual de Manglares.
El harness actual añade `mangroveFerns=holly&groundCache=fixed512` a la receta
histórica, manteniendo los fondos completos. Usar las URLs registradas para
reproducir estas imágenes; no volver a la receta histórica sola como referencia
final. Preservar la aprobación posterior de helechos y LOD, el suelo verde con
barro localizado y la caché fija. La imagen deliberadamente cubierta de barro
utilizada para invalidación no es la dirección artística seleccionada.

`ground-shadow-fill` consta integrado en GLOBAL-DIRECTION.md. La consulta de
procesos de esta revisión no encontró un ejecutor activo de ese experimento ni
del harness de carga. No hay una medición interrumpida que deba reiniciarse.

## Inspección de las seis imágenes

| Bioma | Observación directa en esta vista | Lo que esta captura no demuestra |
| --- | --- | --- |
| Sabana | Hierba continua legible en primer plano, zonas de poblado despejadas y sombras cálidas. | Transición de cobertura en movimiento y horizonte fuera del encuadre. |
| Gran Río | Masa herbácea verde, caminos legibles y vegetación separada del suelo por sombras. | Ribera cercana: el agua aparece solo al fondo. |
| Manglares | Helechos densos distinguibles, suelo verde y manchas locales de barro; no aparece el fallo de barro generalizado. | Equivalencia nocturna y estabilidad del LOD durante movimiento. |
| Desierto | Ondulaciones y relieve mesoscópico visibles, paleta cálida y sombras conservadas. | No reabrir el tratamiento aprobado por preferencias nuevas. |
| Volcanes | Roca oscura, ceniza y lava legibles; se conserva la selección existente. | Animación de lava y continuidad lejana durante streaming. |
| Gran Cañón | Estratos, ribera suave y sombra de pared distinguen claramente superficies. | Repetición de reflejos y cambios de cámara requieren secuencia temporal. |

Los seis encuadres tienen suelo detrás de los objetos visibles; esto no certifica
la cobertura de impostores fuera del encuadre ni durante desplazamientos.
El HUD oculta parte del margen derecho y las vistas no incluyen suficiente cielo
para cerrar la valoración de skyboxes. No se declara ningún bioma terminado.

## Próximo control concreto

Usar esta receta efectiva para una secuencia de día/noche y movimiento con
fondos completos en Sabana, Gran Río y Gran Cañón, registrando cámara, semilla,
reloj, calidad y estado de preparación. Comprobar continuidad de suelo lejano,
LOD y ribera antes de retocar materiales. Mantener aparte la medición GPU/CPU:
los tiempos de carga del inventario no prueban el coste de renderizado.

La auditoría de variantes de carga está cerrada sin optimización adoptada; no
repetir las candidatas rechazadas como si fueran mejoras seleccionadas. El menú
por capas y los microeventos mantienen el orden solicitado posterior a la
validación de biomas, agua e impostores.
