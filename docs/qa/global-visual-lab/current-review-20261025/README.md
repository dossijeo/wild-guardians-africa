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


## Galería comparativa contra main histórico

[Galería de36parejas](main-current-gallery.html), seis biomas, día/noche y tres
vistas, izquierda main b2497b0695218652672c805c40971ea830686e3a, derecha capturas
actuales. No confundir esa referencia congelada con origin/main actual.
`build-current-main-gallery.py` verifica las36coincidencias de cámara, target,
origen, hora, elapsed y trabajadores, ausencia de errores registrados y existencia
de72imágenes. `main-current-gallery.json` guarda huellas SHA256 de los originales.
La galería enlaza PNG sin reescalar sus archivos ni retocar píxeles.

Manglares muestra la selección actual holly/fixed512, no hojas redondas antiguas;
Canyon muestra calm. Los otros biomas usan las referencias actuales ya revisadas.
El baseline conserva sus fondos originales; no se afirma equivalencia del pipeline
ni de todos los estados internos. La galería es una ayuda de revisión artística,
no un benchmark y no una aprobación automática por diferencias de píxeles.
No se ha revisado exhaustivamente cada vista adicional en este pase.


## Revisión visual adicional de la galería

Inspección directa de ocho PNG: main histórico y actual, Sabana/Gran Río,
vista elevada0001, día/noche. Sabana conserva paleta seca cálida y zonas de paso;
la versión actual añade fibras legibles y sombras de edificios más definidas.
Gran Río separa claramente los caminos de tierra de la cobertura verde; el
baseline tenía zonas despejadas verdes con menor separación. Por la noche la
masa herbácea sigue legible sin convertir la escena en diurna. Son juicios
artísticos sobre estas vistas, no resultados deducidos de diferencias de píxeles.
Recomendación para estos encuadres: conservar la dirección actual.

También inspeccionadas las vistas inversas0002 actuales: Sabana y Gran Río de
día/noche, y los otros cuatro biomas de día. Los fondos visibles tienen terreno;
no aparecen objetos sobre vacío azul en estos encuadres. Manglares mantiene el
manto de helechos aprobado y transiciones locales de barro; Desierto conserva
relieve cálido; Volcanes mantiene separación roca/ceniza/lava. En Canyon la pared
cercana ocupa gran parte del lado izquierdo: es una limitación del encuadre
inverso para juzgar el poblado, no una prueba de rendimiento ni razón para cambiar
la silueta. El río y su ribera sí son visibles.

Limitaciones observables: las copas lejanas de Sabana se ven más pálidas que las
cercanas, y el fondo de Manglares tiene menos volumen vegetal que su primer plano.
No se concluye que sean regresiones: niebla, LOD y distancia también contribuyen.
Priorizar revisión temporal de esa transición antes de aumentar densidad o
introducir DOF. No alterar aprobaciones de Manglares, Desierto o lava solo por
estas observaciones estáticas. Las vistas nocturnas inversas de los otros cuatro
biomas y las elevadas de esos cuatro no se han inspeccionado en este pase.


## Sabana: muestreo visual del recorrido, fallo de asentamiento

WG_THREAD_VISUAL_STEPS=1 añade capturas QA a0/30/60/90/120/150/179. No cambia
producción. Se ejecutó con simulación pausada y GPU timer desactivado para revisar
cobertura. Los siete PNG se guardaron, pero después el harness falló con Stream
completion deadline. Conservar sabana-visual-steps.failure.json; no hay informe
final de éxito ni cifras de rendimiento válidas. La captura introduce esperas y
altera la cadencia, por lo que tampoco sería comparable a los benchmarks activos.

Inspeccionados puntos0–150: continuidad de hierba cercana, suelo visible bajo
objetos y transparencia de obstrucción al atravesar copas. No se identifican
huecos grandes de terreno en esas muestras. No se certifica transiciónLOD suave
entre ellas: separación30frames y cámara cambiante no permiten esa conclusión.
El punto179 se conserva pero no fue inspeccionado en este pase.

Pendiente identificar qué cola o preparación no se asienta con el mundo pausado.
No atribuir aún el fallo a recursos perdidos ni aumentar el timeout como arreglo.
La variante activa anterior sí completó este recorrido. El estado de fallo actual
solo contiene el diagnóstico general; se necesita observación de colas al fallar.


## Diagnóstico del timeout con capturas

