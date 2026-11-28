# Fuente Farm retenido → Home y vencimiento en Game

Continúa el [relevo Farm→Task en Surface/GPU](e-r3-native-farm-moving-task-surface-20261117.md) en el siguiente punto del [plan principal](integrated-gpu-migration-plan-20261104.md). Un Farm23 detenido por24 puede solicitar Home y adquirir la ruta18 sobre el mismo cuerpo, sin tarea, ciclo Idle o cuerpo nuevos. Game solicita Home al vencer su contrato o alcanzar la hora de salida. Este incremento valida fuente/ABI/Game; el control, admisión y consumidor gráfico de este origen Farm→Home siguen pendientes. A6/A/B/C abiertos; D no iniciado.

## Código real consultado y adaptación

Antes de diseñar se revisan [`dtCrowd::resetMoveTarget` y `requestMoveTarget` de DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L646) y [`NavigationAgent3D::set_target_position` y `_request_repath` de Godot4.4-stable](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L643). Cambian el objetivo y el estado de navegación del agente existente; no sustituyen su cuerpo. Las copias descargadas de ambos tags se verifican por SHA256. No se añade dependencia, planificador, registro o mecanismo de movimiento alternativo.

Se adapta la petición Home existente de Idle detenido: un núcleo privado comparte validación y captura de pose, con entradas ABI distintas para Idle y Farm. La petición Home guarda dos campos internos de ascendencia Farm —secuencia y generación— junto a los de las familias anteriores. Su DTO19, referencia Home/version1 y ruta preparada18 permanecen en el protocolo común. La nueva entrada ABI se incorpora a la lista canónica de exports y a ambos módulos compilados.

## Retención y adquisición

Sólo el Farm realmente detenido puede pedir Home. Se comprueban familia, actor, sesión, secuencia y generación actuales antes de mutar; una llegada todavía móvil, un Task ya reclamado u otro actor no sirven como fuente. La entrada Idle rechaza Farm. Repetir el mismo destino es idempotente, cambiarlo devuelve conflicto y una barrera pendiente impide retarget. El request copia la pose final ejecutada, sus fases, radio, flags y presupuesto, conservando el slot suspendido.

La validación del cuerpo Farm reconoce ese Home pendiente únicamente con la ascendencia y pose exactas. La validación Home comparte esa comprobación y conserva la exclusión de reservas ajenas. El cuerpo no se mueve mientras Home espera: otro Task nativo avanza, se puede revalidar/cancelar el candidato después del final de la vieja ruta Farm y se mantiene la misma petición. El commit18 adquiere el cuerpo y empieza su marcha Home mediante el corredor/timing existentes; la fuente Farm deja de estar vigente. El número de cuerpos y el RNG mundial se conservan.

## Contrato y Game

La lectura del cuerpo Farm retenido permite ahora reconocer que su contrato ha vencido. Las declaraciones Farm nuevas y la llegada móvil mantienen sus restricciones de contrato: la excepción sólo permite leer la pose de un cuerpo ya detenido para sustituir su objetivo. Se actualiza la expectativa antigua que rechazaba leer cualquier pose retenida al vencer el contrato; siguen las negativas de pose, centro, propietario y locomoción, y se añade cobertura explícita de la nueva frontera Home.

`requestNativeFarmHome` exige el trabajador `arriving`, su marcador Farm retenido y el contrato terminado, sin Task/caja/lesión/raid. Usa la entrada real de su aldea, conserva la pose y cambia a `returning`/`pending-home-resources`; no pasa por Idle. La función común de vencimiento de contratos y el chequeo de frontera horaria incluyen este origen. Game puede continuar el cohort mientras Home espera, y después de18 proyecta la marcha nativa sin invocar los movers JS.

La Task conserva su prioridad ordinaria mientras el contrato sigue activo. La nueva petición Home no puede reemplazar una Task genuina ya reclamada. La negativa anterior de cohort se mantiene para el contrato no soportado del Task independiente; no se permite que Farm lo oculte.

## Evidencia y límites

Los19 casos nuevos cubren cuatro perfiles standalone/pthread, identidad y familia incorrectas sin mutación, espera después del extremo antiguo, retarget/cancelación, adquisición18, protección y retirada del cuerpo, prioridad de Task y la comparación tipada de ascendencia. Incluyen vencimiento diario con Task independiente y las cuatro horas de salida250/300 en Game sin peer. Los helpers compartidos admiten ese caso de un único actor sin inventar un Task independiente.

El primer ensayo ampliado pasa27/40 y descubre la restricción de contrato en la lectura retenida. Tras limitar la excepción a ese cuerpo adquirido, pasa40/40; con las nuevas negativas pasa45/45 y el grupo ampliado de Game pasa66/66. La validación dirigida final pasa155 casos. Los controles negativos son de lectura: un WASM aislado sin la comparación de generación acepta indebidamente la petición; un loader ESM sin la rama de vencimiento Farm deja al cohort sin Home. Cada test falla en la condición esperada y no modifica el árbol ni los binarios del producto.

La [evidencia verificable](performance/native-farm-moving-home-source-validation-20261117.json) registra los64 inputs/artefactos nativos —siete cambios, ambos WASM y el módulo pthread recompilados—,384 entradas congeladas, pruebas, regresión y build. Se preservan los16 archivos locales ajenos, el worker pthread sin seguimiento y los bytes previos de los cuatro documentos principales. Los siete fallos históricos fuera de la selección siguen abiertos.

No se ejecuta GPU Farm→Home en este incremento. La evidencia anterior Farm→Task de646 IDs conservados/70 preparados/0 tardíos y los intervalos34,89/139,89 ms corresponde al commit `cbf31c436`, con el build nativo anterior; no certifica esta ruta Home ni sus módulos nuevos. Quedan su control/admisión/puertos/actor/Surface/Host, finales, cohort y productor completos, guardado/recuperación y continuidad, incluidos los3.123 recursos. Continúa A/A6 → B1–B7 → C antes de D.
