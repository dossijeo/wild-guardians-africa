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


## Gran Río: streaming activo y atribución actual

`gran-rio-active-stream.json/.png`: Intel UHD 0x9A60, media720p,
180 frames de cámara, desplazamiento96, simulación activa, diez chunks nuevos,
actores disponibles180/180, cero frames pausados y fondos asentados al final.
Sin errores aparte de advertencias X4000 conocidas. GPU61 queries válidas,
sin disjoint: media29,58ms, p9537,72ms. RAF media41,66ms, p9583,13ms,
máximo149,63ms; draw máximo138,58ms. Son magnitudes diferentes; las queries
incluyen burbujas del pipeline. No hay comparación A/B que demuestre mejora.

Captura final inspeccionada: cobertura continua, sombras de árboles y suelo
bajo los objetos visibles. El primer plano contiene transparencia de obstrucción;
no se declara ausencia de artefactos a lo largo del recorrido por una sola imagen.

La repetición instrumentada `gran-rio-active-attribution.json` localiza esperas
getProgramInfoLog de74,61ms (far-ground-native-water-mask-v1:seam-v2),
76,72ms y42,09ms (smooth-far-opaque-v1). Son esperas síncronas del driver,
no coste GPU de hierba. Sin errores nuevos. Ambos recorridos usan opciones de
streaming por defecto del bioma, incluida retainPrograms=false. La repetición
instrumentada no constituye una optimización ni una comparación temporal exacta.

La evidencia permite probar retención ya existente en Gran Río, como se hizo
en Sabana, antes de modificar geometría o materiales aprobados. Se requiere
comparación intercalada y coste de carga/memoria antes de cambiar defaults.


## Gran Río: retención A/B/A/B

A conserva defaults; B activa únicamente retainPrograms. Cuatro ejecuciones
secuenciales con la misma fixture, calidad media720p, cámara180frames/96unidades,
pthreads, scheduler y simulación activa. Ver informes gran-rio-retention-*.json.

| Caso | Carga ms | RAF media | RAF p95 | RAF máximo | Draw máximo | GPU media |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| a1 | 24739.56 | 40.83 | 83.24 | 133.36 | 129.40 | 29.73 |
| b1 | 25303.57 | 42.03 | 82.64 | 133.03 | 19.62 | 30.23 |
| a2 | 24732.61 | 41.12 | 83.03 | 149.62 | 140.34 | 28.77 |
| b2 | 24943.05 | 39.30 | 83.03 | 99.70 | 17.09 | 28.08 |

Retención reduce consistentemente el máximo draw a17–20ms frente a129–140ms.
No mejora p95; el máximo RAF mejora solo en el segundo par. No se afirma una
mejora integral de fluidez ni se cambian defaults. Todos completan diez chunks,
actores180/180, sin pausas, fondos asentados, queries sin disjoint y sin errores
nuevos. La cantidad de frames de asentamiento varía180/182/184/198; la evolución
por tiempo real no da equivalencia exacta de carga. Los tiempos GPU incluyen
burbujas y no representan exclusivamente ocupación GPU.

La retención queda como candidata técnica, sin sacrificar la calidad artística.
No repetir indefinidamente esta microcomparación: la evidencia ya separa un
bloqueo de programas resuelto de otros límites del frame aún presentes.
Falta validar memoria residente y ciclo de vida antes de promoverla. Las imágenes
finales se conservan como evidencia; no se ha realizado diff de paridad visual
porque el mundo activo avanza durante tiempos reales diferentes.


## Manglares: streaming actual en baja y media

Dos ejecuciones independientes con la selección holly/fixed512, defaults del
bioma, pthreads y scheduler. Intel UHD0x9A60,720p, cámara180frames/96unidades,
simulación activa. Ambas completan diez chunks, actores180/180, cero frames
pausados, fondos asentados;61 queries GPU válidas sin disjoint y sin errores
nuevos. Informes manglares-low-active-stream y manglares-medium-active-stream.

| Calidad | RAF media ms | RAF p95 | RAF máximo | GPU media | GPU p95 | Draw máximo |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| baja | 34.55 | 66.35 | 99.78 | 26.62 | 35.01 | 15.07 |
| media | 40.56 | 66.62 | 132.98 | 32.53 | 45.72 | 19.13 |

Las dos imágenes finales fueron inspeccionadas: ribera continua, helechos densos,
suelo verde y barro localizado. Media conserva sombras que baja omite por su
perfil. No se reduce cobertura ni se cambia el material. Las vistas no prueban
la ausencia de saltos durante todo el recorrido ni paridad exacta entre perfiles.

CPU de actualización de caché: máximos1,15ms baja y0,81ms media; no equivalen al
coste GPU del bake. No se ha instrumentado memoria residente en estas ejecuciones.
La implementación limita su cola a40MiB, pero ese límite de código no sustituye
una medición de VRAM ni representa toda la memoria del renderer.

Una ejecución por perfil no es A/B/A/B ni demuestra regresión respecto al pasado.
La evolución de simulación depende del tiempo real. Los intervalos GPU incluyen
burbujas del pipeline. Media32,53ms durante este recorrido no demuestra alcanzar
el objetivo orientativo20–23ms; conservar arte aprobado y seguir atribuyendo los
costes acumulados, sin convertir este resultado en una simplificación automática.

PR159 verificada mediante GitHub CLI: OPEN, isDraft=true, head codex/global-visual-lab.
No se ha fusionado ni alterado main.


## Desierto y Volcanes: streaming activo actual

