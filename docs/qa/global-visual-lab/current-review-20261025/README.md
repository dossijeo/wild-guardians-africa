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

## Repetición A/B/A/B tras cerrar Chrome por petición del usuario

PID 29484 cerrado tras verificar chrome.exe --type=gpu-process. Nueva serie
secuencial, misma receta/semilla/calidad media/720p, 180 poses y recorrido96,
simulación activa. A=retención desactivada, B=activada; resto de streamingOptions
idénticos. El muestreo concurrente parcial identifica Chrome como el harness,
no el proceso anterior. No cubre toda la serie ni elimina actividad del escritorio.

| Run | RAF medio | RAF p95 | RAF máximo | Draw máximo | GPU intervalo medio |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 | 44.75 | 83.20 | 166.49 | 161.27 | 33.25 |
| B1 | 44.07 | 83.29 | 149.73 | 21.38 | 32.29 |
| A2 | 43.70 | 99.65 | 166.38 | 152.34 | 31.81 |
| B2 | 44.99 | 99.76 | 116.58 | 18.50 | 32.95 |

Milisegundos. Todas completan streaming sin errores nuevos, actores disponibles
180/180 y sin pausas. Queries sin disjoint. A1 necesita11frames adicionales para
asentarse; las otras180. La simulación evoluciona con reloj real: no es paridad
exacta de trabajo. Reproductor de resumen: summarize-current-retention-abab.py.

La retención reduce consistentemente el máximo dentro del dibujo y los máximos
RAF observados, pero no mejora media ni p95; GPU medio mixto. Conservar candidata
para eliminar recompilaciones, no descartarla ni anunciar aumento general de FPS.
No activar por defecto todavía: faltan coste de carga/memoria, ciclo de vida y
validación equivalente en los otros biomas. No se modifica el arte aprobado.

## Sabana: capturas actuales día/noche

Doce imágenes del renderer real en sabana-day-night-corrected: calentamiento y
repetición final, día/noche, cámara de juego/elevada/inversa, calidad media,
1280×720, seed712. Tiempo de simulación idéntico en las doce; cero errores GL
y de consola registrados. Receta efectiva registrada en captures.json, con
pthreads/scheduler y fondos completos. No benchmark ni cambio artístico.

Inspección directa de la vista normal final: hierba continua perceptible de día,
paleta cálida y sombras legibles; de noche permanece distinguible respecto a
los caminos y edificios. Suelo presente bajo los objetos lejanos visibles.
El encuadre no permite certificar skybox y las poses estáticas no prueban ausencia
de huecos durante streaming. Las otras vistas se conservan para revisión.

El primer intento falló en la aserción de tiempo congelado: el anchor antiguo
de la pausa ya no coincidía con la inicialización actual. Log conservado en
sabana-day-night.log; no se usa como comparación válida. El capturador ahora
comprueba la unicidad del anchor y mantiene retainStreamingPrograms al pausar,
y acepta WG_REVIEW_QUERY explícito sin alterar la receta histórica por defecto.
La repetición corregida termina exit0; comprobación de sintaxis correcta.

## Gran Río: repetición visual actual

Doce capturas en gran-rio-day-night, calidad media, día/noche y tres poses,
con receta actual y fondos completos. Todas conservan el tiempo de simulación
119,99999999999746; ningún error GL/console registrado. Se inspeccionó la vista
normal final diurna/nocturna y la referencia histórica nocturna: la cubierta sigue
siendo una masa herbácea reconocible, los caminos se distinguen y hay suelo bajo
los objetos del fondo visible. No se observa una pérdida masiva de densidad en
estas vistas. Noche más oscura pero mantiene lectura; no se altera su iluminación.

Controles históricos de cámara/target/reloj/estado de trabajadores registrados
en gran-rio-history-controls.json. Vista normal:105→91calls y874520→575977
triángulos, pese a cámara y estado coincidentes. No atribuir automáticamente a
pérdida de vegetación ni a mejora GPU: el renderer y sus optimizaciones cambiaron
entre referencias. No es paridad de workload ni benchmark. Mantener estos datos
para atribución si aparece un defecto visual concreto.

Agua solo al fondo en vista normal: esta prueba no cierra la ribera cercana.
Faltan movimiento continuo y revisión de otras poses; no cierre global del bioma.

## Gran Cañón: cámara nativa y revisión día/noche