Control pausado sin capturas intermedias: sabana-paused-stream-diagnostic.json
completa diez chunks, fondos asentados,180frames pausados, elapsed idéntico antes
y después, sin errores nuevos. La pausa sola no reproduce el fallo.

Repetición con siete capturas: sabana-visual-steps-diagnostic.failure.json vuelve
a agotar Stream completion deadline. Diagnóstico nuevo: horizonte listo, los
cuatro adaptadores lejanos sin preparación pendiente ni errores; chunkStream
queued7, preparing2, busy=true, created26 (25iniciales). Scheduler pending2,
waiting0, oldest216776ms, budget3,097ms, median16,66ms y CPU p958,35ms.
Esto localiza el atasco en preparación/admisión de chunks, no en los fondos.
No demuestra todavía qué unidad está bloqueada ni que las capturas sean la causa
exclusiva; cambian la cadencia y reproducen el caso. Conservar ambos controles.

La instrumentación de timeout añade estados sin alterar límites ni producción.
Siguiente diagnóstico: identidad, coste estimado, deadline y readiness de las
dos tareas que sobreviven pese al presupuesto disponible. No aumentar el timeout
ni reducir vegetación para hacer pasar la prueba. La serie con capturas no sirve
para benchmarking temporal y sigue sin superar el criterio de asentamiento.


## Corrección de inanición por estimación histórica de prop-slots

`sabana-paused-job-costs.failure.json` confirma dos tareas terrain5,1:prop-slots y
terrain5,-1:prop-slots, estimate55,55ms compartida frente costes propios3,58/4,40ms,
más de213s de antigüedad. La recuperación previa exige cpu+estimate<=2periodos;
con esa estimación ninguna ejecución puede renovar el dato.18tests del scheduler
pasan, incluido el nuevo caso de estimación55,55 y exclusión del trabajo opcional.

Se añade allowBlockingRecovery, desactivado por defecto, habilitado únicamente
por prepareTerrainChunk para chunks ya necesarios. Tras5s de deadline vencido,
con CPU obligatoria<medio periodo, callback dentro del periodo y ninguna unidad
opcional ejecutada, admite una unidad aunque su estimación exceda el límite.
Sale inmediatamente del presupuesto y espacia esta recuperación5s globalmente.
Respeta validación, cancelación y dependencias existentes. No rebaja estimaciones
ni presenta la deuda como tiempo libre. blockingRecoveries expone su frecuencia.
Una llamada atómica puede aún bloquear: esto garantiza una oportunidad de avanzar
en frames baratos, no un límite duro a su duración ni fluidez bajo saturación.

Caso real con capturas `sabana-required-recovery`: diez chunks, cero pendientes,
fondos listos, elapsed idéntico, sin errores nuevos.28recuperaciones excepcionales,
máximo de unidad57,02ms. La captura final fue inspeccionada y conserva la cobertura.
Las siete capturas intermedias adicionales permanecen locales; el informe y la
captura final quedan versionados. La frecuencia bajo capturas no se vende como
solución óptima: falta reducir la contaminación y granularidad de estimaciones.

Control activo sin capturas `sabana-required-recovery-active`: diez chunks,
actores180/180, cero pausas, cero tareas pendientes, CERO blockingRecoveries.
RAF media43,60ms/p9583,24ms/máximo166,36ms, GPU media32,61ms. Sin errores nuevos.
Compatible con el orden de magnitud de referencias anteriores, pero una ejecución
no es A/B/A/B ni demuestra ahorro. Se adopta en la rama experimental como
corrección de liveness, no como optimización FPS. No cambia arte ni simulación.


## Recuperación: cancelación y control en Manglares

Test adicional verifica que ni abortados ni revisiones inválidas ejecutan la
unidad excepcional, incluso después de5s vencidos. Los55tests de scheduler,
preparación, streaming nativo/gráfico y cola de caché pasan con el cargador
Three aislado existente:
`node --loader file:///C:/Users/PC/source/repos/wild-guardians-wild-three/tools/wild-three/node-loader.mjs --test tests/global-frame-scheduler.test.js tests/prepare-terrain-chunk.test.js tests/chunk-stream.test.js tests/chunk-stream-pipeline.test.js tests/material-bake-queue.test.js tests/spatial-chunk-stream.test.js`.

