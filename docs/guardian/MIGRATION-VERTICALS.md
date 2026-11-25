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

| Familia | Recorrido ordinario demostrado | Siguiente comportamiento verificable |
|---|---|---|
| Farm / Harvest / Carry / Home | En NVIDIA, los cuatro perfiles pasan de contratación y madurez real a Task14, [Harvest15 → Carry16](native-ordinary-harvest-carry-20261120.md) y [entrega con un solo ingreso](native-ordinary-delivery-settlement-20261120.md). Desde la entrega se probaron [una segunda cosecha y entrega con un segundo abono sobre el mismo cuerpo](performance/native-post-settlement-second-delivery-20261121.json) en los cuatro perfiles y [Home con retirada al llegar](native-post-settlement-home-20261120.md). [Stop24 después del vano de zarzas](native-farm-stop-historical-gate-retention-20261121.md) conserva el cuerpo y el motor residente con diario de motores vacío. El fin de turno también devuelve a quien sigue en Task, incluso si [alcanza el extremo mientras espera READY25](native-task-completed-home-handoff-20261121.md). | [Settlement17 y Home19 tras el vano](native-terminal-gate-retention-20261121.md) completan entrega y retirada en NVIDIA con el portón residente. Home19 también pasó con el portón fuera del encuadre ampliado. [El cruce en sentidos opuestos](native-farm-gate-aperture-20261121.md#dos-trabajadores-en-sentidos-opuestos) está comprobado cuando el egreso queda libre. [El guardado público con Farm activo y el portón a medio abrir](native-farm-public-checkpoint-handoff-20261123.md) preserva la pose, prepara un corredor nuevo y conserva el cuerpo hasta Idle en NVIDIA. Quedan los motores que cambian al retirar una reserva, los relojes fuera del paquete de dibujo, egresos ocupados, otras familias de restauración y C4. |
| Water / Plant | [Plant por orden y Water al vencer el riego](native-watering-idle-20261120.md) completan un solo riego con los cuatro perfiles estacionarios tras Farm. [Desde Idle20 en frío](native-idle-walk-handoff-20261121.md) pasan ambos con youngMale. Restaurar una acción y asignar la tarea siguiente también pasó. [Desde Idle22](native-moving-idle-task-handoff-20261121.md), Plant continúa mediante Stop12 y Water mediante REST21 si alcanza el extremo. Los relevos físicos de los cuatro perfiles conservan el cuerpo. [olderFemale](performance/native-watering-idle-20261120/moving-idle-older-female-20261121.json), [olderMale y youngFemale](performance/native-watering-idle-20261120/moving-idle-remaining-profiles-20261121.json). | [Despertar preparado](performance/native-watering-idle-20261120/target-invalidation-handoff-20261121.json) conserva el cuerpo durante la invalidación ordinaria de Plant y Water. La GPU cubrió la Task14 provisional, la marcha y Action15. [Action15 restaurada pendiente](native-pending-action-bless-handoff-20261123.md) también confirma Despertar en NVIDIA con el mismo cuerpo. Quedan los demás cambios de destino y C4. |
| Build / Repair | Repair de [centro](native-intact-center-repair-20261120.md) y [muro intacto](native-intact-wall-repair-20261121.md) restaura HP y cobra una sola vez con los cuatro perfiles. Las [puertas dañadas de zarzas, empalizada y reforzado](native-gate-repair-morph-20261121.md) conservan el motor y las dos partes durante Repair en NVIDIA, con retirada de los dos buffers antiguos antes del cierre. [Build de muros sólidos residentes](native-wall-causal-adapter-20261121.md) detiene y reanuda Farm en NVIDIA. Ante regiones frías rechaza antes de cobrar. [La compra ordinaria de una puerta de zarzas](native-gate-addition-20261121.md) adquirió un mecanismo y tres proxies en NVIDIA con un solo débito y Farm activo. | [Farm cruza el vano de una puerta restaurada](native-farm-gate-aperture-20261121.md) en NVIDIA con el mismo cuerpo, usando el conector del espacio libre y el barrido de la hoja. [Farm continúa después de comprar una puerta en su corredor activo](native-gate-corridor-handoff-20261121.md) con el mismo cuerpo, un débito y cero sustituciones entre sus buffers residentes comparables. [La retirada preparada](native-gate-removal-handoff-20261121.md) pasó con la puerta cerrada y en apertura. En ambos casos mantuvo el cuerpo y abonó el reembolso una vez. [Una reparación guardada a mitad de su curva](native-restored-gate-repair-handoff-20261121.md) reanuda el morph en GPU con la apertura estática. [Repair de una ruina sólida libre](native-ruined-solid-wall-repair-handoff-20261123.md) recupera colisión y HP en NVIDIA y mantiene los dueños ajenos. [Repair con Farm activo](native-ruined-wall-active-farm-handoff-20261123.md) detiene con Stop24, incorpora la huella y reanuda el mismo cuerpo por el rodeo. [Repair sólido restaurado a 50 y 100 ms](restored-solid-repair-handoff-20261123.md) reanuda la curva GPU, mantiene las cuatro mallas y comparte su escalar con picking. Quedan Repair con otras familias de ruta o acceso que exige una puerta, otras supresiones, restauración de otras familias en movimiento y la cadencia de presentación. |
| AttackCrops / animales | La [calificación de desarrollo](native-attack-crops-qualification-20261125.md) dibuja cinco tickets de marcha, ataque y retirada en NVIDIA sobre el mismo cuerpo. Confirma un golpe a `plant-373`, un golpe a `plant-337` y una sola desaparición en la salida, con cuatro geometrías y 78 buffers comparables. | Quedan la activación ordinaria, las adversidades A–F y C4. |
| Flee / Recovery | [El inicio ordinario de una incursión diurna](performance/native-daytime-flee-baseline-20261121.json) cambia al trabajador de Farm a Flee. La autoridad falla al avanzar con Farm adquirido o pendiente de recursos. Hay variantes gráficas y un destino Home reutilizables. | Mantener al mismo trabajador durante el relevo hacia el refugio, resolver el tráfico animal en el mismo cohort y comprobar la recuperación. |
| Guardián / magias | [Crecimiento ordinario preparado](performance/native-ordinary-guardian-growth-20261121.json) confirma un único efecto dirigido, acelera solo el cultivo elegido y deja Farm en marcha. El selector de cámara llevó el cultivo y el punto de contacto confirmados al comando. El Worker gráfico observó los dos haces y un comando repetido dejó una sola aplicación. El efecto termina con un único evento y acredita 13,846 s de crecimiento adicional. [Multiplicar llega a la entrega con un solo abono](performance/native-ordinary-guardian-multiply-20261121.json) en NVIDIA y conserva el mismo cuerpo desde Farm. | [Escudo cambia el mundo fuera de la frontera comprometida](webgpu-shield.md#escudo-durante-farm-nativo) con la autoridad en marcha y GPU física. [Despertar dibuja el ritual y el resplandor sobre la fuente elegida](native-ordinary-awakening-boundary-20261121.md). Quedan la adquisición y caducidad preparadas de Escudo, los casos pendientes de Despertar, Attack y C4. |

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
| Consecuencia → siguiente tarea | A6-01/02/03/05/11, e-R3 | Mismo planificador, cuerpo y reservas; regreso/carga según reglas | Siguiente tarea ordinaria comienza sin fixture que la emita directamente; fases y caja conservadas, no ejecutor JS paralelo. Log continuo de ambas tareas. | La [segunda acción y entrega ordinarias](performance/native-post-settlement-second-delivery-20261121.json) completaron Harvest y Carry en los cuatro perfiles sobre el cuerpo de la primera entrega. [Home y retirada](native-post-settlement-home-20261120.md) también están comprobados desde entrega. [La liquidación y retirada con el motor residente](native-terminal-gate-retention-20261121.md) también se comprobaron. Quedan las reservas que cambian un motor, los relojes fuera del paquete de dibujo, el tráfico y la interacción en todas las fronteras. |
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
