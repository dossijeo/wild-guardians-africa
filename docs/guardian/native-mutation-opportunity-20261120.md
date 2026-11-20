# Mutación causal y oportunidades de presentación

Investigación subordinada a `MIGRATION-OBJECTIVE.md`, `A6-CHECKLIST.md` y al plan integrado. No cierra A5, A6 ni un gate de fluidez. Traspaso: [native-mutation-opportunity-handoff-20261120.md](native-mutation-opportunity-handoff-20261120.md).

## Problema confirmado

El intervalo de **49,415 ms** del recibo final de la corrección anterior pertenece al frame 30, con trigger `mutation-release`; su draw costó **2,455 ms**. El callback normal encontró `nativeMutationHold` y no pudo enviar comandos. La liberación válida dibujó inmediatamente, como exige la corrección anterior del 18 de noviembre. El recibo exacto no tenía CDP trace: no se le atribuyen retrospectivamente subfases de otra ejecución.

La nueva instrumentación desglosa solicitud, comienzo del hold, drenaje real, ACK, commit nativo, attestación, retención, publicación de reloj, release e instalación. En la primera incorporación Farm del baseline, el hold ocupó **16,985 ms**, de los que **1,730 ms** correspondieron al drenaje GPU. Otra mutación duró sólo **7,565 ms** pero cruzó un callback. Una transacción corta puede perder un fotograma si empieza cerca de él.

La candidata inicial coordinó READY con RAF. Sus tests locales pasaban, pero el recorrido completo la refutó: packet 305 publicó READY a `1795187950546.025`, y Quiesce llegó a `1795187952440.940`, casi **1.895 ms después**, tras un bloqueo de preparación deliberado del fixture. El hold 8 empezó **0,270 ms antes** del callback, duró **12,845 ms** y produjo un intervalo de **46,665 ms**. Esta candidata se descartó; su recibo, traza y fuentes se conservan como evidencia negativa, no como corrección entregada.

## Corrección

La admisión común solicita una **notificación de oportunidad inmediatamente antes de capturar `quiescence`**. El Host la devuelve después del intento RAF normal; bootstrap sin imagen activa, canvas sin configurar y consumidores ocultos no esperan a RAF. Un intento que no puede presentar también puede notificar: la nueva preparación puede ser lo que permita volver a dibujar.

Después de la espera, admisión vuelve a comprobar autoridad, publicación, consumidores, cancelación y validez de recursos. A continuación captura el estado esperado y ejecuta el Quiesce original, con sus igualdades de sequence/time/clock, primer uso preparado, fence real, attestaciones y release. No existe una espera nueva dentro de Quiesce que convierta esa captura en obsoleta.

`waitForMutationOpportunity()` **no es READY, permiso de mutación, ACK de drenaje ni reserva reutilizable de un fotograma**. No contiene tiempo lógico. Usa el canal directo existente, un único pendiente por conexión y un identificador separado de `holdId`/`fenceId`, ligado a session, epoch y consumerToken. Se negocia `mutationOpportunityVersion: 1` en el baseline. Los consumidores antiguos conservan el protocolo de seguridad original; no se afirma que adquieran esta mejora de cadencia.

El cohort espera las notificaciones de sus miembros antes de capturar holds. Mientras espera excluye attach y otras fronteras. Si una espera falla, cancela las demás y espera su settlement antes de liberar la exclusión. Cancelar esta fase no destruye por sí mismo un canal sano. El abort directo recibe una única respuesta, incluso si la notificación estaba ya en tránsito; nunca libera un hold físico. El cierre y la retirada conservan su confirmación de drenaje real.

No se añade renderer, temporizador de presentación, scheduler, caché de permisos ni repetición de un mundo obsoleto. Se mantienen el RAF original y la prohibición de submit entre drain y release.

## Pruebas y alcance

- Control negativo contra Host anterior: una mutación corta que comienza justo antes del callback pierde la oportunidad; la corrección lo rechaza.
- Adquisición aplazada después de READY, bootstrap, hide durante espera, cancel/retry, ACK en tránsito, retirement, dispose y device loss.
- Reentrancia, respuesta ajena, duplicada y timeout; ninguna notificación sustituye un recibo físico.
- Un intento sin submit libera la espera sin inventar una presentación.
- El flujo común Farm mueve al actor B durante la espera; avanzan cuerpo y `nativeRouteFrame.clockElapsed`, y después se obtiene el recibo fresco y se realiza el commit.
- Los tests existentes de hold largo siguen exigiendo cero submits durante drain/hold y release sobre el mundo correcto. La espera no oculta transacciones que duran demasiado.
- Los fixtures CPU pulsan su RAF virtual al recibir la solicitud de oportunidad. No hay escape de producción; los tests con RAF propio lo controlan manualmente.

