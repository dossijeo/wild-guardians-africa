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

## Sabana: prueba nueva de streaming activo

`sabana-active-stream.json` y `.png` corresponden a una ejecución nueva en
Intel UHD, calidad media, 720p, cámara desplazada 96 unidades durante 180
frames, simulación activa, pthreads y scheduler habilitados. Diez chunks
instalados, actores disponibles 180/180, cero frames pausados y fondos asentados
al terminar; sin errores nuevos aparte de las advertencias X4000 conocidas.
La captura final muestra suelo continuo y hierba legible bajo los objetos
visibles. No demuestra que nunca aparezca un hueco durante el movimiento.

Intervalo RAF medio 94,41 ms, p95 183,15 ms, máximo 432,42 ms. Llamada render
máxima 415,92 ms y draw máxima 408,11 ms. Instalación final de chunk media
0,40 ms, máxima 0,77 ms; esto excluye la preparación distribuida, cuya latencia
media hasta completar es 2119,61 ms y máxima 6638,10 ms. No sumar intervalos
anidados ni confundir latencia de cola con CPU bloqueada.

61 queries GPU válidas, sin disjoint: media 63,75 ms, p95 109,07 ms. Miden el
intervalo GPU de WorldScene.render e incluyen burbujas del pipeline, no solo
trabajo ocupado. La descripción heredada CPU/RAF del campo scope del harness
es incompleta cuando WG_THREAD_GPU=1; aquí se declara explícitamente su alcance.

Una ejecución no establece mejora, regresión ni causalidad y no certifica
fluidez. Preservar esta observación antes de cambios. El próximo diagnóstico
debe atribuir el draw de 408 ms y contrastarlo con repetición controlada; no
reducir cobertura ni alterar materiales aprobados para ocultar el problema.

## Atribución y control de retención

Repetición instrumentada del mismo recorrido: getProgramInfoLog espera 241,33 ms
para far-ground-native-water-mask-v1:seam-v2, 214,47 ms para smooth-far-opaque-v1
y 40,11 ms para far-ground-native-water-mask-v1. Son tiempos síncronos de llamadas,
no GPU ocupado. No atribuir este pico a los helechos, al suelo cercano ni a la
variante de transparencia de obstrucción sin evidencia adicional.

Control con la retención existente habilitada, manteniendo los otros cuatro
streamingOptions idénticos: 75 programas retenidos, ninguna llamada instrumentada
superior a 20 ms y máximo draw 16,72 ms frente a 318,90 ms del diagnóstico original.
Ambas ejecuciones instalan diez chunks, terminan asentadas y no registran errores
nuevos. Sin embargo, RAF p95 pasa de 199,50 a 265,86 ms y máximo de 332,49 a
565,39 ms; medias 95,61 y 100,70 ms. La retención no se promueve: eliminar ese
bloqueo aislado no demuestra mejora integral. La simulación activa evoluciona con
el tiempo real, por lo que estas dos pruebas no son una aceptación A/B/A/B ni
permiten atribuir causalmente el empeoramiento a la retención.

Conservar los informes originales, el resumen y las capturas de ambos finales.
Siguiente atribución: fases completas del frame y preparación fuera del dibujo,
con repetición intercalada antes de modificar políticas de producción. No se han
alterado shaders, densidad, geometría, simulación ni defaults.

## Fases del bucle principal con retención

Nueva repetición instrumentada: RAF máximo 266,25 ms, p95 182,93 ms; callback
principal máximo 44,90 ms. Máximos por tramo: simulación 6,13 ms, render 42,68 ms,
audio 1,01 ms, interfaz 6,17 ms. Estos máximos no son sumables ni simultáneos.
La instrumentación del callback termina antes de endFrame del scheduler; no
presentar 44,90 ms como cota de todo el trabajo del hilo principal.

Los dos LoAF más largos duran 259,50/255,85 ms, con blockingDuration=0 y scripts
atribuidos de 14,51/19,20 ms. El tiempo anterior a renderStart domina esas entradas.
Esto contradice atribuir automáticamente esos intervalos a preparación JavaScript
síncrona. No identifica por sí solo si domina GPU, compositor, planificación del
navegador, contención externa o trabajo no atribuido por LoAF.

61 queries GPU sin disjoint: media 79,94 ms, p95 146,80 ms, máximo 202,52 ms.
No equivalen a GPU ocupado y esta ejecución no permite comparación causal con
la anterior. Antes de cambiar el scheduler, repetir con observación concurrente
de uso GPU/procesos y una referencia intercalada. No hay justificación actual
para degradar vegetación ni atribuir la latencia a la simulación.

La retención sigue siendo solo un control experimental. Esta prueba no certifica
fluidez, estabilidad nocturna, equivalencia de todos los biomas o cierre global.

## Contención GPU fuera de la prueba

Tras finalizar todos los harness de esta serie, ocho lecturas CIM entre
00:33:25 y 00:33:41 UTC registran actividad sostenida del motor 3D atribuida
al PID 29484, chrome.exe: 91, 101, 70, 96, 84, 99, 85, 85. Se conservan los
valores brutos (incluido 101); no son porcentajes calibrados ni deben sumarse
con otros procesos para deducir ocupación total. El padre 14396 no se encuentra
en la consulta de procesos, por lo que no se establece propiedad del navegador.
No se ha terminado ningún proceso ajeno ni enviado mensajes a otras tareas.

Esta observación confirma carga GPU fuera del harness en este intervalo.
No demuestra retrospectivamente su presencia en cada prueba previa ni explica
por sí sola toda la latencia. Las cifras recientes quedan como diagnósticos
no aptos para aceptar rendimiento hasta repetir con muestreo concurrente y
condiciones controladas. La atribución de llamadas getProgramInfoLog sigue
siendo observada, pero sus duraciones pueden estar afectadas por contención.

Continuar la validación visual de día/noche y movimiento sin convertir su
cadencia en un benchmark. No reducir arte aprobado, ni adoptar retención como
mejora integral, a partir de esta serie. El muestreo original se conserva en
gpu-idle-contention.json para que el límite sea verificable.
