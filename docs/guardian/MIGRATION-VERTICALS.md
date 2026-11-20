# Aceptación por vertical funcional

Vista de dependencias de [A6](A6-CHECKLIST.md), subordinada a la
[corrección A–F](intent-route-architecture-correction-20261108.md) y al
[plan A/B/C](integrated-gpu-migration-plan-20261104.md). No modifica sus criterios,
no añade porcentajes y no declara cerrada ninguna vertical.

Responsable de implementación: Sol, en los propietarios siguientes. Este apoyo
solo mantiene catálogo, selección, evidencia y documentación. «Disponible»
significa componente reutilizable, nunca aceptación de la partida completa.

## Prioridad de integración por familias — 20 de noviembre de 2026

Por indicación del usuario, Sol prioriza mecánicas ordinarias sobre los contratos
existentes; Astra entrega correcciones para bloqueos transversales reproducidos.
Sol conserva integración, validación amplia y GPU. Esta vista organiza el trabajo
dentro de A6: no declara cerrado A, no inicia B por decreto ni cambia A → B → C → D.
Una dependencia bloquea las activaciones que la necesitan; se puede adaptar otra
familia sobre contratos ya disponibles sin esperar a resolver una incidencia ajena.
Los fallos de una frontera compartida sí bloquean sus consumidores afectados.

Lectura de fuentes a 2fc0ca86f. La evidencia enlazada corresponde a los commits
de cada informe, no a una repetición de esas pruebas sobre el HEAD actual. Distinguir
componente disponible, recorrido ordinario demostrado en laboratorio y activación
aceptada en la partida: los dos primeros no acreditan el tercero.

| Familia | Siguiente entrega funcional / reutilización | Bloqueo específico que debe resolver o acreditar Sol |
|---|---|---|
| Farm / Harvest / Carry / Home | Completar continuidad e interrupciones en el productor existente, incluido fin de turno durante Task; conservar la cadena ya demostrada hasta entrega, siguiente Task y Home. | Task25 → Home tiene fuente, puente y consumidores; [roster adquirido](native-task-stop-home-graphics-20261120.md) aún deja disparo ordinario, motores de puerta y GPU pendientes. No volver a implementar Harvest/Carry/entrega ya acreditados. |
| Water / Plant | Revisar juntas las adaptaciones de Task, ruta, acción, recursos y proyección; entregar primero un ciclo ordinario con efecto único y siguiente tarea. Reutilizar variantes [Water/Plant](e-r3-native-worker-action-variants-20261115.md), productor y admisión comunes. | El catálogo de acción ya admite water, initial y repair, pero eso no demuestra sus consecuencias. copyNativeTaskConsequenceReference exige actionKind === 'harvest' y Carry: no usar esa consecuencia para regar/plantar. La [prueba en Game y WASM](native-watering-action-dispatch-20261120.md) reproduce ambas acciones terminadas con posición válida y riego aún debido. Queda adquirir una consecuencia estacionaria con la regla original. |
| Build / Repair | Reutilizar solicitud, movilidad, admisión y propietarios de estructuras; adaptar regla económica y efecto confirmado. | Preparación/publicación de geometría, obstáculos, revocación de rutas afectadas y economía de cada operación. Un clip o Repair admitido no demuestra la mutación. |
| AttackCrops / animales | Conectar selección, movilidad, ataque y resultado a sus propietarios existentes; aprovechar lo demostrado para la clase real. | Daño, obstáculos, interrupciones y excepciones de combate deben tener consecuencia nativa propia. AttackCrops conserva el primer gate A–F de la corrección; Harvest no lo sustituye. |
| Flee / Recovery | Adaptar interrupción/cambio de destino y recuperación sobre el mismo actor y rutas nativas. | Revocación, destino válido, restauración y retirada según causa. Reutilizar la parada demostrada sólo cuando coincidan sus invariantes, no por semejanza visual. |
| Guardián / magias | Conectar acciones y efectos originales a admisión y publicación comunes. | Autoridad del efecto, preparación de sus recursos y alcance de mutaciones físicas; comprobar cada excepción antes de activarla. |

Task25 no constituye otra arquitectura: [reutiliza la transacción de Stroll12 y
Farm24](native-task-stop-admission-20261120.md). Su parte específica es detener una
asignación que sigue ejecutándose, retener cuerpo/pose/reserva, acreditar revocación
y transferirla a Home. Esa excepción no debe repetirse para cada acción estacionaria.
Las familias pueden compartir adaptación y revisión donde las dependencias estén
resueltas; no se añaden agentes, fixtures ni ejecutores para obtener paralelismo.