La producción está en `77afcbbcf`; observador, informe y controles negativos en `3ce180f97`. Los recibos y mapas exactos están en [el manifiesto de evidencia](performance/native-mutation-opportunity-20261120/manifest.json).

La selección amplia de 388 archivos terminó con **5.091 tests: 5.083 pass, 3 fallos, 4 cancelaciones y 1 skip histórico**. Se conserva ese resultado rojo. Los casos afectados asumían ausencia de una oportunidad anterior al hold o comprobaban el comienzo del drain tras sólo vaciar microtareas. Se sincronizan ahora con el drain real y se cuentan los submits desde la frontera física; el caso adversarial que omite preflight conserva el rechazo fatal de Quiesce. Un caso adicional prueba el NACK normal, sin omitir preflight, con canal sano y sin commit. La repetición dirigida dio **297/297**, con los cuatro módulos de producción idénticos a la ejecución amplia y al build aprobado. Después, los ordinales y contadores terminales de QA dieron **12/12**. No se presenta la repetición dirigida como una segunda suite amplia verde.

Las pruebas CPU usan dobles de GPU y no demuestran cadencia física. Dos recorridos originales completos con GPU real, misma producción y demanda funcional, dieron:

| Ensayo | Draws que enviaron | Oportunidades | Holds completos | Oportunidades bloqueadas por hold | Mayor intervalo entre inicios de draw |
| --- | ---: | ---: | ---: | ---: | ---: |
| after2 | 2.458 | 2.478 | 10 | 0 | 38,750 ms |
| after3 | 2.463 | 2.484 | 11 | 0 | 40,885 ms |

Ambos finalizaron con `retired-drained`, sin pérdida declarada por CDP y sin cambios en los **9.059 inputs congelados**. after3 añade ordinales a QA: los 2.484 callbacks y 2.463 draws forman secuencias continuas desde 1 y coinciden exactamente con los contadores terminales. Las 21 oportunidades restantes fueron 14 de bootstrap y 7 ocultas. La cola posterior al último `inspect` está incluida. after2 tiene marcas de todos los callbacks hasta el terminal, pero no los nuevos ordinales; el lector final no le concede la misma comprobación por contadores.

El baseline y la candidata READY-only tienen snapshots anteriores al terminal. Se conservan como tales: no se toma su último snapshot como historia completa. En particular, el baseline contiene un hold 11 posterior, completo en CDP, que falta en los snapshots. Las marcas `release-draw-start` son testigos del intento de recuperación de una oportunidad bloqueada; no sustituyen su fila RAF ni prueban scanout.

Los mayores `RunMicrotasks` **del Host** en los dos ensayos corregidos fueron 7,954 y 8,677 ms. Las trazas completas conservan también trabajos mucho mayores en otros hilos, incluidos los de preparación inicial; no se publican esos máximos del Host como máximos de toda la aplicación. Los ensayos son headless, con instrumentación y capturas de timing; no son comparación de píxeles ni medición sin instrumentación.

## Caso que sigue abierto: admisión ordinaria

El máximo de 38,750 ms no es una mutación: packet 148 fue recibido a `1795190766969.355`, su admisión empezó a `1795190766985.485` y terminó a `1795190766991.030`. La microtarea del Host que lo contiene ocupa `6984.728→6991.097` (**6,369 ms**) y precede a RAF `6991.219`. No hay hold solapado. La traza y los tiempos del paquete confirman trabajo ordinario en el hilo de presentación; todavía hay que aislar su subfase. El máximo de 40,885 ms de after3 tampoco solapa un hold y conserva su ventana de traza.

**Astra conserva la investigación y corrección de este caso.** Sol lo recibe como base pendiente de contraste A4/C4, no como fluidez aceptada ni como problema atribuido al sistema operativo. No ampliar sobre él el productor que dependa de esa propiedad. El usuario ha fijado expresamente el objetivo en **60 fps (1000/60 = 16,666… ms)**. Los informes históricos conservan `targetMs: null` porque se generaron antes de esa decisión; los análisis siguientes deben usar el objetivo explícito. Los ~33,33 ms observados y los 30 Hz actuales de la pantalla no rebajan el requisito.

