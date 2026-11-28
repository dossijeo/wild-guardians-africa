# Frontera estable del productor nativo — 2026-11-19

Continúa `4c646d3c9` dentro de A4/e-R3/f-R4. El productor nativo ya existía y atendía las declaraciones de las familias20–22, Home y tareas mediante el planner/admisión comunes. Antes de conectar sus recursos a la partida, necesita poder terminar una operación asíncrona sin que un despertar posterior inicie otra mientras se obtiene el checkpoint o se sustituyen puertos.

## Código contrastado y decisión

Se leyó el código real de PhysX, revisión `7d6f6ac8b83e1610bdf715f1f2f1d6b718aee586`: [`NpScene::simulateOrCollide`](https://github.com/NVIDIA-Omniverse/PhysX/blob/7d6f6ac8b83e1610bdf715f1f2f1d6b718aee586/physx/source/physx/src/NpScene.cpp) exige una fase completa antes del siguiente trabajo; [`fetchResults`](https://github.com/NVIDIA-Omniverse/PhysX/blob/7d6f6ac8b83e1610bdf715f1f2f1d6b718aee586/physx/source/physx/src/NpSceneFetchResults.cpp) espera `checkResultsInternal` antes de procesar los resultados y callbacks. Se adapta esa distinción entre pedir una pausa y haber terminado el trabajo, manteniendo el propietario existente. No se incorpora PhysX ni otro ejecutor, reloj, cola o dependencia.

`createNativeIntentProduction` conserva su única operación `active.promise`. `quiesce()` bloquea nuevos despachos y devuelve la misma promesa a llamadas repetidas. Solo después de resolver la operación real devuelve un recibo local inmutable. `resume(receipt)` exige ese objeto exacto, ya resuelto, y lo consume; una copia o un recibo anterior no libera una suspensión nueva, incluso sin cambiar la publicación. Se reutiliza el patrón de identidad de recibo que ya emplea el cohort nativo, sin otro registro de consumidores ni permisos físicos.

Los comandos que llegan mientras termina una operación siguen comprobando su fuente y cancelan trabajo obsoleto. La barrera no cancela por sí sola una preparación válida ni modifica la simulación, sus reglas o sus rutas. Fallo y disposición permanecen terminales: esperar o reanudar nunca limpia el fallo. Sin productor activo, la autoridad devuelve `null` y conserva las decisiones existentes de cohorte inactiva/no soportada.

La autoridad expone `quiesceNativeIntentProduction` y `resumeNativeIntentProduction` dentro de su propietario actual. El recibo es local: todavía no se serializa ni se transporta. La futura conexión Worker/host debe mantener ese recibo en la autoridad y usar la identidad de RPC existente para evitar respuestas o reanudaciones tardías. No equivale al recibo GPU del cohort.

## Validación

Nueve pruebas nuevas: **0 pases/9 fallos** contra ambos módulos anteriores, cargados desde sus URLs originales; **9/9** con el código actual. La selección final pasa **833 dirigidas/59 archivos** y **4346 de 4347 seleccionadas/338 archivos**, 1 omisión opcional, cero fallos/cancelaciones en esas selecciones; tres sintaxis y build de producción completo **56.94s**. **608 inputs, 64 nativos intactos y 16 ajenos exactos**; no se reconstruye WASM.

Los tres controles preexistentes separados del host/timeline siguen abiertos:19/20 por handshake, no terminación en25s y3pases/2fallos por `releaseCommand`. Sus reproducciones antes/actual y exclusiones proceden del recibo de `6445f17ae`; este incremento no se atribuye su cierre ni otra ejecución de esos controles. No se proclama suite universal.

Fuentes inspeccionadas, baselines, logs completos, selección, sintaxis y hashes: [recibo de validación](performance/native-production-quiescence-validation-20261119.json).


Se usan Wild Engine/WASM, autoridad, planner, familias de movimiento, commits nativos y MessageChannel reales. El Host remoto y sus paquetes usan una cola GPU determinista de prueba. Se bloquea tanto el inicio de preparación como un paquete ya preparado, se compara el checkpoint C++ final con la frontera final del control, y se verifica que el siguiente trabajo no empieza hasta consumir el recibo. Un comando Harvest real invalida el WALK pendiente y su Task14 espera hasta reanudar. Se cubren recibos repetidos/copias/obsoletos, fallo de preparación, disposición, cohorte inactiva y cohorte mixta no soportada.

Las primeras comprobaciones ampliadas se conservan en los logs: una esperaba la proyección Task antes de un tick real; otra buscaba un evento de recursos de mundo que no es el canal de la adquisición22; otra comparaba el ticket propuesto con el final, aunque la readmisión existente puede renovarlo. La prueba final usa el avance real para la proyección y contrasta checkpoint/control finales, sin alterar esas reglas, los permisos o el código de admisión.

## Conexión pendiente

`main` ya conecta el control nativo, pero aún no conecta `attachNativeResourcePreparation`. La barrera se añadirá a la obtención del checkpoint y al relevo de esos puertos. Debe suspender nuevos trabajos, esperar el actual, publicar una vista autoritativa coherente y reanudar únicamente cuando la conexión nueva esté lista. El dispatch/reloj del host y la admisión física siguen teniendo sus propios contratos.

Este recibo confirma el fin de la operación del productor. No confirma por sí solo que el endpoint gráfico haya procesado su último mensaje de commit: la coordinación del transporte debe conservar su preflight/ACK real y no sustituirlo por esta promesa. Tampoco permite reactivar un cohort o productor fallido durante device loss.

No hay nueva ejecución GPU hardware ni aceptación de partida/cadencia en este incremento. Los cinco casos GPU de `4c646d3c9` son evidencia anterior y no se presentan como pruebas de esta nueva barrera. Productor/cohort ordinarios, paradas, relevos, personajes/puertas, cadencia y plataformas siguen pendientes; A6/A/B/C permanecen abiertos y D no se inicia. f-R3 conserva su cierre de seguridad.
