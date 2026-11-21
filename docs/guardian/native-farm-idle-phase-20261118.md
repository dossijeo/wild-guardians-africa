# Idle continuo y relevo Farm23 terminada → Task14

Continúa el [actor original](native-farm-arrived-task-graphics-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). El consumidor original completa Farm23, mantiene Idle mientras Task6 espera y adquiere Task14 sobre el mismo cuerpo y actor. Conserva la cota física de23 y sus recursos inmutables. Se acredita este componente en Surface/Workers/puertos/Host/GPU; productor ordinario, otros finales, cohort y recuperación integral siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Implementaciones consultadas y adaptación

Se consulta el código real instalado de [`AnimationMixer.update` de Three r180](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationMixer.js#L670) y [`AnimationAction._updateTime`](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js#L711): el reloj global sigue avanzando mientras cada clip conserva su tiempo local y repetición modular. Se adapta esa separación al uniforme de origen Idle ya existente. El shader sigue sumando origen y edad del estado; el Host corrige sólo ese origen para que el bucle continúe cuando la trayectoria queda limitada a su última fila. Se reutilizan textura, grafo TSL, variantes y uniformes. No se añade dependencia, timer, trayectoria/pose JavaScript, banco o programa de movimiento.

También se reconsulta [`RawId::zip/unzip` de wgpu26.0.1](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/id.rs#L42) y [`ActiveSubmission`/`LifetimeTracker::triage_submissions`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L26). Se conserva la distinción entre identidad/generación, duración de ejecución y residencia hasta el fence. La lease Farm instalada existente es la procedencia del cuerpo terminal; el fin de su corredor no fuerza a destruir sus datos ni autoriza otra ejecución.

## Reloj, extremo y picking

La semántica `idle-offset` tiene versión de capacidad propia y sólo admite referencia Farm23, época y período válidos. El Host exige además el reloj relativo del mismo recurso con su margen terminal certificado. La corrección modular comparte la aritmética float32 conservadora del decodificador: sólo compensa la edad que deja de crecer en el extremo. La cobertura del bucle pertenece al cuerpo admitido; `executionEnd` y `routeRecord.safeUntil` siguen finitos.

Al alcanzar el final se permite consumir el margen ya certificado por `nativeClockResourceEnd`, para llegar realmente a la fila terminal tras descontar las ulp del decodificador. El desplazamiento continúa limitado por la tabla finita. El tiempo registrado como última presentación física se limita al final de ejecución; el tiempo del bucle no se registra como movimiento nuevo.

La barrera de mutación reconoce exclusivamente la lease Farm instalada que todavía es actual y cuyo cuerpo conserva su extremo durante Task6. El guard genérico anterior rechazaba14 porque `safeUntil` era anterior al tiempo de la solicitud. No se amplía esa cota: se comprueba la retención tipada existente. Adquirir14, invalidar la fuente o retirar al actor cierra ese permiso; un registro nuevo sin instalación gráfica no lo obtiene.

Cada frame enviado contiene el offset float32, período, época de ejecución y edad física. El picking exige el reloj físico compañero, verifica la corrección contra el reloj del frame y consume ese offset exacto. Rechaza datos alterados, asociaciones mezcladas o el offset sin su reloj físico. Los períodos forman parte de la clave de esos hechos; no se reemplaza una fase por la de otro clip. El roster conserva el actor original y la Surface pasa los datos del frame enviado.

## Validación de código

Pasan16 casos nuevos finales. Incluyen cuatro perfiles con posición/rumbo/fases nativas fijos e Idle avanzando, cuatro perfiles con adquisición normal/tardía por cliente/Host y Task6 real, picking alterado/incompleto, capacidad ausente, reloj de decodificación ausente y quiescencia seguida del cierre del permiso antiguo al adquirir14. WASM y activos son reales en estos casos; la regresión incorpora NodeBuilder de color/sombra real. Los dispositivos de esos tests son dobles. La selección inicial de compatibilidad pasó199 casos antes del ajuste final del guard.

Dos controles negativos de sólo lectura fallan una vez cada uno, con15 casos filtrados y cero cancelaciones: cargar el módulo de movimiento de `c81518bd6` reproduce Idle congelado; quitar sólo la excepción tipada de quiescencia reproduce el bloqueo del relevo. Las primeras ejecuciones hardware detectaron dos errores de configuración del harness (canal coordinado y secuencia omitida), corregidos antes del relevo, y después el rechazo real del guard anterior. Se conservan sus recibos por separado.

Pasan2.633/2.634 pruebas de247 archivos, con una comparación opcional omitida y cero fallos/cancelaciones. La misma ejecución incluye los16 casos nuevos. Build pasa en1m36s. Se congelan404 entradas y64 fuentes/artefactos nativos sin cambios respecto a `c81518bd6`; no se recompila WASM.

## Consumidor y hardware originales

El nuevo caso usa Farm23 realmente terminada, sin24 ni historia Idle. La tarea de cosecha se encola mediante la API ordinaria mientras Farm viaja y se reclama tras su llegada nativa. El productor de autoridad de este laboratorio sigue en la página; el peer Home tiene un corredor previamente autorado. Esto no acredita todavía el productor ordinario ni el cohort de la partida.

En NVIDIA/Turing pasan una ejecución visual y otra sin capturas. Ambas conservan646 IDs de geometrías/bancos, sustituyen exactamente una textura de movimiento y preparan70 recursos antes de READY; después crean0 recursos y0 shaders/pipelines. Root, huesos, mallas, instancias y bancos permanecen estables. Pasan ACK14, adquisición tardía, picking de ambos actores, adopción5 y retirada/drain final reales. Se inspeccionan las capturas del extremo y de Task. Idle avanza1.8s durante el bloqueo con error circular de fase7.63e-7s; la edad física terminal y el cuerpo permanecen fijos. Hay54 dibujos en cada bloqueo de1.8s.

La ventana completa observada del relevo (inicio del primer bloqueo hasta el último frame de comprobación tras el segundo) contiene128/127 muestras, con máximos38.03/35.78ms y ningún intervalo>50ms. Las capturas completas conservan843/849 muestras: máximos219.36/93.50ms y7/2 intervalos>50ms. La segunda ejecución no realiza PNG. No se atribuyen esas esperas sin traza ni se declara ausencia global de tirones. La evidencia de cadencia/plataforma anterior conserva su alcance.

La regresión hardware Farm24 → Home mantiene640 IDs, prepara70 recursos, crea0 después de READY y0 shaders/pipelines; tiene54 dibujos por bloqueo y drain real. Su ventana completa de relevo contiene124 muestras, máximo35.50ms y0>50ms; captura completa662 muestras, máximo64.54ms y4>50ms. Es regresión del consumidor retenido, no prueba del Home desde Farm23 terminada.

Los [recibos y hashes](performance/native-farm-idle-phase-validation-20261118.json) separan código, datos simulados, hardware, captura visual y timing. Permanecen los16 archivos locales ajenos, worker pthread sin seguimiento y bytes anteriores de los cuatro documentos principales. Siguen abiertos los finales Farm→Home/Idle, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación global de continuidad. Los siete fallos históricos fuera de la selección no se declaran reparados.
