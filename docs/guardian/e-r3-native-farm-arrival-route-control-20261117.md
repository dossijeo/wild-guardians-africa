# Asociación de llegada nativa en el control directo

Continúa la [proyección semántica de Farm23](e-r3-native-farm-arrival-route-projection-20261117.md). El evento nativo de asignación incorpora su asociación real y el control existente puede conservar una preparación sin conceder replay hasta contrastar el reloj y la instalación. La publicación y el Host originales transportan ese evento por sus puertos actuales. El bootstrap de un Farm23 activo, el recibo/consumidor gráficos y Game/productor ordinarios siguen cerrados; A6/A/B/C permanecen abiertos y D no se inicia.

## Referencia y decisión

Antes de implementar se consulta el código real de [`dtCrowd::updateMoveRequest`, DetourCrowd 1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L795). Al recibir el resultado de la petición comprueba su éxito y contrasta el primer polígono con el extremo del corredor vigente antes de unirlos. Se adapta esa comprobación de procedencia actual: tanto la referencia preparada como la adquirida deben conservar la petición exacta que aún posee el actor. Se reutilizan el slot de actor, registro de ruta y watermark del control de Wild Guardians. No se introduce otra cola de resultados, navegación, reloj, registro de cuerpos o dependencia. El hash de la implementación consultada queda en la evidencia.

## Implementación

El lector del log consulta la asociación acotada sólo para actores con una nueva asignación y la incorpora únicamente a su secuencia de asignación real. No la añade a filas anteriores del mismo actor, no copia puntos de ruta y no enumera el cohort de Farm. Las lecturas sin eventos terminan antes de consultar bindings. El bloqueo anterior del lector de eventos se sustituye por estos datos tipados; el bloqueo de baseline para Farm23 activo se conserva.

El control valida actor, petición, centro/pose/fases, cuerpo, handle/generación, frontera, secuencias y exclusión de otras intenciones antes de cambiar su cursor. La asociación se retiene en el registro existente. La petición pendiente desaparece al consumirla. Una preparación puede seguir siendo válida durante la revalidación o después de recibir el evento, pero `isCurrent`, `routeRecord`, época y final de ejecución siguen cerrados hasta la instalación exacta bajo el watermark causal.

La instalación exige la asociación emitida, sus dos referencias y puertas, frontera actual y fuente original. Valida el lote completo antes de escribir; rechaza duplicados, aliases, bootstrap y reintentos. La admisión genérica de rutas no puede eludir el permiso tipado de Farm23. Tampoco se puede introducir un recibo Home/Task/Carry sobre ese registro mediante los modos de bootstrap existentes. No se aceptan finales o revocaciones de esta clase hasta implementar su relevo preparado. La llegada cero sigue siendo Farm y conserva su extremo exacto.

## Validación y continuación

Los resultados finales y sus hashes figuran en la [evidencia](performance/native-farm-arrival-route-control-validation-20261117.json). Las 18 pruebas nuevas cubren los cuatro perfiles caminando/corriendo, compañero Task durante la preparación, revalidación y reloj diferido, asociación ausente/malformada/mezclada o ajena, instalación atómica, llegada cero, cierre, pthread y coste acotado de las lecturas. Se actualizan las dos pruebas de fuente que exigían el bloqueo antiguo: ahora comprueban la asociación exacta publicada, conservando los rechazos de baseline y Game.

La prueba adversarial de Home fabrica un recibo estructuralmente válido con el mismo handle de Farm; antes de la corrección se aceptaba por bootstrap. El rechazo nuevo incluye también las instalaciones equivalentes de Task/Carry. Un loader ESM de sólo lectura retira el bloqueo de admisión genérica y hace fallar la prueba, sin modificar el árbol o los WASM. Son controles de permisos, no mediciones gráficas.

Las pruebas del Host usan su implementación y publicación originales con el dispositivo simulado del fixture. El evento real se aplica y acusa recibo; uno malformado cierra el Host. En ambos casos se envían cero frames GPU. La instalación directa de las pruebas y los commits de ABI son fixtures de confianza explícita: no acreditan que un consumidor gráfico haya preparado23. No cambia el código del Host ni se fabrica un recibo GPU.

Los 64 inputs/artefactos nativos permanecen exactos; no se recompila C++ ni se repite hardware por estos cambios de metadatos/control. Se ejecutan la regresión compartida y el build. Las medidas históricas de 569 IDs conservados, 30 recursos tardíos y máximo global de 66,72 ms siguen limitadas a la vertical previa; no validan Farm23 ni la recuperación integral incremental de 3.123.

El siguiente punto es el recibo preparado de Farm23 y su adquisición mediante los adaptadores existentes, puertos de recursos, roster/Surface y consumidor GPU. La publicación de liberación aún carece de esa familia y no puede instalarla en el Host. Siguen pendientes parada durante movimiento, finales Idle/Task/Home, alternativas de entrada del cohort, contratos/puertas/raid, productor ordinario, guardado UI y aceptación integrada. No se excluyen llegadas de la asignación original de Task para evitar implementar los relevos.