Antes de abrir infraestructura nueva, registrar: mecánica bloqueada, contrato común
que se intentó reutilizar, reproducción mínima de la carencia y alcance del cambio.
Mantener validación dirigida de la mecánica y de las fronteras modificadas; ampliar
regresión cuando cambien contratos compartidos. Evidencia previa sólo se reutiliza
con alcance e identidades/fuentes compatibles, sin presentarla como una ejecución
nueva. Una intención distinta no obliga por sí sola a repetir investigación, build
nativo o campaña GPU de contratos intactos. Tampoco exime de comprobar sus excepciones.

Informar de progreso con: **mecánica ordinaria demostrada → límite pendiente →
siguiente comportamiento verificable**. Añadir como respaldo comando, configuración,
commit/evidencia y comprobaciones realizadas; no usar número de commits/tests como
medida principal. Cadencia de 60 FPS, recuperación global y gates originales siguen
abiertos hasta su evidencia específica; no impiden toda adaptación independiente.

## Harvest: cadena mínima que debe demostrarse junta

| Frontera / dependencia | IDs existentes | Propietario de código | Aceptación y evidencia exigida | Situación de referencia |
|---|---|---|---|---|
| Productor ordinario → asignación | A6-01, A6-05, e-R3 | Planificador de tareas / bridge / `spatial-intent-state.cpp` | Comando real crea tarea y dueño una vez; espera de recursos sin handle ejecutable; B avanza. Registro de tarea/objetivo/cuerpo, época, secuencia y recibo. | Productor ordinario demostrado en Worker/Surface/GPU por la [cadena Harvest → Carry](native-ordinary-harvest-carry-20261120.md). No equivale a activación global de producto. |
| Ruta completa → movimiento → llegada | A6-02/03/04/06/08, e-R1/R2, f-R1/R2/R3/R4 | Ejecutor nativo, reservas, control directo, Surface y roster existentes | Ruta íntegra, fases/carga/presupuesto, colisión con obstáculos y puertas, conflicto anticipado; mismas mallas originales. Cuerpo ejecutado y frame GPU ligados por identidad, sin mover por JS. | Ruta, movimiento y llegada integrados en los recorridos ordinarios enlazados. Puertas/obstáculos/tráfico dentro de esa misma cadena y cobertura global siguen pendientes. |
| Llegada → Harvest | A6-01/02/06/08, e-R3, f-R4 | `spatial-task-action-proposal.inc`, admisión común, `game.js`, actor GPU | Reserva estacionaria retenida; clip preparado antes de commit; progreso desde reloj ejecutado, otras tareas continúan. Bloqueo real ≥500 ms, primer dibujo sin fábricas y sin recursos recreados tras readiness. | Llegada → Harvest demostrados dentro del [recorrido ordinario hasta Carry](native-ordinary-harvest-carry-20261120.md), con preparación retenida y autoridad viva. |
| Harvest → consecuencia real | A6-01/04/06/09, e-R3, f-R4 | Propuesta/commit nativos y proyección de `tasks.js`, cultivos/cajas/recursos existentes | Cultivo cosechado, caja/economía y eventos según reglas reales, exactamente una vez y después del progreso ejecutado y preparación; no efecto por ACK/clip. Antes/después y rechazo de recibos obsoletos/cancelación. | [Harvest → Carry](native-ordinary-harvest-carry-20261120.md) acredita cultivo/tarea retirados y caja portada tras commit; [entrega17](native-ordinary-delivery-settlement-20261120.md) acredita ingreso único y disponibilidad. Cadencia y excepciones globales no cerradas. |
| Consecuencia → siguiente tarea | A6-01/02/03/05/11, e-R3 | Mismo planificador, cuerpo y reservas; regreso/carga según reglas | Siguiente tarea ordinaria comienza sin fixture que la emita directamente; fases y caja conservadas, no ejecutor JS paralelo. Log continuo de ambas tareas. | [Segunda Task14 ordinaria](native-post-settlement-next-task-20261120.md) adquirida sobre el cuerpo liquidado; no demuestra su segunda acción/entrega ni interacción siempre lista. [Home y ausencia](native-post-settlement-home-20261120.md) acreditados desde entrega; interrupción Task25 es otro caso. |
| Guardar/restaurar/cancelar en cada frontera | A6-02/07/09, e-R3/R4, f-R3/R4 | Snapshots, Worker de autoridad, bridge y consumidor existentes | Nueva época/admisión, mismos hechos semánticos; ninguna consecuencia duplicada; cambio de Worker/device loss/canal silencioso no revive permisos. Comparación determinista de comandos/resultados. | Existen protecciones y evidencia parcial de restauración; contrastar [operaciones](MIGRATION-OPERATIONS.md) y recibos vigentes por frontera. No declarar recuperación integral de la cadena por recuperación retenida aislada. |
| Partida y costes de la cadena completa | A6-09/10/11, e-R4, gates A–F, C1–C4 | Bootstrap de producto y todos los propietarios anteriores | WebGPU hardware, recursos originales, publicación ordinaria, contadores por propietario, capturas, seed/comandos, build y regresiones. Activación sin flags QA esenciales y retirada de duplicados solo tras validar la clase. | Pendiente. No sumar pruebas aisladas. |

