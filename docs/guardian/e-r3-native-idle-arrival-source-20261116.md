# Idle: descanso nativo sobre el extremo real del paseo

Continuación del [paseo preparado en Surface/GPU](e-r3-native-idle-stroll-surface-20261116.md), dentro de A6-04.f-R3. Se completa la **fuente nativa** WALK22 → REST/vigilancia21 y su repetición desde la pose ejecutada. La unión tipada y el consumidor gráfico de ese origen nuevo siguen pendientes. No cambia ningún cierre A6/A/B/C.

## Código consolidado consultado y decisión

Antes del diseño se leyó la implementación real de [DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp): `requestMoveTargetReplan`, `requestMoveTarget`, `requestMoveVelocity`, `resetMoveTarget`, `updateMoveRequest` y la invalidación/reconsulta en `checkPathValidity`. Cambiar o cancelar el destino actúa sobre la petición del agente residente; conserva su posición. Las solicitudes y el corredor derivado son distintos de esa posición.

Se adapta esa separación en los propietarios existentes de Wild Guardians: el relevo toma la pose del cuerpo realmente ejecutado, prepara la nueva fase y retira sólo el corredor anterior al adquirirla. Se reutilizan `releaseRoute`, las reservas, las pruebas de puertas, la frontera preparada, el reloj común y el guard de parada que ya usa la liquidación Carry. No se introduce DetourCrowd, otra dependencia, controlador de cuerpos ni registro de rutas.

## Qué queda implementado

`NativeIdleCycleBodySource` guarda valores acotados de identidad, sesión, fuente, pose/fases, perfil, centro, ancla y estado privado original. Distingue el cuerpo inicial20 de un paseo22 que **ha llegado realmente**. La fuente22 se obtiene de `currentIdleStroll` y `executionPose.arrived`, comprobando asociación, generación, reserva, cuerpo, pose y centro actuales. Usa el extremo ejecutado y sus fases, nunca la pose inicial del paseo ni una petición20 fabricada.

La preparación exige la secuencia de asignación22 actual y el ancla/calibración retenidas. Consultar, cancelar o renovar conserva WALK, cuerpo y RNG ejecutado. El REST deseado comparte la función pura original de llegada: la siguiente semilla y duración se convierten en fase activa sólo al confirmar el ciclo21. Revalidar admite trasladar el tiempo del mismo programa; un ticket ajeno falla. El guard de parada se comprueba al preparar y al confirmar para evitar revocar incidentalmente a un compañero sin su relevo preparado.

El commit libera el slot/reserva anterior mediante el propietario existente y conserva el mismo identificador de cuerpo, posición, rumbo, fases Run/Walk/Carry y presupuesto. El ciclo finito reanuda REST → vigilancia y la decisión original siguiente sobre el reloj nativo. Un paseo posterior consulta y prepara desde esa última posición. El estado comprometido22 conserva una copia de valores, sin punteros a ciclos o paseos anteriores; sólo el borrador pendiente nombra su fuente actual. No se acumula un árbol de permisos.

La protección estacionaria existente incluye este origen: no permite cambiar su pose/radio/flags ni reenlazar otro cuerpo. Retirarlo o reiniciar los cuerpos revoca la asociación. El lote de tareas rechaza descartar ese propietario hasta que exista su relevo preparado desde la pose actual. Tampoco puede redeclararse como Idle inicial ni usar Home antiguo para saltar su admisión.

## ABI y compatibilidad

Se añaden cuatro exportaciones: versión, snapshot y puntero de fuente, y enumeración de ciclos activos. El snapshot tiene **26 doubles**; su orden completo se registra en [la validación](performance/native-idle-arrival-source-validation-20261116.json). El header21 conserva 24 valores: índice3 identifica la fuente20 o asignación22; índice4 identifica el ciclo estacionario anterior cuando se renueva. El resultado de asociación conserva sus 52 valores.

Los ciclos sobre20 mantienen su referencia y comportamiento anteriores. La nueva fuente22 todavía no se convierte en la atestación inicial20 exigida por JavaScript: los adaptadores actuales fallan cerrado para ella. El productor ordinario no puede emitir este relevo gráfico y el cohort de Game sigue rechazando el Idle movido. No se anuncia una nueva capacidad de presentación ni se habilita guardado/carga que restaure permisos.

## Validación sobre las entradas finales

- **46/46 pruebas dirigidas**, 19786.9247 ms:13 casos nuevos de fuente posterior al paseo,20 de ciclo y13 de paseo. Incluyen los cuatro perfiles frente a `updateIdle`, pose/fases/RNG de llegada, espera con compañero en marcha, cancelación repetida, revalidación, tickets/secuencias/anclas/calibración ajenos, retirada de cuerpo/ancla, mutación/rebinding, rechazo de20/Home ficticios y tres paseos posteriores con sus descansos/renovaciones en standalone/pthread.
- **1355/1355 pruebas de regresión enfocada en 117 archivos**, 772669.3714 ms: reservas, puertas, reloj, tareas, acciones/consecuencias, Home, Idle, control, puertos y consumidores existentes. Es la unión de los conjuntos de fuente y Surface anteriores, más el nuevo archivo; no se presenta como suite completa del repositorio ni aceptación C.
- Ambos módulos canónicos reconstruidos y **build de producto correcto en 45.88 s**. Manifiesto nuevo de 18 entradas nativas y 61 entradas contrastadas; los 16 archivos locales protegidos y el helper pthread original se conservan exactamente.

Comandos, archivos y hashes están en el JSON de validación. Este incremento no mide GPU ni demuestra el consumidor22 →21 en hardware. La evidencia GPU del paseo22 anterior sigue documentada con su alcance propio; no prueba la recuperación integral de 3123 recursos.

## Siguiente punto del plan

Integrar esta fuente actual como unión tipada acotada en21, su captura/revalidación y control/puertos existentes; después roster/Surface originales, proyección Game y evidencia GPU del relevo. Completar tarea/Home desde la pose actual, restauración semántica nueva de Idle móvil y cohort ordinario coherente; aproximación, cambios de ancla y cancelación de camino bloqueado. Siguen abiertas las demás clases/finales/puertas, productor ordinario, nacimientos y sustitución en vivo, recuperación incremental integral de 3123 recursos y aceptación A6/A/B/C. No se inicia D.
