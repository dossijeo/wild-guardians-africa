# Actor Farm23 terminada → Idle21

Continúa el [control Farm→Idle](native-farm-arrived-idle-cycle-control-20261118.md) del [plan integrado](integrated-gpu-migration-plan-20261104.md). El roster prepara el programa Idle21 sobre el actor Farm residente. Conserva el estado `arriving` hasta la adquisición real, sin fabricar20/24 ni adelantar la proyección Game. Surface, puertos, Host y GPU del nuevo relevo siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Código consultado y decisión

Se consulta el código real de [`Mesh.copy`](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L111) y [`SkeletonUtils.clone` de Three.js r180](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/SkeletonUtils.js#L388). Three comparte geometría y referencias de materiales al instanciar; el clon del esqueleto pertenece a la creación de la instancia. Adaptamos esa distinción conservando incluso el actor ya creado. No se añade dependencia ni se sustituye su arquitectura de bancos, variantes, bindings o retirada diferida.

## Fuente y presentación

`idleCycleContinuesCompletedFarm` contrasta el origen23 con la asociación instalada y su última fila nativa inmutable: actor/cuerpo, flags/perfiles/centro, época/sesión, secuencia, radio, x/z/yaw, fases y presupuesto. Exige llegada y velocidad cero. La fila conserva su época preparada; `sourceAt` y el límite físico proceden del final REAL de la asociación emitida. No se interpola ni recalcula una trayectoria en JavaScript.

Se reutiliza la captura de política existente para impedir prestar el actor a otro contrato o persona. Mientras se prepara el primer21 desde Farm, la entidad debe seguir `arriving`/`native-farm-arrival`, sin tarea, ruta o Idle semántico anticipado. Los primeros orígenes20/22 y los ciclos posteriores mantienen sus ramas originales.

La variante reutiliza el reproductor Idle/Alert, soporte de terreno, bloqueo de preparación, materiales alternativos y reemplazo de binding actuales. Idle y Alert pertenecen al mismo programa finito; no se añade un timer de transición ni otro shader de movimiento. La adquisición conserva raíz, mallas, geometrías e índices y sólo entonces retira la textura de trayectoria Farm. El ciclo estacionario no necesita una textura de trayectoria nueva.

Los bancos cargados conservan identidad, datos y versión y no reciben eventos de `dispose`, incluidos Walk/Run que el ciclo nuevo no usa. Alert se solicita al banco existente si es necesario; la fixture incorpora su biblioteca real para esta nueva transición. Cancelación y rollback restauran los materiales anteriores. Retarget sólo cambia los tags de reloj del candidato compatible; una asociación de otro cuerpo no puede finalizar ni retirar el movimiento anterior.

## Validación y límites

Pasan las33 pruebas nuevas y las128 dirigidas en4 archivos. La regresión de253 archivos termina con2812/2813 aprobadas, cero fallos/cancelaciones y una comparación opcional omitida (432552.8663ms). Build correcto en1m47s. Los416 inputs probados y64 inputs/artefactos nativos permanecen idénticos al congelado; no se reconstruye WASM.

Los tres controles negativos de sólo lectura fallan una vez como se esperaba con32 casos filtrados y cero cancelaciones. El roster de `d918a7b60` rechaza el origen Farm. Quitar sólo la igualdad del cuerpo permite prestar otro cuerpo; quitar sólo la política permite preparar desde un contrato/persona incompatible. Ninguno modifica código de producto.

La validación usa WASM standalone/pthread, modelo y bancos GLB originales, terreno y compilador TSL real, con dobles de renderer/admisión y reloj de selección. Las compilaciones de color/sombra comparten Idle/Alert y no conservan uniforms etiquetados con Farm. No hay nueva evidencia de dispositivo, paquete retenido, recibo ni drain de Idle21. Los resultados GPU anteriores de Home no se atribuyen a este incremento.

El siguiente punto es el relevo en la Surface original: preparar mientras Farm continúa, adquirir21 y comprobar reposo/vigilancia, selección, identidad física de recursos y drain con el preparador bloqueado. Siguen aproximación nativa al ancla, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación global de cadencia/plataforma. La medición Home264/147ms continúa documentada y sin aceptación; no se declara ausencia de tirones.

Los [resultados y hashes](performance/native-farm-arrived-idle-cycle-graphics-validation-20261118.json) identifican el alcance exacto. Se conservan16 archivos ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales.