Primera ejecución sin cargador:37tests pasan y dos archivos no arrancan por
ERR_MODULE_NOT_FOUND de node_modules/three/build/three.module.js. No es un test
funcional fallido ni se oculta: ambos TAP se conservan. No se reinstalan ni
modifican dependencias compartidas del host para resolverlo.

Manglares media720p con holly/fixed512, simulación activa y recorrido96unidades:
10chunks, actores180/180, sin pausas, fondos listos, sin errores nuevos ni tareas
pendientes. blockingRecoveries=0. RAF media42,66ms, p9566,64ms, máximo116,26ms;
GPU media33,04ms.198muestras incluyen asentamiento, frente180 del control anterior:
no afirmar ahorro causal ni comparar medias como carga idéntica. Es un control
funcional del cambio; el aspecto no fue modificado y no se reduce vegetación.
Informe `manglares-required-recovery-active.json` y captura final conservados.


## Gran Río: control visual pausado con capturas — fallo de asentamiento

`gran-rio-visual-steps` conserva siete PNG originales, diagnóstico terminal y
resumen con opciones y SHA-256. Escena 720p/media, receta actual, simulación
pausada, desplazamiento de 96 unidades, fondos completos y pthreads.
Inspeccionados los puntos 0, 30, 60, 90, 120 y 179: cubierta densa y suelo
presente en las zonas visibles; caminos despejados. El punto 60 queda parcialmente
oculto por una copa cercana; 90/120 muestran transparencia de obstrucción.
No certifica ausencia de popping ni toda la transición LOD: son muestras separadas,
no vídeo continuo, y el punto 150 se conserva sin inspección específica.

El harness terminó con `Stream completion deadline`. Created=34 frente a los
25 iniciales: nueve chunks incorporados, uno aún preparándose, queued=0.
Horizonte y cuatro adaptadores lejanos listos. Scheduler pending=1, waiting=0;
la tarea terrain 6,3:prop-slots tiene unos 29,87 s de antigüedad, estimate=31,77 ms
y cost=0,774 ms. Este último es el estimador local del trabajo, NO una medición
exacta de la siguiente unidad. Se registraron 26 blockingRecoveries y máximo de
unidad 53,72 ms. La recuperación excepcional permitió progreso pero no bastó para
cumplir el plazo en este control; no se declara streaming validado.

Siguiente investigación: registrar la secuencia de costes de cada fase/unidad
para separar primera construcción, recursos compartidos y reutilización. La
estimación por calidad+fase comparte un máximo con decaimiento 0,9 y puede retener
un pico entre unidades heterogéneas. No rebajar el estimador por conjetura ni
ampliar el timeout para convertir el fallo en éxito. Tampoco cambiar el arte.
Las esperas de screenshots alteran la cadencia: ninguna cifra temporal de esta
serie representa rendimiento de juego. El control activo anterior sigue siendo
una observación distinta, no refuta este fallo reproducido en modo pausado.


## Separar la estimación de los cinco grupos de props

Traza QA `gran-rio-phase-trace.terrain-trace.json`: 390 unidades, incluidos
los chunks iniciales; 35 observaciones por grupo de cuatro slots. Los grupos
0–3 tienen medianas 0,19–0,255 ms y máximos <=1,665 ms. Todos los picos de
40–54,5 ms corresponden al último grupo (slots 16–19). Todavía no se atribuye
el pico a una operación interna específica: el código puede construir agua en
ese grupo, pero la traza mide el conjunto. El máximo compartido contamina las
estimaciones de los demás grupos (hasta 54,5 ms para trabajo submilisegundo).

Cambio mínimo: cada grupo conserva su propia etiqueta `prop-slots-0/4/8/12/16`.
No cambia geometría, orden, tamaño de unidad, recursos, número de llamadas ni
publicación atómica. Se reutiliza el estimador existente sin reducir costes a
mano. `terrain-phase-trace.js` es instrumentación opt-in del harness, no del juego.
Guarda trazas acotadas también en el cierre por fallo.

Comparación pausada instrumentada, mismo recorrido y siete capturas:

| Medida | Estimación compartida | Estimaciones por grupo |
| --- | ---: | ---: |
| Chunks terminados | 10 | 10 |
| Recuperaciones excepcionales | 26 | 9 |
| Mayor unidad síncrona (ms) | 54,53 | 53,06 |
| Espera acumulada grupo 0 (ms) | 59187 | 48 |
| Espera acumulada grupo 1 (ms) | 93598 | 71 |
| Espera acumulada grupo 2 (ms) | 78381 | 89 |
| Espera acumulada grupo 3 (ms) | 52150 | 89 |
| Espera acumulada grupo 4 (ms) | 74230 | 75093 |

