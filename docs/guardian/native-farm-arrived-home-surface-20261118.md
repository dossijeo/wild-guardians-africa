# Farm23 terminada → Home19/18 en Surface y GPU

Continúa el [actor terminal Home](native-farm-arrived-home-graphics-20261118.md) del [plan integrado](integrated-gpu-migration-plan-20261104.md). El nuevo caso `QA_NATIVE_FARM_ARRIVAL_HOME=true` valida el relevo directo en la Surface, puertos, Host y GPU originales, sin24 ni historia Idle fabricada. Completa la evidencia de identidad/admisión/selección/drain de este componente. **La cadencia no está aceptada**: una ejecución sin capturas registra dos tirones dentro del relevo. A6/A/B/C permanecen abiertos; D no se inicia.

## Reutilización e integración

Se conserva la decisión contrastada con el código real de [`Mesh.copy`](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L111) y [`SkeletonUtils.clone` de Three.js r180](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/SkeletonUtils.js#L388): datos compartidos, estado de instancia y vida útil diferenciados. Este incremento sólo amplía el ensayo existente; no añade mecanismos de producto, dependencias, registros, timers ni fences.

El caso espera la llegada real de Farm, publica el extremo nativo, comprueba ausencia de24/Idle y solicita Home por la API real de contrato. Usa la fuente tipada de Farm completa, el mismo escenario Home previamente suspendido, los dos bloqueos de1800ms y los puertos existentes. Extiende también sus condiciones de terreno coordinado, retención de revisiones, timeline y espera de arranque. La autoridad sigue en la página; el trabajador B y la entrada de aldea son fixtures explícitos. No acredita el productor/cohort ordinario ni la recuperación integral.

La cámara inicial desde el noreste deja visibles el extremo y el corredor Home. Los intentos anteriores desde el sur/oeste seleccionaban correctamente el edificio que ocultaba al trabajador; no se ha modificado el picking ni ocultado geometría. Otro intento reprodujo la falta de la espera de terreno del nuevo modo; se incorporó al gate existente. Los recibos fallidos se conservan separados.

## Evidencia de hardware

Pasan una ejecución visual, una sin capturas y otra con traza en NVIDIA/Turing. Conservan respectivamente646/644/644 IDs físicos de geometrías, índices y bancos, el actor/rig/instancia original y el mismo cuerpo nativo. Sustituyen exactamente una textura de movimiento, preparan70 recursos antes de READY y crean cero después; no se crean shaders ni pipelines nuevos durante Home. Los IDs se comparan dentro de cada ejecución, no entre procesos.

La fase Idle continúa mientras se retiene el extremo físico finito. Pasan selección ordinaria del extremo, Home y B, adopción de secuencia5 y retirada/drain. El control negativo elimina sólo la plantilla Home preparada, interceptando una coincidencia: falla con `Pending Home clock differs from its retained template` y no adquiere18. No cambia archivos de producto.

Las tres capturas de la ejecución visual se inspeccionan: Farm admitida, extremo y Home. Son una comprobación del escenario; no cierran la paridad visual general de C. Los cuatro módulos editados pasan `node --check`. La implementación de producto permanece idéntica a `8c2f23128`, cuya regresión pasó2718/2719 casos en250 archivos con una omisión opcional y cuyo build pasó en1m35s. Esas comprobaciones preceden a los cuatro cambios del ensayo; no se presentan como una nueva ejecución sobre sus inputs finales.

## Cadencia observada y pendientes

La ventana completa abarca desde el primer bloqueo Home hasta la última inspección disponible después del segundo, incluyendo preparación, admisión y quiescencia. Se conservan también los resultados globales del consumidor:

| Ejecución | Dibujos en bloqueos | Ventana completa: máximo / >50ms | Global: máximo / >50ms |
| --- | --- | --- | --- |
| Visual | 54 / 54 | 33.555ms / 0 | 127.610ms / 5 |
| Sin capturas | 54 / 44 | 264.465ms / 2 | 264.465ms / 4 |
| Con traza | 54 / 54 | 35.025ms / 0 | 215.700ms / 6 |

La ejecución sin capturas registra oportunidades RAF separadas264.460 y147.310ms, ambas con dibujo enviado. Su hold de mutación dura10.465ms y los dibujos correspondientes duran1.750/1.445ms. Estos datos no atribuyen la causa de los huecos; la traza posterior no los reproduce. El baseline de esta plataforma previamente verificado ronda33.3ms. No se descarta la medición desfavorable ni se declara ausencia de tirones. La traza y los recibos quedan identificados por hash para continuar la investigación de cadencia.

Quedan Farm terminal→Idle, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación de cadencia/plataforma. La conservación observada en este relevo reducido no sustituye el criterio integral de reconstruir sólo recursos cambiados. Los [resultados y hashes](performance/native-farm-arrived-home-surface-validation-20261118.json) separan cada ejecución, sus límites y fallos exploratorios. Los410 inputs y64 nativos coinciden; no hay rebuild WASM. Se conservan16 archivos ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales.
