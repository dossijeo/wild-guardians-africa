# TaskStart desde el cuerpo detenido durante WALK

Continúa el relevo [Home desde el paseo suspendido](e-r3-native-idle-moving-home-consumer-20261117.md). La asignación ordinaria puede ahora reclamar una tarea después de una parada móvil preparada12 y preparar TaskStart14 desde su pose nativa final22. Se conserva el mismo cuerpo físico y el permiso privado de presentación suspendida hasta adquirir el sucesor. Este incremento cubre fuente, Game, control directo y ambos transportes de admisión; el roster/Surface y la aceptación GPU de este nuevo origen siguen pendientes. A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Referencias y decisiones

Se consulta la implementación real de [`RigidBody::copy_from`, Rapier v0.22.0](https://github.com/dimforge/rapier/blob/v0.22.0/src/dynamics/rigid_body.rs): copia estado sin sustituir los identificadores internos ni el conjunto de colliders. Se adapta la separación entre valores físicos e identidad: el intent pendiente conserva una copia inmutable de la pose ejecutada en el tipo nativo `NativeWorkerPoseResourceRequest` existente. No se crea otro cuerpo, registro de trayectorias o dependencia.

Se contrasta también [`requestMoveTarget` y `updateMoveRequest`, DetourCrowd v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp). La petición conserva el destino y el agente; el cálculo arranca desde su posición actual `ag->npos`. Esto fundamenta el tratamiento del aviso de elegibilidad aplazado: mantiene sus campos semánticos confirmados, pero utiliza la posición nativa que Game ya ha reconocido. No se reproduce una posición capturada antes de WALK.

## Fuente y adquisición

`commitTaskProposal` rechaza asignaciones inmediatas y reclamaciones sobre22 todavía activo. La tarea solicitada durante WALK conserva su identidad y objetivo; después de adquirir la parada preparada se vuelve a planificar y puede reclamar el mismo trabajo. La fuente exige el perfil, cuerpo y suspensión actuales antes de modificar el intent.

La reclamación descarta el corredor22 y reutiliza el único slot para la nueva petición pendiente. Conserva exclusivamente cuerpo, pose, fases, presupuesto y procedencia finales, sin emitir una cancelación intermedia que revocaría la presentación retenida. Las comprobaciones de coherencia, escrituras físicas, retirada del cuerpo, reservas y puertas reconocen esa fuente exacta. TaskStart valida de nuevo la identidad, generación, tarea, destino, fases y presupuesto al preparar, revalidar y adquirir. La adquisición libera la copia anterior. No cambian ABI, exports ni versiones de DTO.

El control directo conserva la prueba suspendida únicamente para la petición Task pendiente del mismo actor, sesión y secuencia. La admisión antigua de suspensiones continúa exigiendo su estado original. El nuevo permiso por cuerpo mantiene la pose privada; la atestación TaskStart exige ese mismo cuerpo y retira el permiso anterior al adquirir el sucesor.

La cohorte Task existente de Game admite este estado pendiente y después14. No se habilita la cohorte ordinaria de WALK22. La reconciliación proyecta la fuente retenida real. Un aviso de elegibilidad acumulado antes de mover usa `projectedPositions`, ya existente, sólo al vaciar eventos. Si la pose viva de Game difiere de la reconocida, falla antes de aplicar deltas nativos y conserva la cola para su reintento. Se evita rebobinar un cuerpo nativo con el snapshot viejo del aviso.

## Validación y límites

Ambos módulos standalone/pthread se recompilan. Pasan **1.757 pruebas en 158 archivos** y **17 pruebas específicas** de fuente/admisión, de las cuales13 ya están incluidas en la selección anterior. Las17 cubren cuatro perfiles y ambos binarios, rechazo de reclamación durante movimiento, misma tarea tras la parada, fases/presupuesto incorrectos, cuerpo sustituido, cancelación/recibo inválido, una preparación por los dos puertos, retirada física y `Game.tick` con los caminos de movimiento JavaScript configurados para fallar.

La selección ampliada de160 archivos produce **1.788 éxitos y siete fallos**. Los mismos siete nombres fallan sobre el commit padre `a842e2b40`, con su WASM anterior, los16 cambios locales previos y11 fixtures idénticos. Afectan dos archivos antiguos: `spatial-native-intent-bridge.test.js` y `spatial-native-raid.test.js` (fixture ABI, estados guardados y planes de incursión). El contrafactual completo ejecuta38 pruebas,31 correctas y siete fallidas. Se documenta esa deuda; no se declara verde la validación integradaC ni se modifica su ámbito para ocultarla.

La regresión en GPU utiliza el relevo Home anterior con los nuevos binarios. Sus resultados y el build quedan registrados en las [evidencias de este incremento](performance/native-idle-moving-task-source-validation-20261117.json). Esa prueba no acredita todavía TaskStart gráfico desde22 suspendido. Los16 archivos locales protegidos y el helper pthread original sin seguimiento deben permanecer exactos.

El siguiente punto es adaptar el consumidor original TaskStart a esta procedencia, conservar actor/bancos/selección durante su preparación y demostrar el relevo en hardware. Después continúan restauración móvil, otros finales/clases/puertas y productor/cohorte ordinarios. La recuperación incremental integral de3.123 recursos sigue pendiente: este avance no acredita ausencia global de tirones ni iniciaD.