Las esperas se solapan entre chunks: NO sumarlas para inferir tiempo de carga.
No es una serie A/B/A/B ni un benchmark de FPS. Ambas terminan con cero pendientes,
fondos listos y elapsed intacto. La primera ejecución sin traza había expirado;
la instrumentada completa, confirmando sensibilidad a la cadencia. No ocultar
ese control negativo. `summarize-terrain-phase-traces.py` reproduce la tabla.
55 tests de scheduler/preparación/streaming/caché pasan. La captura final del
candidato se inspeccionó: mantiene cobertura, caminos, suelo y sombras visibles.
Las diferencias de animación y transparencia no permiten igualdad píxel a píxel.

Se conserva la separación como corrección de clasificación de costes en la rama
experimental. Pendiente control activo y atribuir/fraccionar el último grupo:
no se afirma que el máximo bloqueo ni el frametime hayan mejorado. Los informes,
trazas y capturas finales están versionados; capturas intermedias de esta pareja
quedan locales (la serie visual previa completa sí está publicada).


## Estimaciones separadas: control activo y atribución de agua

`gran-rio-phase-separated-active` completa diez chunks, actores listos 180/180,
sin pausas, fondos asentados y cero tareas pendientes/recuperaciones excepcionales.
GPU media 28,63 ms; presentación media 40,19 ms, p95 66,73 ms, máximo 166,28 ms.
Preparación de chunk CPU media 4,64 ms, máximo 7,15 ms; mayor slice 3,505 ms.
El dibujo conserva un máximo de 126,125 ms. Es control funcional del candidato,
no A/B/A/B ni demostración causal de mejora de FPS. No capturas intermedias.

La extensión opt-in de `terrain-phase-trace.js` mide `prepareNaturalAssetWater`
sin modificar su salida. `gran-rio-asset-water-attribution` también completa diez
chunks con simulación activa y cero recuperaciones. Las quince preparaciones de
agua (incluida carga inicial) cuestan mediana 3,565 ms y máximo 6,24 ms; producen
cuadrículas 99×99 de 39204 bytes. No reproduce el coste de 40–54 ms del control
pausado con capturas. Por tanto, aún NO se atribuyen esos picos exclusivamente al
muestreo del agua ni se reescribe esa ruta por inferencia. Falta repetir la
atribución en el régimen que reproduce el problema y separar tiempo de ejecución
de desplanificación/efectos de captura. Se conservan los informes completos y
el resumen `prop-phase-active-controls.json`. No hay cambios artísticos ni nuevos
cambios de producción en este pase.


## Agua de props: atribución pausada y prototipo incremental

`gran-rio-paused-water-attribution` reproduce el coste: agua de props 37,68–60,03 ms
en los seis chunks nuevos que la contienen; el grupo completo alcanza 60,37 ms.
La cuadrícula sigue siendo 99×99. El mismo trabajo activo costaba 1,78–6,24 ms.
La hipótesis sobre consultas de altura no residentes aún no está demostrada;
no se modifican C++, navegación ni simulación. Lo confirmado es la llamada
síncrona larga de preparación visual en este régimen.

`prepareNaturalAssetWaterBed` reutiliza el generador existente, conserva sus
muestras y bytes, y libera su proxy al terminar o cancelar. El grupo gráfico
sigue privado hasta completarse. `prepareNaturalAssetWater` acepta esos datos y
conserva su ruta síncrona para otros llamadores. No cambian shaders, resolución,
texturas finales ni draws. Memoria temporal por cama: cuadrícula float ~38,3 KiB
más bytes RGBA ~38,3 KiB, además del pequeño proxy; estas estructuras ya existían
en la ruta síncrona, ahora pueden vivir entre frames. No es medición de VRAM pico.

Primer candidato, cesión cada 128 consultas, prueba pausada con capturas:
10 chunks, cero pendientes y recuperaciones 9→0; máximo de unidad 60,43→14,26 ms;
latencia media de preparación 11806→936 ms. Captura final inspeccionada conserva
suelo, cobertura y ribera. No constituye mejora de FPS: las capturas alteran
la cadencia. Informes `gran-rio-incremental-asset-water` y control anterior.