Doce capturas actuales en gran-canon-day-night, tres poses, día/noche y repetición
tras calentamiento. Calidad media720p, seed712, fixture poblada original, tiempo
simulado fijo, fondos habilitados. Sin errores GL/console registrados. El harness
se actualiza al mismo anchor de pausa verificado usado en las otras capturas;
conserva la cámara nativa y registra los overrides explícitos de receta.

Inspección de vista normal: estratos cálidos y grava de ribera distinguibles,
borde del agua suave, sombras sobre edificios y suelo; noche mantiene legibilidad
sin cambiar materiales. Los reflejos diurnos muestran repetición perceptible a
lo largo del río. Es un pendiente artístico concreto ya documentado históricamente,
no evidencia nueva de una regresión. Evitar repetir variantes descartadas sin
revisar antes sus informes. El contacto de pared conserva su silueta geométrica;
no se altera el terreno autoritativo para mejorar esta imagen.

No certifica movimiento, memoria, rendimiento ni equivalencia con main. Las
capturas no incorporan ajustes artísticos nuevos. Sabana, Gran Río y Gran Cañón
ya tienen referencias actuales día/noche bajo el mismo método de congelación.

## Cañón: candidata calm recuperada y contrastada

La investigación previa ya descartó reemplazar el tile de pendientes como solución
suficiente (canyon-spectral-ripples-20261023). La alternativa nativa existente
canyonWater=calm atenúa solo la normal usada para reflexión diurna, conservando
BRDF solar y respuesta nocturna. No se crea otra variante ni se cambia el shader.

Doce capturas nuevas en gran-canon-calm. Seis parejas finales con el control
reciente coinciden en cámara, target, reloj, trabajadores, calls y triángulos.
Tres nocturnas RGB exactas. Inspección diurna normal: menor contraste de bandas,
agua más tranquila, orilla/paleta/edificios preservados. Preferible candidata
para seguir validando el defecto de reflexión; no aprobación global.

Residencia difiere: geometrías iguales155/151/149según pose, pero84texturas en
control y88en candidata. No atribuir cuatro texturas al shader sin diagnóstico;
la implementación añade aritmética, no declara mapas nuevos. Registrar/atribuir
la diferencia antes de cambiar receta o afirmar equivalencia de memoria. Ningún
error GL/console registrado. Los costes históricos y vídeos de20261023 son
antecedentes, no benchmarks nuevos del renderer actual. No promoción por defecto.

## Control repetido para atribuir residencia de calm

Nueva ejecución sin calm vuelve a84texturas en las seis vistas finales;
geometrías155/151/149iguales. Cinco imágenes RGB exactas con el primer control;
día normal solo difiere en bounds(800,409)-(803,410). Todos los controles
registrados coinciden. Esto reduce la hipótesis de una diferencia arbitraria
entre dos cargas, pero todavía no identifica las cuatro texturas de calm.

Revisión de african-toon.js: calm condiciona la transformación GLSL y la clave
de programa; acquireWaterSlope depende de experimentalWater, no de calm.
canyon-water-reflection.js no añade samplers ni construye texturas. No atribuir
88vs84a cuatro nuevos mapas del agua sin un censo de inicialización/propiedad.
Siguiente prueba: censo por recurso en ambas rutas, fuera de benchmarking.
Conservar candidata artística, sin promoción ni pérdida de calidad por esta duda.

## Censo de texturas control/calm

Censo QA de create/delete/bind/storage/uploadWebGL, sin consultas sincronizantes
GPU. Nuevas ejecuciones seriales, misma receta y fixture; las dos terminan con
84texturas Three y88objetosWebGL vivos en el contexto del mundo. La firma multiset
de las subidas observadas (argumentos, dimensiones y fuentes de imagen disponibles)
no presenta diferencias en la vista normal diurna. No es comparación de contenido
binario ni tamaño VRAM exacto. Ver canyon-texture-census-diff.json y los censos
nativos día/noche compactados; capturas completas conservadas localmente.

No se reproduce84vs88de las primeras capturas. La instrumentación cambia el tiempo
de inicialización: no afirmar una causa resuelta ni usar estas ejecuciones para
rendimiento. No hay evidencia de cuatro mapas propios de calm; la diferencia
histórica queda como variabilidad no atribuida. Mantener candidata visual,
priorizando validación integrada de movimiento/calidad baja antes de seleccionar
la receta. No convertir este contador aislado en rechazo artístico o bloqueo global.

## Calm: baja y selección para revisión actual