## Repetición y lectura de medidas

Se amplía el observador existente de `audit_native_farm_birth_world_owner.mjs`; no se duplica el fixture. Con la configuración funcional original, activar `QA_NATIVE_PREPARATION_TRACE=true` y `QA_NATIVE_MUTATION_TRACE=true` añade marcas opt-in. `QA_NATIVE_TRACE=true` conserva CDP para atribuir las subfases entre hilos. Cada recibo registra hashes de las respuestas originales y anotadas.

```powershell
.cache/tooling/node20.exe --test tests/native-prepared-ready-opportunity.test.js tests/native-mutation-release-presentation.test.js tests/native-intent-control-cohort.test.js tests/native-audit-mutation-costs.test.js tests/native-audit-mutation-report.test.js
.cache/tooling/node20.exe tools/guardian/native-audit-mutation-report.mjs .cache/mi-recibo.json .cache/mi-informe.json
.cache/tooling/node20.exe tools/guardian/native-audit-mutation-report.mjs .cache/mi-recibo.json .cache/mi-informe-terminal.json - .cache/mi-recibo.trace.json
# Objetivo de producto acordado: 60 fps.
.cache/tooling/node20.exe tools/guardian/native-audit-mutation-report.mjs .cache/mi-recibo.json .cache/mi-informe-60hz.json 16.666667
```

El informe separa intervalos entre callbacks, intervalos entre **inicios de draws que enviaron comandos**, coste síncrono de draw, duración de holds y oportunidades bloqueadas. `samples.at` es el comienzo del draw, no el instante de `queue.submit`. No fija 50 ms ni deduce el objetivo a partir de la mediana observada. Sin objetivo explícito, `targetExceedances` es null. Un exceso se conserva aunque el recorrido funcional pase.

`wholeHistoryPresent` sólo significa que existen las anotaciones; no certifica procedencia ni ausencia de truncación. `coverage.tracedLifetime` exige inicio, ordinales continuos y contadores coincidentes al terminal. Además se contrasta `dataLossOccurred: false`, el observador sin ring, hashes de fuentes y mapas congelados. El informe rechaza mezclar sesiones o varios hilos Host; no generalizar esta prueba a una cohorte con varios consumidores. Los holds incompletos o desordenados permanecen identificados. Un `release-draw-end` sólo demuestra que `draw()` retornó: el envío se contrasta con el sample y la oportunidad.

Un callback RAF o `queue.submit` no demuestra presentación física. El intervalo observado de unos 33,33 ms tampoco establece el objetivo del producto. Esta corrección aborda la colocación temporal de la barrera; no garantiza que una mutación arbitrariamente larga, un bloqueo del driver o una pausa del sistema quepa en cualquier frametime. Tampoco convierte coste inicial, compilaciones o nuevas regiones legítimas en reutilización caliente.

## Referencias contrastadas

Se leyó código real de Chromium en el commit `b830442dc74e5dc35b6b13e79a6f60914d7adbc9`, sin afirmar que corresponda al binario Edge del ensayo:

- [SchedulerStateMachine](https://chromium.googlesource.com/chromium/src/+/b830442dc74e5dc35b6b13e79a6f60914d7adbc9/cc/scheduler/scheduler_state_machine.cc): la fase de una transacción y la oportunidad de dibujar importan; una propiedad de recursos incompatible sí puede bloquear draw. No justifica retirar el guard de Wild Guardians.
- [LayerTreeHostImpl](https://chromium.googlesource.com/chromium/src/+/b830442dc74e5dc35b6b13e79a6f60914d7adbc9/cc/trees/layer_tree_host_impl.cc): preparación y activación conservan fronteras separadas.
- [FrameSequenceTracker](https://chromium.googlesource.com/chromium/src/+/b830442dc74e5dc35b6b13e79a6f60914d7adbc9/cc/metrics/frame_sequence_tracker.cc) y [FrameSequenceMetrics](https://chromium.googlesource.com/chromium/src/+/b830442dc74e5dc35b6b13e79a6f60914d7adbc9/cc/metrics/frame_sequence_metrics.cc): oportunidades esperadas y confirmación de presentación no equivalen al número de submits. No etiquetar un hold causal como ausencia de daño visual.

Las fuentes, versiones y hashes consultados se conservan con la evidencia. El patrón aprovechado es coordinar antes de capturar la transacción causal, conservando los propietarios y fences originales; no portar otro compositor ni construir una arquitectura paralela.