Para consultar las pruebas históricas de componente, `lab --scenario harvest` muestra su selección;
`gates`, `obstacles`, `concurrent`, `pause`, `invalidation`, `preparation` y
`recovery` preparan las adversidades. Instrucciones en [operaciones](MIGRATION-OPERATIONS.md).
El catálogo CLI y los TODO de [aceptación pendiente](../../tests/migration-harvest-acceptance.pending.test.js)
son anteriores a parte de la evidencia ordinaria anterior: sus rótulos pendientes
no son el estado funcional vigente. Sol debe reconciliarlos con las aserciones de
los harnesses existentes; no basta borrarlos ni poner una marca de capacidad.
El recorrido completo usa tools/guardian/audit_native_farm_birth_world_owner.mjs;
los informes enlazados conservan comandos, configuración y recibos. Siguiente Task
usa QA_NATIVE_BIRTH_FOLLOW_NEXT_TASK; Home se ejecuta por separado con
QA_NATIVE_BIRTH_FOLLOW_HOME, sobre las continuaciones Action/Consequence/Settlement
exigidas por el runner. No crear otra fixture ni ejecutar ambas alternativas juntas.

## Esquema común para las demás intenciones

Todas requieren la cadena productor → ruta → GPU → llegada → acción → efecto →
siguiente intención, identidad/recursos/causalidad y recuperación de Harvest.
A6-05 exige ampliar perfiles y biomas; el dominio Desierto no acredita los demás.

| Vertical | Dependencia adicional / responsable | Prueba completa y evidencia particular | Cierre permitido |
|---|---|---|---|
| AttackCrops (primera aceptación A de la corrección) | Selección/entrada/ataque/retirada en bridge, `raids.js`, bestias GPU | Facóquero real, golpe lógico nativo y daño único; muro B, tráfico C, bloqueo D, pausa/impactos/ragdoll/save/device loss E, contadores F. | Solo su clase tras A–F; nunca A6 entero. Priorizar Harvest como apoyo no sustituye este gate. |
| Water | Mismo ejecutor/admisión; `tasks.js`, accesorios originales Water | Llegada → riego → cambio real de agua → siguiente tarea; accesorio preparado, agua nunca por fin visual del clip. | Tras cadena, adversidades y reglas propias; variantes gráficas aisladas no bastan. |
| Plant / construcción / reparación | Tareas y propuestas de geometría/recursos existentes | Materiales/economía y objeto físico/gráfico preparados; mutación válida una sola vez, revoca rutas dependientes antes de efecto. | Cada clase por separado con geometría/reglas/recuperación acreditadas. |
| Carry / entrega / regreso | Fases y presupuesto nativos; caja/cuerpo/depósito existentes | Harvest real entrega caja → transporte → depósito/economía → nueva tarea; conservar rig y recursos. | El clip aislado no cierra entrega; la evidencia ordinaria de entrega y Home ya enlazada sí acredita esos recorridos en su alcance. Mantener abiertas las excepciones y aceptación de producto. |
| Huida / recuperación / otros animales | Perfiles/intenciones nativas y excepciones físicas delimitadas | Interrupción y reanudación por evento, objetivos y permisos nuevos, sin polilínea JS autoritativa ni congelación injustificada. | Tras ampliar perfiles/biomas y demostrar las excepciones sin duplicar autoridad. |

Plantilla para añadir una vertical sin crear un plan: intención y alcance;
IDs A6/gates originales; propietarios; dependencias aún abiertas; comando/seed y
recursos; aserciones por cada frontera; adversidades; evidencia de determinismo,
recursos, visual y costes; límites; enlace a la decisión de cierre en el checklist.

La evidencia de cierre debe ligar **un mismo recorrido funcional** a HEAD y
hashes de fuentes/WASM, configuración y comandos reproducibles, resultados
autoritativos y capturas/contadores GPU reales. Repetir tras una edición concurrente.
Los informes de este apoyo siempre mantienen `verticalComplete:false`: el cierre
lo revisa el implementador en el documento de autoridad con toda esa evidencia.