Calidad media720p, Intel UHD, pthreads/scheduler,180frames de cámara y96unidades,
misma metodología de Gran Río. Cada ejecución instala diez chunks, mantiene
actores180/180, no pausa la simulación y termina con fondos asentados. Sin errores
nuevos. Capturas finales inspeccionadas: Desierto conserva las ondulaciones y el
terreno bajo objetos lejanos; Volcanes conserva roca, vegetación y lava. No se
modifican materiales ni geometría. Una imagen final no valida todo el movimiento.

| Bioma | RAF media ms | RAF p95 | RAF máximo | GPU media | GPU p95 | Draw máximo |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Desierto | 24,57 | 49,72 | 83,07 | 17,79 | 23,12 | 82,76 |
| Volcanes | 38,25 | 66,61 | 132,90 | 27,60 | 35,38 | 125,38 |

Informes y capturas: desierto-active-stream y volcanes-active-stream. Una prueba
por bioma, sin variante A/B: no demuestra ahorro ni causalidad de los máximos.
No atribuir los picos de draw a compilación sin instrumentación de esa ejecución.
Las61queries por recorrido no equivalen a ocupación GPU; incluyen burbujas.

Corregida la etiqueta scope del capturador para futuras ejecuciones: antes decía
CPU/RAF only incluso con WG_THREAD_GPU=1. Los informes originales se conservan
intactos; su campo gpu contiene las mediciones y esta nota aclara el alcance.
La corrección no cambia la ejecución ni sus cifras. Validado con node --check.


## Gran Cañón: recorrido inválido visualmente, conservar como prueba negativa

`gran-canon-active-stream` completa las comprobaciones mecánicas del streaming,
pero su captura final muestra casi todo fondo azul. Por tanto NO se acepta su
GPU media10,34ms como coste representativo de la escena. No hay equivalencia
visual válida ni se declara completada la ronda de seis biomas.

Inspección del harness: sustituye updateCamera por lookAt y desplaza ojo/target
solo en X, conservando Y durante96unidades. Omite la protección del relieve que
sí usa el capturador estático de Canyon mediante nativeCameraPose. Esto identifica
un defecto de trayectoria de QA compatible con el fallo; todavía no prueba que
sea la única causa ni descarta huecos de terreno. Siguiente prueba debe usar una
trayectoria que siga el terreno y registrar la altura sobre la superficie.
No modificar materiales ni producción para ocultar una cámara de prueba inválida.

WG_CURRENT_REVIEW=1 conecta explícitamente la receta actual al harness sin
alterar su control histórico. Incluye canyonWater=calm; validado syntax check.
El resumen six-biome-streaming-summary marca Canyon visuallyValid=false y
conserva las cifras sin presentarlas como aceptación. Los otros cinco registros
son observaciones en mundos diferentes, no un benchmark A/B entre biomas.


## Gran Cañón: corrección de trayectoria de QA verificada

WG_THREAD_TERRAIN_CAMERA=1 utiliza nativeCameraPose con el mismo ángulo1,18,
orientación0 y distancia34 de las vistas estáticas; recalcula target/eye sobre
el relieve en cada paso. El resto de pruebas conserva la trayectoria histórica.
Se registran las180poses: altura sobre superficie13,41–20unidades. La imagen
final muestra terreno, rocas, vegetación y sombras; desaparece el fondo azul de
la trayectoria fija. Esto confirma que corregir la cámara de QA resuelve aquel
resultado final, sin alterar el renderer. No certifica cada píxel de toda la ruta.

Diez chunks, actores180/180, sin pausas, fondos asentados, sin errores nuevos.
GPU61queries: media21,36ms, p9527,36ms. RAF media29,47ms, p9534,49ms,
máximo282,73ms. El pico sigue pendiente de atribución; no declarar fluidez.
La cifra inválida10,34ms anterior permanece en su informe negativo y no debe
compararse como una optimización: la cámara visible y la carga dibujada cambian.

six-biome-streaming-summary utiliza ahora esta referencia válida visualmente y
registra el tipo de trayectoria de cada bioma. Es un inventario, no A/B entre
biomas ni validación temporal exhaustiva. Se conserva la selección calm del agua;
el final sobre meseta no prueba la apariencia del río durante todo el recorrido.


## Canyon: pico atribuido a primera transición transparente

Repetición con cámara sobre relieve, GL detail y fases de main:
`gran-canon-terrain-camera-attribution`. getProgramInfoLog273,02ms para
native-partial-blend-v1 de native-asset-surface-v4. No existe ninguna clave
native-partial-blend entre initialPrograms. Es primera preparación observada,
no evidencia de un programa previamente preparado que simplemente se perdió.
Render máximo289,19ms, draw284,78ms, RAF máximo299,32ms. GPU media21,01ms.
No atribuir esa espera al relieve o al agua calm. La instrumentación de main
excluye el trabajo posterior de scheduler.endFrame y no cubre toda la CPU.

Control `gran-canon-obstruction-warm-control` activa únicamente las opciones
existentes warmObstruction y retainPrograms; conserva geometría/materiales y
trayectoria. No registra llamadas GL superiores20ms; draw máximo6,79ms y
RAF máximo116,36ms. Retiene62programas. Carga25,98s frente24,62s; RAF p95
49,89ms frente33,66ms; medias29,93 frente29,37ms. Ambos sin errores nuevos.

Conclusión limitada: preparar la variante necesaria elimina la espera observada
durante esta prueba, pero no demuestra mejora integral de p95 ni throughput.
No se adopta por defecto. No eliminar esa variante como si fuera exclusiva de
laboratorio: efectivamente se usa al transparentar objetos durante la partida.
Un par instrumentado con evolución real distinta no sustituye A/B/A/B ni valida
memoria/ciclo de vida. Conservar evidencia positiva y negativa; no cambiar el
aspecto aprobado para resolver una espera de preparación.