En activo, ceder tan a menudo pasó de114 a630 slices. La primera ejecución mostró
latencia media1594 ms frente1154 del control síncrono; una repetición dio1044 ms.
No atribuir causalmente toda la diferencia al fraccionamiento. Esa repetición
se lanzó tras fallar la aplicación automática del cambio y fue renombrada
`gran-rio-incremental-water-active-repeat` para no presentarla como coalescida.

El candidato final agrupa bloques baratos hasta .75 ms de trabajo observado por
cesión (límite de granularidad, NO presupuesto global de frame; un bloque atómico
puede excederlo). El GlobalFrameScheduler sigue decidiendo admisión y presupuesto.
Activo `gran-rio-coalesced-water-active`: 136 slices, diez chunks, actores180/180,
sin pausas ni pendientes/recuperaciones; latencia media1165 ms, GPU media28,49 ms,
RAF p9566,735 ms. Sin evidencia de mejora de FPS; máximo RAF149,625 ms. La serie
no es A/B/A/B y el número de frames de asentamiento varía. No ocultar negativos.

63 tests pasan, incluidos equivalencia byte a byte en cinco biomas, shader idéntico,
atributo de ribera idéntico, ausencia de nuevas consultas al instalar datos ya
preparados, cancelación y agrupación de bloques baratos. Se conserva como prototipo
en la rama experimental. Pendientes: repetir el caso pausado con la agrupación
final, validar otros biomas/ciclo de vida y pruebas intercaladas de rendimiento.
No afirmar aceptación global ni fluidez completa. `asset-water-incremental-comparison.json`
conserva métricas y opciones. Las capturas intermedias permanecen locales;
se publican informes, trazas y capturas finales.


## Candidato coalescido: repetición pausada y controles activos de seis biomas

`gran-rio-coalesced-water-paused` completa diez chunks, cero pendientes y cero
recuperaciones excepcionales, elapsed intacto. Máximo de unidad16,83 ms (control
síncrono60,43); latencia de preparación media4774 ms (síncrono11806, primer
incremental936). No afirmar que la coalescencia gana en todas las condiciones:
reduce coordinación en activo pero esta observación pausada tarda más que la
primera incremental. Las capturas perturban la cadencia. Los parámetros de las
15 camas (límites, dimensiones, rango de alturas y bytes) coinciden exactamente
con la traza síncrona; esto NO es hash de sus texeles. La equivalencia de bytes
se comprueba por tests; aquí la captura final también fue inspeccionada.

Controles activos secuenciales, Intel UHD, media720p, receta actual y pthreads:

| Bioma | GPU media ms | Presentación p95 ms | Recuperaciones excepcionales |
| --- | ---: | ---: | ---: |
| Sabana | 31,33 | 83,22 | 0 |
| Gran Río | 28,49 | 66,73 | 0 |
| Manglares | 33,67 | 67,08 | 0 |
| Desierto | 16,99 | 33,37 | 0 |
| Volcanes | 25,89 | 66,50 | 0 |
| Gran Cañón | 20,82 | 33,41 | 0 |

Todos completan diez chunks, actores180/180, ninguna pausa durante el recorrido,
fondos listos y scheduler sin pendientes. Sin errores nuevos (se conservan los
avisos X4000 conocidos). Cañón usa cámara ajustada al relieve con180muestras de
altura positivas; el resto mantiene la traslación de cámara anterior. Son escenas
y tiempos de asentamiento distintos, NO comparaciones A/B ni ranking de motores.
GPU elapsed incluye burbujas de ejecución. Manglares no cumple20–23ms GPU.
`summarize-coalesced-water-controls.py` verifica las condiciones y produce
`coalesced-water-six-biome-controls.json`.

Inspección final de este pase: Sabana conserva cubierta dorada y suelo visible;
Manglares conserva helechos, suelo verde/barro localizado y ribera; Desierto
mantiene las dunas aprobadas; Volcanes conserva roca oscura/ceniza/lava; Cañón
muestra suelo continuo bajo props. La vista final de Cañón no encuadra el río,
por lo que NO valida sus orillas. Gran Río fue inspeccionado en el control pausado
final; su captura activa permanece conservada, sin nueva inspección específica.
No se modifican assets ni receta gráfica.

Pendiente para cerrar esta optimización: controles nocturnos y de calidad baja,
cancelación/cambios de calidad con camas pendientes en juego real y A/B/A/B de
rendimiento/latencia. No extrapolar seis controles diurnos a aceptación integral.
