# Fuente Home desde el ciclo Idle actual

Continúa [el consumidor del descanso posterior al paseo](e-r3-native-idle-arrival-consumer-20261116.md). Se amplía la fuente C++ existente para solicitar y preparar Home desde el ciclo 21 actual, incluido su origen en un paseo 22 terminado. Este incremento no conecta todavía esa nueva petición con control, Game, roster/Surface ni adquisición gráfica. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Código consultado y decisión

Antes de diseñar el relevo se leyó [DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp): `requestMoveTarget` cambia objetivo/estado de petición conservando el agente; `updateMoveRequest` calcula desde su posición `npos` y conserva el propietario del corredor. Se adapta esa separación de cuerpo actual, objetivo y ruta preparada a los propietarios existentes de Wild Guardians. No se añade un agente, cuerpo, planificador, dependencia o registro paralelo.

## Fuente y adquisición nativas

`nav_intent_idle_cycle_home_request(actor, session, cycleSequence, village, homeX, homeZ)` exige la asociación 21 actual. Copia su pose y fases en `NativeHomeResourceRequest`, conserva el cuerpo y su ciclo mientras espera y registra únicamente el número del ciclo de origen. Funciona tanto con la fuente inicial 20 como con la fuente acotada 22 posterior al paseo; no convierte una pose movida en una declaración inicial.

La validación del cuerpo admite el estado Home pendiente sólo para esa asociación exacta. El generador de decisiones Idle sigue exigiendo su estado estacionario activo y ya no produce decisiones mientras Home espera. El DTO de petición Home conserva su versión 1 y sus 19 valores: son datos semánticos actuales, sin un árbol de permisos anteriores. Game aún no invoca esta ABI.

La misma petición/objetivo es idempotente; otro destino se rechaza. Actor/sesión/ciclo obsoletos, antigua secuencia 22, coordenadas inválidas, fuente móvil o sólo llegada sin 21 adquirido no pueden solicitar Home. Las barreras pendientes impiden retargeting. La nueva petición debe quedar cubierta por el reloj causal antes de preparar la ruta. Preparación, cancelación y revalidación conservan el cuerpo; la adquisición usa la ruta, reservas y commit ligado a frontera ya existentes.

## Validación y límites

**1391/1391 pruebas en 121 archivos**, 735023.782 ms. Los 8 casos nuevos se ejecutan en standalone/pthread: origen 20/22, identidad actual y pose/fases, idempotencia, reloj causal, barrera, cancelación/revalidación, adquisición y llegada Home sobre el mismo cuerpo, rechazo de historia/cuerpo retirado y del paseo móvil o recién llegado sin ciclo. La fixture no reescribe Game para fingir el relevo; prueba la fuente y commit nativos de confianza.

Se recompilan correctamente ambos módulos y pasa el build de producto en **51.42 s**. Los 16 archivos locales protegidos y el helper pthread original permanecen exactos. [Comandos, conjunto e inputs/artefactos](performance/native-idle-current-home-source-validation-20261116.json).

No se mide GPU de nuevo en este incremento: la evidencia anterior de 22→21 conserva sus propios hashes históricos y no se atribuye a estos binarios nuevos. Faltan la unión/comprobación del origen 21 en el control directo, el método Game y los lectores del roster/Surface, y validar ese Home sobre el actor original. No se habilita su productor ordinario. Tarea/Home desde paseo móvil 22, TaskStart desde pose actual, restauración móvil, aproximación/anclas/bloqueos, restantes clases/finales/puertas y recuperación incremental integral de 3123 siguen pendientes. No se inicia D.
