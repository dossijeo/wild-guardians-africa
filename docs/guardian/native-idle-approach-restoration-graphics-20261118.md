# Actor de la aproximación restaurada

Continúa la [declaración/restauración nativa](native-idle-approach-restoration-20261118.md) y el [plan integrado](integrated-gpu-migration-plan-20261104.md). El roster adquiere22 desde la solicitud fría y luego REST21 sobre el mismo actor. Surface/puertos/Host/GPU de esta restauración siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Referencias y cambio

Se consulta el código real de [`Mesh.copy` de Three r180](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L111), que comparte geometría y materiales (copia el contenedor si es un array), y [`SkeletonUtils.clone`](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/SkeletonUtils.js#L388), que reconstruye la asociación de huesos al crear la instancia. Se conserva incluso el actor ya creado, con su esqueleto enlazado. No se añade dependencia, caché, registro o propietario.

La fuente pendiente contrasta ahora el tipo de la solicitud con el destino semántico de Game. Un DTO que parezca un paseo local no puede preparar el actor de una aproximación, ni Game puede convertirse anticipadamente en local para aprovechar su solicitud de aproximación. La comprobación es necesaria incluso dentro del radio, donde ambos DTO pueden parecer geométricamente válidos.

Al llegar22, el comprobador de21 reconoce el descanso de nacimiento y el destino ancla tanto desde Farm viva como desde `sourceRequest.approach`. El paseo local mantiene descanso0 y destino `idle-worker`. Se reutilizan variante, activación reversible, retarget de reloj, rollback y retiro diferido existentes. Al adquirir21 se retira el dato de movimiento22; no se recrea la raíz, las mallas, geometrías, índices o bancos.

## Evidencia

Pasan24 pruebas nuevas y152 dirigidas en8 archivos. Los cuatro perfiles cargan aproximaciones dentro del radio y ya llegadas;22 y21 mantienen un único acquire, actor/raíz/posición estática/geometrías/índices. Los bancos Walk/Run/Idle/Alert, incluidos los no usados, conservan datos y versión y no reciben dispose antes del cierre de la fixture. Se comprueban cancelación, eliminación, cambio de nacimiento/tipo/RNG/destino/pose/marcador, retarget, pthread, prueba de finalización ajena y rollback de REST sin cambiar Game anticipadamente.

El constructor TSL real compila color y sombra con los bancos Walk/Idle y la referencia fría exacta, sin tags Farm. Picking sigue el reloj enviado simulado y la trayectoria nativa sobre la geometría original, sin desplazar permanentemente la raíz. Modelos, bancos, terreno y WASM son reales; renderer, admisión y reloj de picking son dobles. Esta evidencia no prueba identidad de recursos físicos GPU, ACK retenidos ni drain.

Las nueve pruebas iniciales reproducen ocho rechazos incorrectos del relevo a21 y una aceptación incorrecta de tipo local. Contra las24 pruebas finales, el roster anterior cargado de sólo lectura produce11 fallos esperados y13 aprobadas. Retirar sólo la guardia de tipo produce dos fallos esperados,22 casos filtrados y cero cancelaciones. No se altera el producto para ejecutar esos controles.

La regresión amplia de262 archivos termina con2990/2991 aprobadas, cero fallos/cancelaciones y una comparación opcional omitida. Build correcto;433 inputs y64 inputs/artefactos nativos coinciden con el congelado. No se reconstruye WASM. Los [resultados, referencias y hashes](performance/native-idle-approach-restoration-graphics-validation-20261118.json) delimitan la evidencia.

Se preservan16 archivos ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales. Siguen Surface/puertos/Host/GPU de la aproximación fría, cancelWalk/REST/reintento nativos cuando falta conector, productor/cohort, recuperación integral de3.123 recursos y aceptación global de cadencia/plataforma. Las regresiones previas con picos de cadencia y Home264/147ms permanecen abiertas.
