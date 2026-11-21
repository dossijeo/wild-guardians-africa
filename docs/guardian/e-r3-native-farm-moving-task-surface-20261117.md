# Farm retenido → Task en Surface y GPU originales

Continúa el [actor Farm→Task](e-r3-native-farm-moving-task-graphics-20261117.md) según el [plan principal](integrated-gpu-migration-plan-20261104.md). El relevo ya atraviesa el Surface, los Workers, los puertos de recursos/control, el Host y la GPU originales. Usa el preparador Task14 existente: no se añade otro protocolo ni se sustituye la arquitectura. La única modificación del producto identifica la textura Farm por actor y solicitud para comprobar su retirada exacta en la traza. A6/A/B/C siguen abiertos; D no iniciado.

## Código consultado y decisión

Se inspeccionan [`Queue::on_submitted_work_done` de wgpu v26.0.1](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/queue.rs#L1435) y [`LifetimeTracker::add_work_done_closure`](https://github.com/gfx-rs/wgpu/blob/v26.0.1/wgpu-core/src/device/life.rs#L345): las referencias y callbacks se asocian al envío cuya terminación los libera. Se mantiene el drain existente y se comprueba la retirada tras el relevo real, sin fence, cola o dependencia nueva. La conservación del actor sigue el patrón de geometrías compartidas de [`Mesh.copy` de Three r180](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L112), consultado en el incremento anterior.

## Recorrido real y propiedad

El arnés original carga un cultivo maduro residente antes de Farm23. Encola la Task mientras el trabajador todavía llega a la granja; no excluye `arriving` de su prioridad ni inventa Idle. Adquiere la parada24 preparada y después reclama la misma Task mediante el planificador ordinario, con solicitud6 pendiente de recursos. Publica ese estado confirmado como secuencia4 antes de preparar14.

Mientras el preparador se bloquea1800 ms, el cuerpo Farm permanece en su pose final y el otro trabajador nativo sigue su ruta Home independiente. TaskStart14 utiliza ese origen/fases/presupuesto y adquiere el mismo cuerpo. En el pase final, el tiempo efectivo se revalida de19,24 a21,64. La publicación confirmada5 se adopta con el ACK14/version1 del Host, los relojes y el picking del frame realmente enviado. El arnés comprueba ambos actores y termina con drain real.

La traza identifica exactamente una textura obsoleta con `wg-native-farm-arrival-route:<actor>:<solicitud>`. Se exige su destrucción tras el relevo y se prohíbe retirar cualquier otro buffer de vértices/índices o textura que estuviera vivo. También se rechaza reconstruir geometrías, copiar buffers/texturas residentes o recompilar un WGSL idéntico. No hay exenciones por identificadores GPU elegidos a mano.

## Evidencia de GPU y continuidad

En NVIDIA/Turing, el pase final con traza conserva646 IDs de buffers de geometría/texturas, incluidos los bancos, y retira únicamente la tabla Farm declarada. Prepara70 recursos:36 buffers de uniformes con uso72, una textura de trayectoria130×1, un sampler,16 bind groups y16 layouts de bindings. Crea cero shaders/pipelines y cero recursos después de READY. El primer pase sin traza también pasa, con648 IDs residentes conservados dentro de esa ejecución; los identificadores no se comparan entre sesiones.

Hay54 dibujos durante el bloqueo de preparación y54 después del commit mientras el preparador sigue bloqueado. La ventana completa del relevo contiene129 muestras del Host: máximo34,89 ms y máximo de `drawMs`4,065 ms. Tras el commit, el máximo de intervalo observado es33,47 ms. Son intervalos y duraciones registrados por el Host; `drawMs` no es una consulta de tiempo GPU ni una medición del compositor.

La captura completa contiene785 muestras y cinco intervalos superiores a50 ms, con máximo139,89 ms. Los cinco ocurren durante el montaje inicial, antes de empezar a preparar Farm23, con reloj nativo10. No se atribuye su causa a partir de esta coincidencia temporal. Se conserva la traza completa de146.742.183 bytes/652.336 eventos y el mapeo temporal del marcador de auditoría. Esto no demuestra ausencia general de tirones ni resuelve las mediciones históricas64,27/86,81 ms; las capturas/checkpoints y la instrumentación forman parte del arnés.

La regresión real de Idle detenido→Task también pasa en NVIDIA/Turing:683 IDs retenidos,70 recursos preparados, cero después de READY,54 dibujos durante preparación y53 después de adquirir, publicación8 adoptada y drain correcto. Las capturas Farm muestran los actores originales y su desplazamiento; no sustituyen la paridad visual de todos los biomas/estados.

## Rechazo y validaciones

El control negativo elimina únicamente la plantilla Task14 del paquete preparado mediante una ruta de lectura del navegador. El Host devuelve `control-failed` por identidad retenida ausente antes del commit14. La asociación TaskStart sigue nula, la misma Task continúa pendiente y las coordenadas físicas coinciden exactamente con la fuente Farm detenida. Farm23 y24 se han ejecutado realmente antes de ese rechazo; no se afirma deshacer esas adquisiciones.

La [evidencia verificable](performance/native-farm-moving-task-surface-validation-20261117.json) recoge ejecuciones, recursos, intervalos, traza, hashes, pruebas dirigidas, regresión y build del árbol congelado. Los64 inputs/artefactos nativos no cambian ni se recompilan. Se preservan los16 archivos locales ajenos, el worker pthread sin seguimiento y los bytes previos de los cuatro documentos principales. Los siete fallos históricos fuera de la selección permanecen abiertos.

Quedan Farm→Home, finales Idle/Task/Home, cohort y productor ordinarios completos, guardado/recuperación y continuidad global. Esta aceptación usa fuente en la página, mundo desértico mínimo y el peer Home explícito del arnés: no acredita aún el productor de partida ni la recuperación incremental de los3.123 recursos. Se mantiene A/A6 → B1–B7 → C antes de D.
