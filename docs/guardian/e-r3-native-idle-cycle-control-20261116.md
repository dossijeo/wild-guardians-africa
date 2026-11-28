# Ciclo Idle en el control directo existente

Continúa la [fuente del ciclo nativo](e-r3-native-idle-cycle-source-20261116.md), sobre `bca479e0a`. La adquisición y su siguiente petición se transportan como hechos tipados y pueden asociarse al registro gráfico existente. No se anuncia todavía un consumidor gráfico preparado de la familia 21 ni cambia ningún cierre A6/e-R3/e-R4/f-R4/A/B/C.

## Referencias y asociación

Se leyó la implementación real de [ObjectStorage en Dawn, revisión 922930e3](https://github.com/google/dawn/blob/922930e3193753e58591f14a96ab116e5d630964/src/dawn/wire/server/ObjectStorage.h), especialmente `FillReservationImpl`: exige estado Reserved y generación coincidente antes de asignar el handle y pasar a Allocated. Se mantiene esa separación entre datos emitidos y permiso instalado.

También se contrastaron ActorContext, proofLeaseCurrent, installInitialIdleBodies e installSettlements antes de extenderlos. El mismo actor conserva fuente emitida, prueba instalada, registro capturado y petición sucesora. No se añade registro de cuerpos, controlador, modelo de movimiento, dependencia ni reloj. La asociación inmutable se compara en la frontera y se conserva mediante la caché existente; la reproducción consulta identidad, estado y límites vigentes.

## Eventos y ciclo de vida

Los dos eventos nativos de estado 7 llevan datos distintos: `idleCycle` para su adquisición exacta y `idleCycleNext` para el sucesor de descanso o paseo. Una vigilancia ya agotada puede emitir ambos en el mismo lote; siguen siendo dos secuencias diferentes. El camino permanece en la autoridad nativa: el control transporta únicamente los datos semánticos del destino, sin conceder movimiento.

Preparar requiere el padre admitido exacto, o el ciclo anterior con su petición real de descanso. Una adquisición nativa permite conservar el candidato preparado, pero no dibujarlo: faltan todavía su marca causal y la instalación explícita. Esta última comprueba fuente, cuerpo, programa, época/sesión, frontera y secuencia; los lotes inválidos o duplicados no se instalan parcialmente. Una nueva secuencia por sí sola no sustituye la adquisición tipada.

El registro conserva identidad mientras espera descanso o paseo. La emisión del siguiente ciclo lo revoca. Una petición genuina de TaskStart o Home conserva el cuerpo y fija el límite de fase al instante de interrupción, incluso si llega antes de instalar la asociación gráfica del ciclo. La ruta realmente adquirida, retirada física, reset o cierre revoca el registro. TaskStart comprueba el cuerpo tanto al preparar como al instalar; Home debe conservar exactamente cuerpo, orientación, fases y presupuesto antes de avanzar el cursor.

El baseline incluye los ciclos y sucesores existentes como metadatos. No crea un permiso gráfico ni permite convertir un arranque histórico en una adquisición en vivo. Host lo rechaza explícitamente mientras falta su consumidor histórico preparado; tampoco presenta la ascendencia física20 como un ciclo21 ejecutable.

## Evidencia y pendientes

**21/21 pruebas nuevas**, con fuente WASM, eventos, relojes y control reales: descanso/vigilancia, retiming durante avance de un compañero, reloj retrasado, lotes atómicos, identidad/familia inválidas, sucesor de descanso/paseo, nuevo ciclo, Task/Home pendientes, peticiones inmediatas antes de instalar, retirada/reset/cierre y baseline sin permiso. El test negativo de Host ejecuta su implementación real con cola GPU simulada y comprueba cero envíos; no constituye evidencia hardware.

TaskStart usa la asignación real de tareas de Game y su admisión nativa. Home usa la petición ABI nativa genuina y refleja únicamente su estado semántico aceptado. Su llamada ordinaria de Game sigue rechazando21 porque falta el nuevo proyector; no se ha relajado ese bloqueo para pasar la prueba.

Resultados finales de regresión, build y preservación en [la validación](performance/native-idle-cycle-control-validation-20261116.json). Ambos módulos y sus fuentes nativas permanecen exactamente como en `bca479e0a`; los 16 archivos locales originales protegidos conservan sus bytes.

Continúan pendientes transactor y consumidor preparados21, fase en color/sombra/selección y medición GPU, proyección y persistencia de Game, aproximación, sustitución del ancla, ejecución real del paseo y retorno, interrupciones integradas, puertas y productor ordinario. Este control no demuestra nuevas cifras GPU ni recuperación incremental de los 3123 recursos sanos. Nacimiento en vivo, sustitución de mundo y A/B/C siguen abiertos.
