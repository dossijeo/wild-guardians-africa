# Aceptación por vertical funcional

Vista de dependencias de [A6](A6-CHECKLIST.md), subordinada a la
[corrección A–F](intent-route-architecture-correction-20261108.md) y al
[plan A/B/C](integrated-gpu-migration-plan-20261104.md). No modifica sus criterios,
no añade porcentajes y no declara cerrada ninguna vertical.

Responsable de implementación: Sol, en los propietarios siguientes. Este apoyo
solo mantiene catálogo, selección, evidencia y documentación. «Disponible»
significa componente reutilizable, nunca aceptación de la partida completa.

## Harvest: cadena mínima que debe demostrarse junta

| Frontera / dependencia | IDs existentes | Propietario de código | Aceptación y evidencia exigida | Situación de referencia |
|---|---|---|---|---|
| Productor ordinario → asignación | A6-01, A6-05, e-R3 | Planificador de tareas / bridge / `spatial-intent-state.cpp` | Comando real crea tarea y dueño una vez; espera de recursos sin handle ejecutable; B avanza. Registro de tarea/objetivo/cuerpo, época, secuencia y recibo. | Reserva y primera admisión disponibles; productor ordinario pendiente. |
| Ruta completa → movimiento → llegada | A6-02/03/04/06/08, e-R1/R2, f-R1/R2/R3/R4 | Ejecutor nativo, reservas, control directo, Surface y roster existentes | Ruta íntegra, fases/carga/presupuesto, colisión con obstáculos y puertas, conflicto anticipado; mismas mallas originales. Cuerpo ejecutado y frame GPU ligados por identidad, sin mover por JS. | Harness de primera tarea y harness de puertas disponibles; integración conjunta pendiente. |
| Llegada → Harvest | A6-01/02/06/08, e-R3, f-R4 | `spatial-task-action-proposal.inc`, admisión común, `game.js`, actor GPU | Reserva estacionaria retenida; clip preparado antes de commit; progreso desde reloj ejecutado, otras tareas continúan. Bloqueo real ≥500 ms, primer dibujo sin fábricas y sin recursos recreados tras readiness. | Conectado en componente GPU; Game probado separadamente. |
| Harvest → consecuencia real | A6-01/04/06/09, e-R3, f-R4 | Propuesta/commit nativos y proyección de `tasks.js`, cultivos/cajas/recursos existentes | Cultivo cosechado, caja/economía y eventos según reglas reales, exactamente una vez y después del progreso ejecutado y preparación; no efecto por ACK/clip. Antes/después y rechazo de recibos obsoletos/cancelación. | Pendiente, guard existente impide efecto anticipado. |
| Consecuencia → siguiente tarea | A6-01/02/03/05/11, e-R3 | Mismo planificador, cuerpo y reservas; regreso/carga según reglas | Siguiente tarea ordinaria comienza sin fixture que la emita directamente; fases y caja conservadas, no ejecutor JS paralelo. Log continuo de ambas tareas. | Pendiente. |
| Guardar/restaurar/cancelar en cada frontera | A6-02/07/09, e-R3/R4, f-R3/R4 | Snapshots, Worker de autoridad, bridge y consumidor existentes | Nueva época/admisión, mismos hechos semánticos; ninguna consecuencia duplicada; cambio de Worker/device loss/canal silencioso no revive permisos. Comparación determinista de comandos/resultados. | Serialización/protecciones disponibles; restauración en trabajo local de Sol. Ver HEAD y evidencia nueva. |
| Partida y costes de la cadena completa | A6-09/10/11, e-R4, gates A–F, C1–C4 | Bootstrap de producto y todos los propietarios anteriores | WebGPU hardware, recursos originales, publicación ordinaria, contadores por propietario, capturas, seed/comandos, build y regresiones. Activación sin flags QA esenciales y retirada de duplicados solo tras validar la clase. | Pendiente. No sumar pruebas aisladas. |

Para abrir cada fila, `lab --scenario harvest` muestra las pruebas existentes;
`gates`, `obstacles`, `concurrent`, `pause`, `invalidation`, `preparation` y
`recovery` preparan las adversidades. Instrucciones en [operaciones](MIGRATION-OPERATIONS.md).
Los TODO de [aceptación pendiente](../../tests/migration-harvest-acceptance.pending.test.js)
deben reemplazarse por aserciones observables en el harness y productor existentes
cuando Sol los conecte. No basta borrarlos ni poner una marca de capacidad.

## Esquema común para las demás intenciones

Todas requieren la cadena productor → ruta → GPU → llegada → acción → efecto →
siguiente intención, identidad/recursos/causalidad y recuperación de Harvest.
A6-05 exige ampliar perfiles y biomas; el dominio Desierto no acredita los demás.

| Vertical | Dependencia adicional / responsable | Prueba completa y evidencia particular | Cierre permitido |
|---|---|---|---|
| AttackCrops (primera aceptación A de la corrección) | Selección/entrada/ataque/retirada en bridge, `raids.js`, bestias GPU | Facóquero real, golpe lógico nativo y daño único; muro B, tráfico C, bloqueo D, pausa/impactos/ragdoll/save/device loss E, contadores F. | Solo su clase tras A–F; nunca A6 entero. Priorizar Harvest como apoyo no sustituye este gate. |
| Water | Mismo ejecutor/admisión; `tasks.js`, accesorios originales Water | Llegada → riego → cambio real de agua → siguiente tarea; accesorio preparado, agua nunca por fin visual del clip. | Tras cadena, adversidades y reglas propias; variantes gráficas aisladas no bastan. |
| Plant / construcción / reparación | Tareas y propuestas de geometría/recursos existentes | Materiales/economía y objeto físico/gráfico preparados; mutación válida una sola vez, revoca rutas dependientes antes de efecto. | Cada clase por separado con geometría/reglas/recuperación acreditadas. |
| Carry / entrega / regreso | Fases y presupuesto nativos; caja/cuerpo/depósito existentes | Harvest real entrega caja → transporte → depósito/economía → nueva tarea; conservar rig y recursos. | El clip Carry y su caja de nueve piezas no cierran entrega. |
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