24capturas nuevas control/calm en calidad baja; seis parejas finales con cámara,
reloj, trabajadores, calls, triángulos y contadores de recursos iguales. Tres
nocturnas RGB exactas. Vista diurna normal inspeccionada: bandas menos dominantes,
agua más tranquila; no altera orilla ni geometría. No errores registrados.
La falta de sombras de alta calidad pertenece al perfil bajo, no a calm.

Se selecciona calm para la receta artística actual de revisión, junto con
helechos holly/caché fixed512 exclusivamente en Manglares. Módulo explícito
`tools/experiments/global-current-review-recipe.mjs`; la receta histórica sigue
intacta. Esta selección permite futuras pruebas coherentes, no cambia defaults
ni declara el bioma cerrado. Coste/movimiento históricos documentados en20261023;
pendiente refrescar streaming activo y movimiento sobre la combinación actual.
No se afirma mejora FPS a partir de las capturas.

## Movimiento nativo actual de Canyon calm

Cuatro vídeos (control/calm, día/noche),240poses solicitadas cada uno; primera
mitad cámara fija, segunda dolly5m.960registros sin erroresGL/console, sin
preparación lejana pendiente y con simulación conservada.480parejas coinciden
en cámara, reloj del agua, calls ytriángulos. No es un benchmarkFPS: MediaRecorder
usa reloj real mientras el shader avanza i/30. Vídeos y checkpointsPNG en
canyon-motion-control y canyon-motion-calm.

El checkpoint diurno de máxima aproximación fue inspeccionado: río continuo,
reflejos menos contrastados y margen conservado. No se afirma revisión exhaustiva
de todos los frames codificados ni streaming largo por un desplazamiento5m.
Reaparece la discrepancia de contadores de memoria en todas las poses; ver
capturas originales. El censo anterior no la reprodujo, por lo que la variabilidad
sigue abierta, sin inventar causa ni ocultarla. Mantener selección de revisión,
no cambiar defaults del juego ni afirmar equivalencia de memoria.

Harness actualizado al punto de pausa real, salida configurable y opción native
que activa canyonWater=calm sin reemplazo de fuente. Las ejecuciones usan
pthreads/frameScheduler/ownedFarGpu y horizonBed=sync,budget2,chunkInstall=sync.
La grabación y la supervisión de frames son QA; sin cambios de producción.

## Manglares: conservar la aprobación artística

Doce capturas actuales día/noche y tres poses en manglares-day-night, calidad
media720p, receta holly/fixed512, pthreads/scheduler y fondos completos. Tiempo
simulado idéntico, sin erroresGL/console registrados. Inspección normal diurna y
nocturna: suelo verde con manchas de barro localizadas, helechos densos y legibles,
contacto de ribera conservado; no aparece el fallo de suelo totalmente embarrado.
No se modifica densidad, pigmento, iluminación ni geometría. Se mantiene la
aprobación del usuario, sin reabrir comparaciones con hojas redondas descartadas.

Esta revisión no demuestra paridad píxel con la imagen adjunta del usuario:
no se conoce su estado completo. Tampoco prueba transicionesLOD, viento continuo,
streaming o costeGPU. Preserva una referencia actual reproducible para esas
pruebas. No se declara el bioma completado técnicamente por aprobación artística.


## Desierto y Volcanes: referencias actuales completadas

Series `desierto-day-night` y `volcanes-day-night`: 12 capturas cada una,
calidad media, 1280x720, día/noche, tres cámaras, calentamiento y pase final.
Los 24 registros conservan elapsed=119.99999999999746; no hay errores GL ni
entradas de error en los cuatro registros de cada serie. Los procesos de captura
ya no están activos y ambos informes finales existen.

Inspeccionadas las vistas normales finales de día y noche. Desierto conserva
ondulaciones y sombras de arena legibles, con edificios diferenciados del suelo.
Volcanes conserva fracturas y relieve rocoso; de noche baja la iluminación del
suelo mientras la lava sigue visible. No se modifica la lava ni el material
aprobado de Desierto. Esta inspección no demuestra equivalencia píxel a píxel
con versiones históricas ni valida por sí sola las otras dos cámaras.

El capturador acepta ahora WG_REVIEW_SOURCE para reutilizar la fixture histórica
de Desierto (`desert-populated-closure-20261022`) sin duplicar el capturador ni
cambiar el estado guardado. Se mantiene el origen por defecto de los demás biomas.

Con estas series existen referencias estáticas actuales de los seis biomas.
Esto no cierra la validación integral: falta consolidar movimiento, streaming,
perfiles modestos y medidas comparables de la combinación seleccionada. Estas
capturas pausadas no son benchmarks ni justifican mejoras de FPS.
