# Actor Farm23 terminada → Home19/18

Continúa el [control terminal Home](native-farm-arrived-home-control-20261118.md) dentro del [plan integrado](integrated-gpu-migration-plan-20261104.md). El roster reconoce la ascendencia23 instalada y prepara Home sobre el actor original. No fabrica una parada24 ni una historia Idle. Surface, puertos, recibos y GPU de este relevo siguen pendientes; A6/A/B/C permanecen abiertos y D no se inicia.

## Referencias y decisión

Antes de implementar se consulta el código real de [`Mesh.copy` de Three.js r180](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L111) y [`SkeletonUtils.clone`](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/SkeletonUtils.js#L388), tanto en la dependencia instalada como en su fuente upstream. El primero comparte geometría y referencias de materiales; el segundo reconstruye la correspondencia del esqueleto al crear una instancia. Adaptamos la separación entre datos compartidos y estado de instancia: este relevo conserva incluso la instancia ya residente y prepara sólo su variante/movimiento Home. No añade dependencias ni cambia el propietario del actor.

## Continuidad y residencia

`homeRequestContinuesCompletedFarm` comprueba la asociación23 instalada, su cuerpo/perfil/flags, época/sesión, secuencia posterior y tiempo posterior al final real. Lee únicamente la última fila nativa inmutable del paquete Farm: llegada completa, velocidad cero, x/z/yaw, fases, radio y presupuesto. No evalúa una trayectoria ni calcula una pose en JavaScript. La entidad Home confirmada también debe coincidir con el request19 y la política del actor original. Se reutiliza la captura de política ya empleada por Task; no se amplían sus exclusiones.

El final de la fila permanece en la época preparada, mientras que la asociación emitida aporta el final físico real. Esta distinción admite un Farm adquirido tarde sin alargar su ejecución ni exigir que ambos tiempos absolutos sean iguales. El nuevo Home conserva la traducción temporal y el binding ya existentes. Cancelación/rollback restauran la presentación anterior; la adopción retira el movimiento Farm mediante el mecanismo diferido original.

La raíz, mallas, geometrías, índices y bancos de animación permanecen idénticos. Se observa una sola adquisición del modelo y un único propietario de movimiento después de retirar el anterior. La preparación temporal mantiene ambos propietarios hasta cancelar o adoptar correctamente. Estas observaciones se realizan con el registro real y dobles de admisión/render; no son un recuento de asignaciones físicas WebGPU.

## Validación y límites

Pasan38 casos nuevos y95 dirigidos con regresiones de Farm23→Task y Farm24→Home. Incluyen cuatro perfiles, marcha/carrera y llegada con viaje o ya dentro del radio; preparación, rollback, revalidación tardía y adquisición18; cambios de asociación, cancelación/removal, política, pose, perfil y aldea; picking ordinario sobre la misma raíz; compilación real TSL de color/sombra compartiendo los bancos; variante pthread y dos adquisiciones tardías del Farm original.

Dos controles negativos de sólo lectura fallan una vez con37 casos filtrados y cero cancelaciones. El módulo de `f6b321249` rechaza el extremo23 al preparar Home. Eliminar únicamente la comprobación de política de la nueva rama permite indebidamente preparar sobre otro `contractDay`. Los controles no modifican código de producto.

La regresión amplia pasa2718 de2719 casos en250 archivos, con cero fallos/cancelaciones y una omisión opcional, en416.321s. Build de producción pasa en1m35s. Los410 inputs congelados y64 inputs/artefactos nativos coinciden con la evidencia; no se reconstruye WASM.

No hay nueva prueba GPU en este incremento. La evidencia anterior del relevo Task no se atribuye a Home. El siguiente punto es conectar y validar el relevo terminal Home en la Surface y los puertos originales, con conservación de recursos físicos, bloqueo del preparador, picking, adopción y drain. Siguen abiertos final Idle, productor/cohort, recuperación incremental integral de3.123 recursos y aceptación global de cadencia/plataforma. No se declara ausencia de tirones.

Los [resultados y hashes](performance/native-farm-arrived-home-graphics-validation-20261118.json) identifican los inputs exactos. Los16 archivos ajenos y el worker pthread sin seguimiento se conservan; se añaden entradas a los cuatro documentos principales preservando sus bytes anteriores.
